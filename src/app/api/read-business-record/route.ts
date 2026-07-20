import { NextResponse } from "next/server";
import { enforceRateLimit, privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedExtensions = new Set(["pdf", "csv", "txt", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp"]);

const fieldKeys = [
  "businessName", "industry", "country", "yearsOperating", "employees", "monthlyRevenue",
  "fixedExpenses", "variableExpenses", "ownerDrawings", "loanRepayments", "cashAvailable",
  "accountsReceivable", "overdueInvoices", "totalDebt", "overdueTax", "overdueSuppliers",
] as const;

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fields", "reportingPeriod", "documentType", "diagnosticSignals", "warnings"],
  properties: {
    fields: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value", "confidence", "evidence"],
        properties: {
          key: { type: "string", enum: fieldKeys },
          value: { anyOf: [{ type: "number" }, { type: "string" }] },
          confidence: { type: "string", enum: ["high", "review"] },
          evidence: { type: "string" },
        },
      },
    },
    reportingPeriod: { type: "string" },
    documentType: { type: "string" },
    diagnosticSignals: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area", "signal", "severity", "evidence"],
        properties: {
          area: { type: "string", enum: ["cash", "profitability", "debt", "tax", "customers", "suppliers", "people", "operations", "compliance", "growth", "other"] },
          signal: { type: "string" },
          severity: { type: "string", enum: ["information", "watch", "urgent"] },
          evidence: { type: "string" },
        },
      },
    },
    warnings: { type: "array", maxItems: 8, items: { type: "string" } },
  },
} as const;

function extensionOf(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

export async function POST(request: Request) {
  try {
    const crossSite = rejectCrossSiteRequest(request);
    if (crossSite) return crossSite;
    const limited = enforceRateLimit(request, "record-reader");
    if (limited) return limited;

    if (request.headers.get("x-business-lifeline-ai-consent") !== "true") {
      return NextResponse.json({ error: "AI document-reading consent is required." }, { status: 403, headers: privateResponseHeaders() });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI document reading is not configured." }, { status: 503, headers: privateResponseHeaders() });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file was provided." }, { status: 400, headers: privateResponseHeaders() });
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File must be between 1 byte and 10 MB." }, { status: 413, headers: privateResponseHeaders() });

    const extension = extensionOf(file.name);
    if (!allowedExtensions.has(extension)) return NextResponse.json({ error: "This file type is not supported yet." }, { status: 415, headers: privateResponseHeaders() });

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const isImage = ["png", "jpg", "jpeg", "webp"].includes(extension);
    const mime = file.type || (isImage ? `image/${extension === "jpg" ? "jpeg" : extension}` : "application/octet-stream");

    const fileInput = isImage
      ? { type: "input_image", image_url: `data:${mime};base64,${base64}`, detail: "high" }
      : { type: "input_file", filename: file.name, file_data: base64 };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_DOCUMENT_MODEL || process.env.OPENAI_MODEL || "gpt-5.6",
        store: false,
        input: [{
          role: "system",
          content: [{ type: "input_text", text: "You extract business facts from uploaded records for a small-business health assessment. Read tables, handwriting, screenshots and document text carefully. Return only facts visible in the file. Never infer missing numbers, annualise or monthly-adjust figures unless the document explicitly states the period. Preserve the sign and currency meaning. For every extracted field include short evidence. Flag conflicts, unclear periods, duplicated totals and low-quality scans. Also surface operational, people, customer, supplier, compliance and growth signals that are explicitly supported by the record. Do not provide legal, tax, insolvency or financial conclusions." }],
        }, {
          role: "user",
          content: [
            { type: "input_text", text: `Read ${file.name}. Extract only MRI-relevant facts and supported business-health signals. Empty arrays are valid when the file contains no relevant data.` },
            fileInput,
          ],
        }],
        text: { format: { type: "json_schema", name: "business_record_extraction", strict: true, schema: outputSchema } },
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!response.ok) {
      console.error("Document reader failed", response.status);
      return NextResponse.json({ error: "The document could not be read right now." }, { status: 502, headers: privateResponseHeaders() });
    }

    const result = await response.json() as { output_text?: string };
    if (!result.output_text) return NextResponse.json({ error: "No usable information was found." }, { status: 422, headers: privateResponseHeaders() });
    return NextResponse.json({ extraction: JSON.parse(result.output_text), source: file.name }, { headers: privateResponseHeaders() });
  } catch (error) {
    console.error("Business record reader error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Unable to read this business record right now." }, { status: 500, headers: privateResponseHeaders() });
  }
}
