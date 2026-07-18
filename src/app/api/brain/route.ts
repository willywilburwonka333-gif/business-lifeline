import { NextResponse } from "next/server";
import type { BusinessData, BusinessReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 48_000;
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

function validContext(value: unknown): value is { data: BusinessData; report: BusinessReport; recovery?: unknown; coach?: unknown } {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.report)) return false;
  const data = value.data;
  const report = value.report;
  return (
    typeof data.businessName === "string" &&
    typeof data.industry === "string" &&
    typeof data.country === "string" &&
    typeof data.monthlyRevenue === "number" &&
    typeof data.cashAvailable === "number" &&
    isRecord(report.metrics) &&
    typeof report.metrics.overallScore === "number" &&
    Array.isArray(report.warnings) &&
    Array.isArray(report.risks) &&
    Array.isArray(report.today)
  );
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Business Brain is not configured." }, { status: 503 });

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Business Brain request is too large." }, { status: 413 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Business Brain request is too large." }, { status: 413 });

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    if (!isRecord(payload) || !validQuestion(payload.question) || !validContext(payload.context)) {
      return NextResponse.json({ error: "Invalid Business Brain request." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5",
        store: false,
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: "You are Business Brain, a careful small-business recovery decision-support adviser. Answer the owner's question using only the supplied business MRI, deterministic metrics, action plan, recovery history and coach progress. Explicitly connect recommendations to supplied figures or recorded facts. Never invent laws, tax rules, market data, guarantees, or missing financial facts. Do not diagnose insolvency. Be direct, practical and compassionate. Distinguish an immediate action from a decision that requires an accountant, lawyer, registered tax agent, financial adviser or insolvency practitioner. This is general decision support, not legal, accounting, tax, financial or insolvency advice.",
            }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: JSON.stringify({ question: payload.question.trim(), context: payload.context }) }],
          },
        ],
        text: {
          format: { type: "json_schema", name: "business_brain_answer", strict: true, schema: outputSchema },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Business Brain failed", response.status, detail.slice(0, 500));
      return NextResponse.json({ error: "Business Brain is temporarily unavailable." }, { status: 502 });
    }

    const result = (await response.json()) as { output_text?: string };
    if (!result.output_text) return NextResponse.json({ error: "Business Brain returned no usable answer." }, { status: 502 });

    return NextResponse.json({ answer: JSON.parse(result.output_text) });
  } catch (error) {
    console.error("Business Brain route error", error);
    return NextResponse.json({ error: "Unable to answer right now." }, { status: 500 });
  }
}
