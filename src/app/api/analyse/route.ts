import { NextResponse } from "next/server";
import type { BusinessData, HealthMetrics } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type AnalyseRequest = {
  data: BusinessData;
  metrics: HealthMetrics;
};

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

function isValidPayload(value: unknown): value is AnalyseRequest {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AnalyseRequest>;
  return Boolean(payload.data && payload.metrics && typeof payload.data.businessName === "string");
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI analysis is not configured." }, { status: 503 });
    }

    const payload: unknown = await request.json();
    if (!isValidPayload(payload)) {
      return NextResponse.json({ error: "Invalid business analysis request." }, { status: 400 });
    }

    const { data, metrics } = payload;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5",
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
      signal: AbortSignal.timeout(25000),
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

    return NextResponse.json({ analysis: JSON.parse(result.output_text) });
  } catch (error) {
    console.error("Business analysis route error", error);
    return NextResponse.json({ error: "Unable to complete AI analysis right now." }, { status: 500 });
  }
}
