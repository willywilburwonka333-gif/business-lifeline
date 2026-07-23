"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const FEEDBACK_KEY = "business-lifeline-beta-feedback-v1";
const OUTCOME_KEY = "business-lifeline-pilot-outcomes-v1";

type Feedback = {
  id: string;
  type: "bug" | "confusing" | "suggestion" | "helpful";
  screen: string;
  details: string;
  createdAt: string;
};

type Outcome = {
  initialConfidence: number;
  currentConfidence: number;
  actionsAssigned: number;
  actionsCompleted: number;
  overdueObligations: number;
  cashVisibility: "unknown" | "poor" | "partial" | "clear";
  notes: string;
  updatedAt: string;
};

const blankOutcome: Outcome = {
  initialConfidence: 5,
  currentConfidence: 5,
  actionsAssigned: 0,
  actionsCompleted: 0,
  overdueObligations: 0,
  cashVisibility: "unknown",
  notes: "",
  updatedAt: "",
};

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BetaSafetyCentre() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"safety" | "feedback" | "outcomes">("safety");
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [outcome, setOutcome] = useState<Outcome>(blankOutcome);
  const [feedbackType, setFeedbackType] = useState<Feedback["type"]>("bug");
  const [screen, setScreen] = useState("");
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const storedFeedback = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]") as Feedback[];
      const storedOutcome = JSON.parse(localStorage.getItem(OUTCOME_KEY) || "null") as Outcome | null;
      setFeedback(Array.isArray(storedFeedback) ? storedFeedback : []);
      if (storedOutcome) setOutcome({ ...blankOutcome, ...storedOutcome });
    } catch {
      setNotice("Previous beta notes could not be loaded on this device.");
    }
  }, []);

  const completionRate = useMemo(() => {
    if (!outcome.actionsAssigned) return 0;
    return Math.min(100, Math.round((outcome.actionsCompleted / outcome.actionsAssigned) * 100));
  }, [outcome.actionsAssigned, outcome.actionsCompleted]);

  const saveFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!details.trim()) {
      setNotice("Describe what happened before saving the report.");
      return;
    }
    const next: Feedback[] = [
      {
        id: crypto.randomUUID(),
        type: feedbackType,
        screen: screen.trim() || "Not specified",
        details: details.trim(),
        createdAt: new Date().toISOString(),
      },
      ...feedback,
    ];
    setFeedback(next);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
    setDetails("");
    setNotice("Feedback saved on this device. Export it before the weekly pilot review.");
  };

  const saveOutcome = () => {
    const next = { ...outcome, updatedAt: new Date().toISOString() };
    setOutcome(next);
    localStorage.setItem(OUTCOME_KEY, JSON.stringify(next));
    setNotice("Pilot outcome checkpoint saved.");
  };

  return (
    <>
      <button className="beta-safety-launcher" onClick={() => setOpen(true)}>
        <span>CONTROLLED BETA</span>
        <strong>Safety & feedback</strong>
      </button>

      {open && (
        <div className="beta-safety-backdrop" role="dialog" aria-modal="true" aria-label="Controlled beta safety centre">
          <section className="beta-safety-panel">
            <header>
              <div>
                <small>BUSINESS LIFELINE PILOT</small>
                <h2>Safety, feedback and outcomes</h2>
                <p>Use Business Lifeline alongside existing professional advice and official business records during the pilot.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close beta safety centre">×</button>
            </header>

            <nav aria-label="Beta safety sections">
              <button className={tab === "safety" ? "active" : ""} onClick={() => setTab("safety")}>Safety</button>
              <button className={tab === "feedback" ? "active" : ""} onClick={() => setTab("feedback")}>Report feedback</button>
              <button className={tab === "outcomes" ? "active" : ""} onClick={() => setTab("outcomes")}>Pilot outcomes</button>
            </nav>

            {notice && <p className="beta-safety-notice" role="status">{notice}</p>}

            {tab === "safety" && (
              <section className="beta-safety-content">
                <h3>Controlled beta boundaries</h3>
                <div className="beta-safety-grid">
                  <article>
                    <strong>Use it for</strong>
                    <p>Business MRI, problem prioritisation, recovery planning, action tracking, operational visibility and structured feedback.</p>
                  </article>
                  <article>
                    <strong>Do not rely on it for</strong>
                    <p>Tax or BAS lodgement, payroll, insolvency decisions, legal advice, regulated financial advice or the only copy of important records.</p>
                  </article>
                  <article>
                    <strong>Escalate immediately</strong>
                    <p>Potential insolvency, unpaid wages or super, legal notices, threats to safety, fraud, inability to meet critical obligations or advice that appears wrong.</p>
                  </article>
                  <article>
                    <strong>Protect data</strong>
                    <p>Do not enter client case files, health information, card details, passwords or identity documents during the first pilot.</p>
                  </article>
                </div>
                <button onClick={() => downloadJson("business-lifeline-beta-backup.json", { feedback, outcome, exportedAt: new Date().toISOString() })}>Export pilot backup</button>
              </section>
            )}

            {tab === "feedback" && (
              <section className="beta-safety-content">
                <h3>Record what happened</h3>
                <form onSubmit={saveFeedback}>
                  <label>Feedback type
                    <select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value as Feedback["type"])}>
                      <option value="bug">Bug or error</option>
                      <option value="confusing">Confusing wording or flow</option>
                      <option value="suggestion">Missing feature or suggestion</option>
                      <option value="helpful">Something that genuinely helped</option>
                    </select>
                  </label>
                  <label>Screen or step
                    <input value={screen} onChange={(event) => setScreen(event.target.value)} placeholder="Example: MRI results or Recovery Stage 2" />
                  </label>
                  <label>What happened?
                    <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={5} placeholder="What did you expect, what actually happened, and what device were you using?" />
                  </label>
                  <button type="submit">Save feedback</button>
                </form>
                <div className="beta-feedback-history">
                  <div><strong>{feedback.length}</strong><span>saved reports</span></div>
                  <button onClick={() => downloadJson("business-lifeline-feedback.json", feedback)}>Export feedback</button>
                </div>
              </section>
            )}

            {tab === "outcomes" && (
              <section className="beta-safety-content">
                <h3>Weekly recovery checkpoint</h3>
                <div className="beta-outcome-grid">
                  <label>Confidence at start (1–10)<input type="number" min="1" max="10" value={outcome.initialConfidence} onChange={(event) => setOutcome({ ...outcome, initialConfidence: Number(event.target.value) })} /></label>
                  <label>Confidence now (1–10)<input type="number" min="1" max="10" value={outcome.currentConfidence} onChange={(event) => setOutcome({ ...outcome, currentConfidence: Number(event.target.value) })} /></label>
                  <label>Actions assigned<input type="number" min="0" value={outcome.actionsAssigned} onChange={(event) => setOutcome({ ...outcome, actionsAssigned: Number(event.target.value) })} /></label>
                  <label>Actions completed<input type="number" min="0" value={outcome.actionsCompleted} onChange={(event) => setOutcome({ ...outcome, actionsCompleted: Number(event.target.value) })} /></label>
                  <label>Overdue obligations<input type="number" min="0" value={outcome.overdueObligations} onChange={(event) => setOutcome({ ...outcome, overdueObligations: Number(event.target.value) })} /></label>
                  <label>Cash visibility<select value={outcome.cashVisibility} onChange={(event) => setOutcome({ ...outcome, cashVisibility: event.target.value as Outcome["cashVisibility"] })}><option value="unknown">Unknown</option><option value="poor">Poor</option><option value="partial">Partial</option><option value="clear">Clear</option></select></label>
                </div>
                <label>Weekly notes<textarea rows={4} value={outcome.notes} onChange={(event) => setOutcome({ ...outcome, notes: event.target.value })} placeholder="What improved, what is still blocked, and what help is required?" /></label>
                <div className="beta-outcome-summary"><strong>{completionRate}%</strong><span>action completion</span><strong>{outcome.currentConfidence - outcome.initialConfidence >= 0 ? "+" : ""}{outcome.currentConfidence - outcome.initialConfidence}</strong><span>confidence change</span></div>
                <button onClick={saveOutcome}>Save weekly checkpoint</button>
              </section>
            )}

            <footer>Beta decision support only. Keep official records and qualified professional support in place.</footer>
          </section>
        </div>
      )}
    </>
  );
}
