import type { BusinessReport } from "@/lib/types";

export function AnalysisProvenance({ report, compact = false }: { report: BusinessReport; compact?: boolean }) {
  const aiReady = report.aiStatus === "ready" && Boolean(report.aiAnalysis);

  return (
    <section className={`analysis-provenance ${compact ? "compact" : ""}`} aria-label="How this recommendation was created">
      <div className="analysis-provenance-heading">
        <div>
          <span>How this was created</span>
          <h3>Calculated facts first. GPT-5.6 interpretation second.</h3>
        </div>
        <b className={aiReady ? "ai-ready" : "rules-ready"}>{aiReady ? "GPT-5.6 active" : "Rules-based fallback"}</b>
      </div>
      <div className="analysis-provenance-grid">
        <article>
          <span>Deterministic engine</span>
          <strong>Financial facts</strong>
          <p>Calculates monthly result, margin, runway, debt pressure, receivables pressure, health score and rule-based recovery actions.</p>
          <small>These figures do not depend on a language model.</small>
        </article>
        <article>
          <span>GPT-5.6</span>
          <strong>Context and priorities</strong>
          <p>{aiReady ? "Interprets the supplied business context, identifies likely root causes, resolves competing priorities and explains professional escalation points." : "AI was unavailable or not configured, so the product retained the tested calculation-based report without inventing an AI answer."}</p>
          <small>Structured output is constrained to the supplied facts and calculated metrics.</small>
        </article>
        <article>
          <span>Safety boundary</span>
          <strong>Decision support</strong>
          <p>Business Lifeline does not declare insolvency, give tax or legal conclusions, or guarantee that a recovery action will succeed.</p>
          <small>High-risk warning signs are directed to appropriately qualified professionals.</small>
        </article>
      </div>
    </section>
  );
}
