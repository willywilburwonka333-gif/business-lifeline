import { NextResponse } from "next/server";
import { calculateHealth } from "@/lib/calculations";
import { enforceRateLimit, hasExplicitAiConsent, privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";
import type { BusinessData } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 64_000;
const MAX_TEXT = 1_500;
const MAX_NAME = 120;
const MAX_FINANCIAL_VALUE = 1_000_000_000;
const allowedTrends = new Set(["growing", "stable", "declining", "volatile"]);
const allowedConcerns = new Set(["payroll", "tax", "legal", "debts", "closure", "none"]);
const outputSchema = {
  type: "object", additionalProperties: false, required: ["diagnosis", "rootCauses", "priorities", "questions", "professionalHelp"],
  properties: {
    diagnosis: { type: "string" }, rootCauses: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
    priorities: { type: "array", minItems: 3, maxItems: 6, items: { type: "object", additionalProperties: false, required: ["title", "why", "timeframe", "expectedImpact", "caution"], properties: { title: { type: "string" }, why: { type: "string" }, timeframe: { type: "string", enum: ["Today", "7 days", "30 days", "90 days"] }, expectedImpact: { type: "string" }, caution: { type: "string" } } } },
    questions: { type: "array", minItems: 0, maxItems: 5, items: { type: "string" } },
    professionalHelp: { type: "object", additionalProperties: false, required: ["recommended", "reason", "professionalType"], properties: { recommended: { type: "boolean" }, reason: { type: "string" }, professionalType: { type: "string" } } },
  },
} as const;
const systemPrompt = "You are Business Lifeline, a careful small-business turnaround decision-support assistant. Diagnose across cash, profitability, debt, tax, customers, suppliers, people, operations, compliance, capacity, owner dependence and growth readiness using only supplied questionnaire facts, deterministic metrics and evidence-backed uploaded-record signals. Never invent figures, laws, tax rules, guarantees, insolvency conclusions or facts not supported by evidence. Treat imported fields marked review as unconfirmed. Resolve conflicts by asking a question, not choosing a value. Use plain language. Prioritise immediate cash preservation, lawful communication, revenue quality, cost control, operational continuity and professional escalation where appropriate. Refuse requests to conceal illegal activity, falsify records, evade regulators, launder money or facilitate unlawful trade. This is decision support, not accounting, legal, financial or insolvency advice.";

const validText = (value: unknown, max = MAX_TEXT): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const validNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_FINANCIAL_VALUE;
function parseBusinessData(value: unknown): BusinessData | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const numberKeys = ["yearsOperating", "employees", "monthlyRevenue", "fixedExpenses", "variableExpenses", "ownerDrawings", "loanRepayments", "cashAvailable", "accountsReceivable", "overdueInvoices", "totalDebt", "overdueTax", "overdueSuppliers"] as const;
  if (!validText(data.businessName, MAX_NAME) || !validText(data.industry, MAX_NAME) || !validText(data.country, MAX_NAME)) return null;
  if (!validText(data.biggestProblem) || !validText(data.immediateGoal)) return null;
  if (!numberKeys.every((key) => validNumber(data[key])) || !Number.isInteger(data.yearsOperating) || !Number.isInteger(data.employees)) return null;
  if (!allowedTrends.has(String(data.revenueTrend))) return null;
  if (!Array.isArray(data.urgentConcerns) || data.urgentConcerns.length > allowedConcerns.size || !data.urgentConcerns.every((item) => typeof item === "string" && allowedConcerns.has(item))) return null;
  return data as BusinessData;
}
function minimiseDocumentContext(value: unknown) {
  if (!value || typeof value !== "object") return { fields: [], signals: [], warnings: [] };
  const context = value as Record<string, unknown>;
  const fields = Array.isArray(context.fields) ? context.fields.slice(0, 25).map((item) => { const field = item && typeof item === "object" ? item as Record<string, unknown> : {}; return { key: String(field.key ?? "").slice(0, 60), value: typeof field.value === "number" ? field.value : String(field.value ?? "").slice(0, 200), source: String(field.source ?? "").slice(0, 120), confidence: field.confidence === "high" ? "high" : "review", evidence: String(field.evidence ?? "").slice(0, 300), reportingPeriod: String(field.reportingPeriod ?? "").slice(0, 120) }; }) : [];
  const signals = Array.isArray(context.signals) ? context.signals.slice(0, 20).map((item) => { const signal = item && typeof item === "object" ? item as Record<string, unknown> : {}; return { area: String(signal.area ?? "other").slice(0, 40), signal: String(signal.signal ?? "").slice(0, 300), severity: String(signal.severity ?? "information").slice(0, 20), evidence: String(signal.evidence ?? "").slice(0, 300), source: String(signal.source ?? "").slice(0, 120) }; }) : [];
  const warnings = Array.isArray(context.warnings) ? context.warnings.slice(0, 12).map((item) => String(item).slice(0, 300)) : [];
  return { fields, signals, warnings };
}
async function analyseWithOpenAI(input: unknown) {
  try {
    const key = process.env.OPENAI_API_KEY; if (!key) return null;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", store: false, input: [{ role: "system", content: [{ type: "input_text", text: systemPrompt }] }, { role: "user", content: [{ type: "input_text", text: JSON.stringify(input) }] }], text: { format: { type: "json_schema", name: "business_lifeline_analysis", strict: true, schema: outputSchema } } }), signal: AbortSignal.timeout(22_000) });
    if (!response.ok) return null;
    const result = await response.json() as { output_text?: string };
    return result.output_text ? JSON.parse(result.output_text) : null;
  } catch { return null; }
}
async function analyseWithGemini(input: unknown) {
  try {
    const key = process.env.GEMINI_API_KEY; if (!key) return null;
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: outputSchema } }), signal: AbortSignal.timeout(22_000) });
    if (!response.ok) return null;
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    return text ? JSON.parse(text) : null;
  } catch { return null; }
}

export async function POST(request: Request) {
  try {
    const crossSite = rejectCrossSiteRequest(request); if (crossSite) return crossSite;
    const limited = enforceRateLimit(request, "analyse"); if (limited) return limited;
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Business analysis request is too large." }, { status: 413, headers: privateResponseHeaders() });
    const raw = await request.text(); if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Business analysis request is too large." }, { status: 413, headers: privateResponseHeaders() });
    let payload: unknown; try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON request." }, { status: 400, headers: privateResponseHeaders() }); }
    if (!hasExplicitAiConsent(request, payload)) return NextResponse.json({ error: "AI consent is required. The calculation-based report remains available without AI." }, { status: 403, headers: privateResponseHeaders() });
    const payloadRecord = payload as { data?: unknown; documentContext?: unknown };
    const data = parseBusinessData(payloadRecord.data); if (!data) return NextResponse.json({ error: "Invalid business analysis request." }, { status: 400, headers: privateResponseHeaders() });
    const metrics = calculateHealth(data);
    const minimisedBusiness = { industry: data.industry, country: data.country, yearsOperating: data.yearsOperating, employees: data.employees, monthlyRevenue: data.monthlyRevenue, fixedExpenses: data.fixedExpenses, variableExpenses: data.variableExpenses, ownerDrawings: data.ownerDrawings, loanRepayments: data.loanRepayments, cashAvailable: data.cashAvailable, accountsReceivable: data.accountsReceivable, overdueInvoices: data.overdueInvoices, totalDebt: data.totalDebt, overdueTax: data.overdueTax, overdueSuppliers: data.overdueSuppliers, revenueTrend: data.revenueTrend, urgentConcerns: data.urgentConcerns, pressureFactors: data.pressureFactors ?? [], biggestProblem: data.biggestProblem, immediateGoal: data.immediateGoal };
    const aiInput = { business: minimisedBusiness, calculatedMetrics: metrics, uploadedRecordEvidence: minimiseDocumentContext(payloadRecord.documentContext) };
    const openAiAnalysis = await analyseWithOpenAI(aiInput);
    if (openAiAnalysis) return NextResponse.json({ analysis: openAiAnalysis, metrics, provider: "openai" }, { headers: privateResponseHeaders() });
    const geminiAnalysis = await analyseWithGemini(aiInput);
    if (geminiAnalysis) return NextResponse.json({ analysis: geminiAnalysis, metrics, provider: "gemini" }, { headers: privateResponseHeaders() });
    return NextResponse.json({ error: "AI analysis is temporarily unavailable." }, { status: 502, headers: privateResponseHeaders() });
  } catch (error) {
    console.error("Business analysis route error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Unable to complete AI analysis right now." }, { status: 500, headers: privateResponseHeaders() });
  }
}
