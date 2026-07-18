"use client";

import { FormEvent, useMemo, useState } from "react";
import type { SavedReport } from "@/lib/saved-report";
import { readRecoveryHistory } from "@/lib/recovery-history";
import { coachProgress, readCoachCheckIn } from "@/lib/recovery-coach";

type BrainAnswer = {
  answer: string;
  reasoningSummary: string[];
  nextSteps: string[];
  watchOutFor: string[];
  professionalHelp: { recommended: boolean; type: string; reason: string };
};

type ConversationItem = { question: string; answer: BrainAnswer };

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
    nextSteps: urgent ? [urgent.title, "Use the Scenario Planner to test the financial effect before committing."] : ["Review the MRI priorities and test the decision in the Scenario Planner."],
    watchOutFor: report.warnings.slice(0, 3),
    professionalHelp: {
      recommended: report.urgentHelp,
      type: "qualified accountant or appropriate business adviser",
      reason: report.urgentHelp ? "The MRI contains urgent warning signs that should not rely on automated guidance alone." : "Not automatically required from the supplied figures, but obtain professional advice before a high-impact legal, tax, staffing or debt decision.",
    },
  };
}

export function BusinessBrain({ saved }: { saved: SavedReport }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState<ConversationItem[]>([]);

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
    setLoading(true);
    setError("");

    const recovery = readRecoveryHistory().slice(-8);
    const coach = readCoachCheckIn();

    try {
      const response = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleaned,
          context: {
            data: saved.data,
            report: saved.report,
            recovery,
            coach: { ...coach, progress: coachProgress(coach, saved.report) },
          },
        }),
      });
      if (!response.ok) throw new Error("Business Brain is temporarily unavailable.");
      const payload = (await response.json()) as { answer?: BrainAnswer };
      if (!payload.answer) throw new Error("Business Brain returned no usable answer.");
      setConversation((current) => [...current, { question: cleaned, answer: payload.answer! }].slice(-6));
      setQuestion("");
    } catch (caught) {
      const fallback = localFallback(saved, cleaned);
      setConversation((current) => [...current, { question: cleaned, answer: fallback }].slice(-6));
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
        <span className="brain-context-badge">Using this business&apos;s MRI</span>
      </div>
      <p className="template-note">Ask a decision question. The answer is grounded in the saved MRI, recovery checkpoints, coach progress, risks and rescue plan.</p>

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
        <button className="button primary" type="submit" disabled={loading || question.trim().length < 3}>{loading ? "Thinking with your MRI…" : "Ask Business Brain"}</button>
      </form>

      {error && <p className="brain-error" role="status">{error}</p>}

      <div className="brain-conversation" aria-live="polite">
        {conversation.length === 0 && <div className="brain-empty"><strong>No question asked yet.</strong><p>Start with one decision that is keeping you awake. Business Brain will explain what the current figures support, what they do not prove, and what to do next.</p></div>}
        {conversation.map((item, index) => (
          <article className="brain-answer" key={`${item.question}-${index}`}>
            <p className="brain-question"><span>You asked</span>{item.question}</p>
            <div className="brain-main-answer"><span>Business Brain</span><p>{item.answer.answer}</p></div>
            <div className="brain-answer-grid">
              <section><h4>Why this answer</h4><ul>{item.answer.reasoningSummary.map((line) => <li key={line}>{line}</li>)}</ul></section>
              <section><h4>Next steps</h4><ol>{item.answer.nextSteps.map((line) => <li key={line}>{line}</li>)}</ol></section>
              {item.answer.watchOutFor.length > 0 && <section><h4>Watch out for</h4><ul>{item.answer.watchOutFor.map((line) => <li key={line}>{line}</li>)}</ul></section>}
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
