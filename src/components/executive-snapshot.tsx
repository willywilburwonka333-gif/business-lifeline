import type { BusinessData, BusinessReport } from "@/lib/types";

const currencyFor = (country: string) => {
  const value = country.toLowerCase();
  if (value.includes("australia")) return "AUD";
  if (value.includes("new zealand")) return "NZD";
  if (value.includes("united kingdom") || value.includes("england") || value.includes("scotland") || value.includes("wales")) return "GBP";
  if (value.includes("canada")) return "CAD";
  if (value.includes("euro") || ["germany", "france", "italy", "spain", "ireland", "netherlands"].some((item) => value.includes(item))) return "EUR";
  return "USD";
};

const money = (amount: number, country: string) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyFor(country),
    maximumFractionDigits: 0,
  }).format(amount);

export function ExecutiveSnapshot({ data, report }: { data: BusinessData; report: BusinessReport }) {
  const metrics = report.metrics;
  const immediateActions = report.today.slice(0, 3);

  return (
    <section className="panel executive-snapshot" aria-labelledby="executive-snapshot-title">
      <div className="section-heading">
        <span>Executive snapshot</span>
        <h3 id="executive-snapshot-title">The position in one minute</h3>
      </div>

      <div className="metric-grid">
        <article>
          <span>Business pressure</span>
          <strong>{metrics.pressureLevel}</strong>
          <small>Pressure indicator {metrics.overallScore}/100</small>
        </article>
        <article>
          <span>Assessment confidence</span>
          <strong>{metrics.dataConfidence}%</strong>
          <small>Based on completeness and consistency of supplied data</small>
        </article>
        <article>
          <span>Monthly result</span>
          <strong className={metrics.monthlyOperatingResult < 0 ? "negative" : "positive"}>
            {money(metrics.monthlyOperatingResult, data.country)}
          </strong>
          <small>{metrics.operatingMargin}% operating margin</small>
        </article>
        <article>
          <span>Cash runway</span>
          <strong>{metrics.runwayMonths === null ? "Cash positive" : `${metrics.runwayMonths} months`}</strong>
          <small>At the current monthly result</small>
        </article>
      </div>

      {metrics.criticalTriggers.length > 0 && (
        <div className="panel warning-panel" role="alert">
          <p className="eyebrow">Immediate escalation signals</p>
          <ul>
            {metrics.criticalTriggers.map((trigger) => <li key={trigger}>{trigger}</li>)}
          </ul>
          <p>This is a screening result, not a legal determination of solvency. Seek qualified advice promptly where an escalation signal applies.</p>
        </div>
      )}

      <div className="insight-grid">
        <article className="panel">
          <p className="eyebrow">Why this result</p>
          <ul>
            {metrics.scoreExplanation.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
        <article className="panel">
          <p className="eyebrow">Next three moves</p>
          <ol>
            {immediateActions.length ? immediateActions.map((item) => <li key={item.title}>{item.title}</li>) : <li>Continue monitoring cash and sales weekly.</li>}
          </ol>
        </article>
      </div>

      <div className="insight-grid">
        <article className="panel">
          <p className="eyebrow">Primary problem</p>
          <h3>{data.biggestProblem || "No primary problem supplied"}</h3>
          <p><b>Immediate goal:</b> {data.immediateGoal || "No immediate goal supplied"}</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Score components</p>
          <p>Cash flow {metrics.cashFlowScore}/100 · Liquidity {metrics.liquidityScore}/100 · Obligations {metrics.obligationsScore}/100 · Debt {metrics.debtScore}/100 · Revenue stability {metrics.revenueScore}/100</p>
        </article>
      </div>
    </section>
  );
}
