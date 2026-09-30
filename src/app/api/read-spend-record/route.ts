import { NextResponse } from "next/server";
import { enforceRateLimit, privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedExtensions = new Set(["pdf","png","jpg","jpeg","webp","txt","csv"]);

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["documentType","supplier","invoiceNumber","date","dueDate","total","gst","description","suggestedAccount","confidence","evidence","warnings"],
  properties: {
    documentType: { type: "string", enum: ["supplier-invoice","receipt","credit","other"] },
    supplier: { type: "string" },
    invoiceNumber: { type: "string" },
    date: { type: "string" },
    dueDate: { type: "string" },
    total: { type: "number" },
    gst: { type: "number" },
    description: { type: "string" },
    suggestedAccount: { type: "string" },
    confidence: { type: "string", enum: ["high","review"] },
    evidence: { type: "string" },
    warnings: { type: "array", maxItems: 6, items: { type: "string" } },
  },
} as const;

const prompt = `You read a supplier invoice, receipt or supplier credit for Business Lifeline.
Extract only values visible in the document. Never invent tax, supplier, dates or amounts.
Return total and GST exactly as shown. If GST is not explicitly shown, use 0 and add a warning.
Dates should be YYYY-MM-DD only when the document clearly supplies the date; otherwise use an empty string.
suggestedAccount is a conservative bookkeeping category chosen from: Inventory, Operating Expense, Rent, Utilities, Advertising & Marketing, Insurance, Motor Vehicle, Repairs & Maintenance, Professional Fees, Bank & Merchant Fees, Plant & Equipment.
The suggested account is only a draft for human confirmation.
Do not give tax advice.`;

const extensionOf = (name: string) => name.toLowerCase().split(".").pop() ?? "";

async function openAi(file: File, base64: string, mime: string, extension: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const image = ["png","jpg","jpeg","webp"].includes(extension);
    const fileInput = image
      ? { type: "input_image", image_url: `data:${mime};base64,${base64}`, detail: "high" }
      : { type: "input_file", filename: file.name, file_data: base64 };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_DOCUMENT_MODEL || process.env.OPENAI_MODEL || "gpt-5.6",
        store: false,
        input: [
          { role: "system", content: [{ type: "input_text", text: prompt }] },
          { role: "user", content: [{ type: "input_text", text: "Read this spend document. Empty strings and zero are valid when facts are absent." }, fileInput] },
        ],
        text: { format: { type: "json_schema", name: "lifeline_spend_capture", strict: true, schema } },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { output_text?: string };
    return payload.output_text ? JSON.parse(payload.output_text) : null;
  } catch { return null; }
}

async function gemini(file: File, base64: string, mime: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const model = process.env.GEMINI_DOCUMENT_MODEL || process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: base64 } }] }],
        generationConfig: { responseFormat: { text: { mimeType: "application/json", schema } } },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    return text ? JSON.parse(text) : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;
  const limited = enforceRateLimit(request, "spend-capture");
  if (limited) return limited;
  if (request.headers.get("x-business-lifeline-ai-consent") !== "true") {
    return NextResponse.json({ error: "AI document-reading consent is required." }, { status: 403, headers: privateResponseHeaders() });
  }
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI document reading is not configured." }, { status: 503, headers: privateResponseHeaders() });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file was provided." }, { status: 400, headers: privateResponseHeaders() });
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File must be between 1 byte and 10 MB." }, { status: 413, headers: privateResponseHeaders() });
    const extension = extensionOf(file.name);
    if (!allowedExtensions.has(extension)) return NextResponse.json({ error: "Use PDF, image, TXT or CSV." }, { status: 415, headers: privateResponseHeaders() });
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mime = file.type || ({ pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",txt:"text/plain",csv:"text/csv" } as Record<string,string>)[extension] || "application/octet-stream";

    const extracted = await openAi(file, base64, mime, extension) || await gemini(file, base64, mime);
    if (!extracted) return NextResponse.json({ error: "The spend document could not be read right now." }, { status: 502, headers: privateResponseHeaders() });
    return NextResponse.json({ extraction: extracted, source: file.name }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Spend capture failed." }, { status: 500, headers: privateResponseHeaders() });
  }
}
