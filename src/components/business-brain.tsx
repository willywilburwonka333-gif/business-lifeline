"use client";

import { FormEvent, useMemo, useState } from "react";
import { AnalysisProvenance } from "@/components/analysis-provenance";
import type { SavedReport } from "@/lib/saved-report";
import { coachProgress, readCoachCheckIn } from "@/lib/recovery-coach";

type BrainAnswer = {
  answer: string;
  reasoningSummary: string[];
  nextSteps: string[];
  watchOutFor: string[];
  professionalHelp: { recommended: boolean; type: string; reason: string };
};

type ConversationSource = "openai" | "gemini" | "rules";
type ConversationItem = { question: string; answer: BrainAnswer; source: ConversationSource };

const suggestions = [
  "What should I do first this week?",
  "Can I afford to hire another employee?",
  "Should I increase my prices?",
  "How can I improve cash flow fastest?",
  "Which cost should I investigate first?",
  "Is it time to get professional help?",
];

function localFallback(saved: SavedReport, question: string): BrainAnswer {
  const { data, report } = saved;
  const monthly = report.metrics.monthlyOperatingResult;
  const urgent = report.today[0];
  return {
    answer: monthly < 0
      ? `Your MRI shows the business is losing ${Math.abs(monthly).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })} per month. Before making a major decision about “${question}”, protect cash and complete the highest-priority recovery action first.`
      : `Your MRI shows a positive monthly operating result, but the decision about “${question}” should still be tested against cash runway, debt pressure and the effect on monthly profit.`,
    reasoningSummary: [
      `Current health score: ${report.metrics.overallScore}/100.`,
      `Cash available: ${data.cashAvailable.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })}.`,
      `Monthly operating result: ${monthly.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })}.`,
    ],
    nextSteps: urgent ? [urgent.title, "Use the Cashflow Simulator to test the financial effect before committing."] : ["Review the MRI priorities and test the decision in the Cashflow Simulator."],
    watchOutFor: report.warnings.slice(0, 3),
    professionalHelp: {
      recommended: report.urgentHelp,
      type: "qualified accountant or appropriate business adviser",
      reason: report.urgentHelp ? "The MRI contains urgent warning signs that should not rely on automated guidance alone." : "Not automatically required from the supplied figures, but obtain professional advice before a high-impact legal, tax, staffing or debt decision.",
    },
  };
}

function sourceLabel(source: ConversationSource) {
  if (source === "openai") return "AI interpretation · GPT-5.6";
  if (source === "gemini") return "AI interpretation · Gemini fallback";
  return "Calculation-based fallback";
}

function exportLocalData() {
  const records: Record<string, unknown> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("business-lifeline-")) continue;
    const raw = window.localStorage.getItem(key);
    try { records[key] = raw ? JSON.parse(raw) : null; } catch { records[key] = raw; }
  }
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), records }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `business-lifeline-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function deleteLocalData() {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("business-lifeline-")) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
  window.location.reload();
}

export function BusinessBrain({ saved }: { saved: SavedReport }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [aiConsent, setAiConsent] = useState(false);

  const contextSummary = useMemo(() => {
    const coach = readCoachCheckIn();
    return {
      health: saved.report.metrics.overallScore,
      industry: saved.data.industry,
      monthlyResult: saved.report.metrics.monthlyOperatingResult,
      coach: coachProgress(coach, saved.report),
    };
  }, [saved]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const cleaned = question.trim();
    if (cleaned.length < 3 || loading) return;
    if (!aiConsent) {
      setError("Tick the privacy consent above before sending this question to OpenAI or Gemini.");
      document.querySelector<HTMLElement>("#privacy-controls-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    setError("");
    const coach = readCoachCheckIn();
    const context = {
      industry: saved.data.industry,
      country: saved.data.country,
      monthlyRevenue: saved.data.monthlyRevenue,
      monthlyOperatingResult: saved.report.metrics.monthlyOperatingResult,
      cashAvailable: saved.data.cashAvailable,
      totalDebt: saved.data.totalDebt,
      overdueTax: saved.data.overdueTax,
      overdueSuppliers: saved.data.overdueSuppliers,
      revenueTrend: saved.data.revenueTrend,
      urgentConcerns: saved.data.urgentConcerns,
      pressureFactors: saved.data.pressureFactors ?? [],
      metrics: {
        overallScore: saved.report.metrics.overallScore,
        runwayMonths: saved.report.metrics.runwayMonths,
        operatingMargin: saved.report.metrics.operatingMargin,
        expenseRatio: saved.report.metrics.expenseRatio,
        debtPressure: saved.report.metrics.debtPressure,
      },
      warnings: saved.report.warnings.slice(0, 5),
      risks: saved.report.risks.slice(0, 5),
      today: saved.report.today.slice(0, 5).map(({ title, urgency, impact, difficulty, reason }) => ({ title, urgency, impact, difficulty, reason })),
      coachProgress: coachProgress(coach, saved.report),
    };

    try {
      const response = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Business-Lifeline-AI-Consent": "true" },
        body: JSON.stringify({ question: cleaned, context, consent: true }),
      });
      if (!response.ok) throw new Error("Business Brain is temporarily unavailable.");
      const payload = (await response.json()) as { answer?: BrainAnswer; provider?: "openai" | "gemini" };
      if (!payload.answer || !payload.provider) throw new Error("Business Brain returned no usable answer.");
      const nextItem: ConversationItem = { question: cleaned, answer: payload.answer, source: payload.provider };
      setConversation((current) => [...current, nextItem].slice(-6));
      setQuestion("");
    } catch (caught) {
      const fallback = localFallback(saved, cleaned);
      const nextItem: ConversationItem = { question: cleaned, answer: fallback, source: "rules" };
      setConversation((current) => [...current, nextItem].slice(-6));
      setQuestion("");
      setError(caught instanceof Error ? `${caught.message} Showing a calculation-based answer instead.` : "Showing a calculation-based answer instead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="business-brain" aria-labelledby="business-brain-title">
      <div className="section-heading">
        <div><p className="eyebrow">Stage 3 · Contextual adviser</p><h3 id="business-brain-title">Business Brain</h3></div>
        <span className="brain-context-badge">Grounded in this MRI</span>
      </div>
      <p className="template-note">Ask a real decision question. Business Brain uses a minimised set of MRI figures and risks. Your business name, recovery notes and full history are not sent.</p>

      <section className="panel" aria-labelledby="privacy-controls-title">
        <p className="eyebrow">Privacy and control</p>
        <h4 id="privacy-controls-title">You decide when information leaves this device</h4>
        <p>Your saved records remain in this browser. When you use Business Brain, the displayed minimised business context and your question are securely sent through Business Lifeline to OpenAI, or to Gemini when OpenAI is unavailable. The response clearly identifies which provider was used.</p>
        <label className="field">
          <span><input type="checkbox" checked={aiConsent} onChange={(event) => { setAiConsent(event.target.checked); setError(""); }} /> I understand and consent to this AI transmission for the question I submit.</span>
        </label>
        <div className="form-actions no-print">
          <button type="button" className="button ghost" onClick={exportLocalData}>Export my local data</button>
          <button type="button" className="button ghost" onClick={() => { if (window.confirm("Delete all Business Lifeline data stored in this browser? This cannot be undone.")) deleteLocalData(); }}>Delete all local data</button>
        </div>
        <small>Do not enter passwords, banking credentials, identity documents, tax file numbers, customer or employee personal information, or confidential contracts.</small>
      </section>

      <AnalysisProvenance report={saved.report} compact />

      <div className="brain-context-grid" aria-label="Business Brain context">
        <article><span>Health</span><strong>{contextSummary.health}/100</strong></article>
        <article><span>Industry</span><strong>{contextSummary.industry || "Not supplied"}</strong></article>
        <article><span>Monthly result</span><strong>{contextSummary.monthlyResult.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })}</strong></article>
        <article><span>Coach progress</span><strong>{contextSummary.coach}%</strong></article>
      </div>

      <div className="brain-suggestions no-print">
        {suggestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>)}
      </div>

      <form className="brain-form no-print" onSubmit={ask}>
        <label htmlFor="brain-question">Ask about a real business decision</label>
        <textarea id="brain-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} rows={4} placeholder="Example: Can I afford to hire another employee right now?" />
        <button className="button primary" type="submit" disabled={loading || question.trim().length < 3}>{loading ? "Trying OpenAI, then Gemini…" : "Ask Business Brain"}</button>
      </form>

      {!aiConsent && question.trim().length >= 3 && <p className="brain-error" role="status">The button is ready. Tick the privacy consent above before the question can be transmitted.</p>}
      {error && <p className="brain-error" role="status">{error}</p>}

      <div className="brain-conversation" aria-live="polite">
        {conversation.length === 0 && <div className="brain-empty"><strong>No question asked yet.</strong><p>Start with one decision that is keeping you awake. Business Brain will separate what the figures support, what requires judgement and what should be verified professionally.</p></div>}
        {conversation.map((item, index) => (
          <article className="brain-answer" key={`${item.question}-${index}`}>
            <p className="brain-question"><span>You asked</span>{item.question}</p>
            <div className="brain-main-answer"><span>{sourceLabel(item.source)}</span><p>{item.answer.answer}</p></div>
            <div className="brain-answer-grid">
              <section><h4>Facts used</h4><ul>{item.answer.reasoningSummary.map((line) => <li key={line}>{line}</li>)}</ul></section>
              <section><h4>Recommended next steps</h4><ol>{item.answer.nextSteps.map((line) => <li key={line}>{line}</li>)}</ol></section>
              {item.answer.watchOutFor.length > 0 && <section><h4>Risks and unknowns</h4><ul>{item.answer.watchOutFor.map((line) => <li key={line}>{line}</li>)}</ul></section>}
            </div>
            <aside className={item.answer.professionalHelp.recommended ? "brain-escalation warning" : "brain-escalation"}>
              <strong>{item.answer.professionalHelp.recommended ? "Professional help recommended" : "Professional judgement point"}</strong>
              <p>{item.answer.professionalHelp.type}: {item.answer.professionalHelp.reason}</p>
            </aside>
          </article>
        ))}
      </div>
      <p className="brain-disclaimer">General decision support only. It is not legal, accounting, tax, financial or insolvency advice. Verify major decisions with an appropriately qualified professional.</p>
    </section>
  );
}
