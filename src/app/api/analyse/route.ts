import { NextResponse } from "next/server";
import { calculateHealth } from "@/lib/calculations";
import type { BusinessData } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 32_000;
const MAX_TEXT = 1_500;
const MAX_NAME = 120;
const MAX_FINANCIAL_VALUE = 1_000_000_000;
const allowedTrends = new Set(["growing", "stable", "declining", "volatile"]);
const allowedConcerns = new Set(["payroll", "tax", "legal", "debts", "closure", "none"]);

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["diagnosis", "rootCauses", "priorities", "questions", "professionalHelp"],
  properties: {
    diagnosis: { type: "string" },
    rootCauses: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    priorities: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "why", "timeframe", "expectedImpact", "caution"],
        properties: {
          title: { type: "string" },
          why: { type: "string" },
          timeframe: { type: "string", enum: ["Today", "7 days", "30 days", "90 days"] },
          expectedImpact: { type: "string" },
          caution: { type: "string" },
        },
      },
    },
    questions: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: { type: "string" },
    },
    professionalHelp: {
      type: "object",
      additionalProperties: false,
      required: ["recommended", "reason", "professionalType"],
      properties: {
        recommended: { type: "boolean" },
        reason: { type: "string" },
        professionalType: { type: "string" },
      },
    },
  },
} as const;

function validText(value: unknown, max = MAX_TEXT): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_FINANCIAL_VALUE;
}

function parseBusinessData(value: unknown): BusinessData | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const numberKeys = [
    "yearsOperating",
    "employees",
    "monthlyRevenue",
    "fixedExpenses",
    "variableExpenses",
    "ownerDrawings",
    "loanRepayments",
    "cashAvailable",
    "accountsReceivable",
    "overdueInvoices",
    "totalDebt",
    "overdueTax",
    "overdueSuppliers",
  ] as const;

  if (!validText(data.businessName, MAX_NAME) || !validText(data.industry, MAX_NAME) || !validText(data.country, MAX_NAME)) return null;
  if (!validText(data.biggestProblem) || !validText(data.immediateGoal)) return null;
  if (!numberKeys.every((key) => validNumber(data[key]))) return null;
  if (!Number.isInteger(data.yearsOperating) || !Number.isInteger(data.employees)) return null;
  if (!allowedTrends.has(String(data.revenueTrend))) return null;
  if (!Array.isArray(data.urgentConcerns) || data.urgentConcerns.length > allowedConcerns.size) return null;
  if (!data.urgentConcerns.every((item) => typeof item === "string" && allowedConcerns.has(item))) return null;

  return data as BusinessData;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI analysis is not configured." }, { status: 503 });
    }

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Business analysis request is too large." }, { status: 413 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Business analysis request is too large." }, { status: 413 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    }

    const data = parseBusinessData((payload as { data?: unknown })?.data);
    if (!data) {
      return NextResponse.json({ error: "Invalid business analysis request." }, { status: 400 });
    }

    const metrics = calculateHealth(data);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6",
        store: false,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are Business Lifeline, a careful small-business turnaround decision-support assistant. Analyse only the supplied facts and deterministic metrics. Never invent figures, laws, tax rules, guarantees, or insolvency conclusions. Use plain language. Prioritise immediate cash preservation, lawful communication, revenue quality, cost control, and professional escalation where appropriate. This is decision support, not accounting, legal, financial, or insolvency advice.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({ business: data, calculatedMetrics: metrics }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "business_lifeline_analysis",
            strict: true,
            schema: outputSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("OpenAI analysis failed", response.status, detail.slice(0, 500));
      return NextResponse.json({ error: "AI analysis is temporarily unavailable." }, { status: 502 });
    }

    const result = (await response.json()) as { output_text?: string };
    if (!result.output_text) {
      return NextResponse.json({ error: "AI analysis returned no usable result." }, { status: 502 });
    }

    return NextResponse.json({ analysis: JSON.parse(result.output_text), metrics });
  } catch (error) {
    console.error("Business analysis route error", error);
    return NextResponse.json({ error: "Unable to complete AI analysis right now." }, { status: 500 });
  }
}
