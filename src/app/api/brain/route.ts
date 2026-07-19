import { NextResponse } from "next/server";
import { enforceRateLimit, hasExplicitAiConsent, privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 32_000;
const MAX_QUESTION = 1_000;

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "reasoningSummary", "nextSteps", "watchOutFor", "professionalHelp"],
  properties: {
    answer: { type: "string" },
    reasoningSummary: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
    nextSteps: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
    watchOutFor: { type: "array", minItems: 0, maxItems: 4, items: { type: "string" } },
    professionalHelp: {
      type: "object",
      additionalProperties: false,
      required: ["recommended", "type", "reason"],
      properties: {
        recommended: { type: "boolean" },
        type: { type: "string" },
        reason: { type: "string" },
      },
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validQuestion(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 3 && value.length <= MAX_QUESTION;
}

function validContext(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.metrics)) return false;
  return (
    typeof value.industry === "string" && value.industry.length <= 120 &&
    typeof value.country === "string" && value.country.length <= 120 &&
    typeof value.monthlyRevenue === "number" && Number.isFinite(value.monthlyRevenue) &&
    typeof value.monthlyOperatingResult === "number" && Number.isFinite(value.monthlyOperatingResult) &&
    typeof value.cashAvailable === "number" && Number.isFinite(value.cashAvailable) &&
    typeof value.totalDebt === "number" && Number.isFinite(value.totalDebt) &&
    typeof value.overdueTax === "number" && Number.isFinite(value.overdueTax) &&
    typeof value.overdueSuppliers === "number" && Number.isFinite(value.overdueSuppliers) &&
    typeof value.metrics.overallScore === "number" && Number.isFinite(value.metrics.overallScore) &&
    Array.isArray(value.warnings) && value.warnings.length <= 8 &&
    Array.isArray(value.risks) && value.risks.length <= 8 &&
    Array.isArray(value.today) && value.today.length <= 8
  );
}

export async function POST(request: Request) {
  try {
    const crossSite = rejectCrossSiteRequest(request);
    if (crossSite) return crossSite;
    const limited = enforceRateLimit(request, "brain");
    if (limited) return limited;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Business Brain is not configured." }, { status: 503, headers: privateResponseHeaders() });

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Business Brain request is too large." }, { status: 413, headers: privateResponseHeaders() });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Business Brain request is too large." }, { status: 413, headers: privateResponseHeaders() });

    let payload: unknown;
    try { payload = JSON.parse(raw); } catch {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400, headers: privateResponseHeaders() });
    }

    if (!hasExplicitAiConsent(request, payload)) {
      return NextResponse.json({ error: "AI consent is required." }, { status: 403, headers: privateResponseHeaders() });
    }

    if (!isRecord(payload) || !validQuestion(payload.question) || !validContext(payload.context)) {
      return NextResponse.json({ error: "Invalid Business Brain request." }, { status: 400, headers: privateResponseHeaders() });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6",
        store: false,
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: "You are Business Brain, a careful small-business recovery decision-support adviser. Answer using only the supplied minimised business context and deterministic metrics. Explicitly connect recommendations to supplied figures or recorded facts. Never invent laws, tax rules, market data, guarantees, or missing financial facts. Do not diagnose insolvency. Refuse requests to conceal illegal activity, falsify records, evade regulators, launder money, or facilitate unlawful trade. Distinguish immediate actions from decisions requiring an accountant, lawyer, registered tax agent, financial adviser or insolvency practitioner. This is general decision support, not legal, accounting, tax, financial or insolvency advice.",
            }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify({ question: payload.question.trim(), context: payload.context }) }],
          },
        ],
        text: { format: { type: "json_schema", name: "business_brain_answer", strict: true, schema: outputSchema } },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      console.error("Business Brain failed", response.status);
      return NextResponse.json({ error: "Business Brain is temporarily unavailable." }, { status: 502, headers: privateResponseHeaders() });
    }

    const result = (await response.json()) as { output_text?: string };
    if (!result.output_text) return NextResponse.json({ error: "Business Brain returned no usable answer." }, { status: 502, headers: privateResponseHeaders() });
    return NextResponse.json({ answer: JSON.parse(result.output_text) }, { headers: privateResponseHeaders() });
  } catch (error) {
    console.error("Business Brain route error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Unable to answer right now." }, { status: 500, headers: privateResponseHeaders() });
  }
}
