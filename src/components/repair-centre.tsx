"use client";

import { useEffect, useMemo, useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";
import {
  buildRepairBlueprints, createRepairProject, readRepairStore, repairProgress,
  repairStorageKey, type RepairProject, type RepairStore,
} from "@/lib/repair-centre";
import type { SavedReport } from "@/lib/saved-report";

type Props = { saved: SavedReport; openTool: (tool: "run" | "cashflow" | "command") => void };
const empty: RepairStore = { version: 1, projects: [] };
const labels = { draft: "Planning", "in-progress": "In progress", review: "Review results", completed: "Work complete" } as const;

export function RepairCentre({ saved, openTool }: Props) {
  const account = firebaseAuth?.currentUser?.uid ?? "guest";
  const key = useMemo(() => repairStorageKey(account, saved.data.businessName), [account, saved.data.businessName]);
  const [state, setState] = useState<{ key: string; store: RepairStore }>({ key: "", store: empty });
  const [selected, setSelected] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState("");
  const blueprints = useMemo(() => buildRepairBlueprints(saved.data, saved.report), [saved]);
  const store = state.key === key ? state.store : empty;
  const projects = store.projects;
  const active = projects.find(project => project.id === selected) ?? projects[0] ?? null;

  useEffect(() => {
    setState({ key, store: readRepairStore(window.localStorage, key) });
    setSelected("");
    setNotice("");
  }, [key]);
  useEffect(() => {
    if (state.key !== key || !state.key) return;
    window.localStorage.setItem(key, JSON.stringify(state.store));
    window.dispatchEvent(new Event("business-lifeline-repair-project-changed"));
  }, [state, key]);

  const change = (fn: (store: RepairStore) => RepairStore) => {
    setState(current => current.key === key ? { ...current, store: fn(current.store) } : current);
  };
  const update = (id: string, fn: (project: RepairProject) => RepairProject) => {
    change(prev => ({ ...prev, projects: prev.projects.map(project => project.id === id
      ? { ...fn(project), updatedAt: new Date().toISOString() } : project) }));
  };
  const start = (blueprintId: string) => {
    if (projects.length >= 50) { setNotice("Limit reached: archive or complete existing repair projects first."); return; }
    const blueprint = blueprints.find(item => item.id === blueprintId);
    if (!blueprint) return;
    const project = createRepairProject(blueprint);
    change(prev => ({ ...prev, projects: [project, ...prev.projects] }));
    setSelected(project.id);
    setNotice("Repair project created. Verify the evidence with the owner before carrying out changes.");
  };
  const download = (project: RepairProject) => {
    const progress = repairProgress(project);
    const content = [
      "BUSINESS LIFELINE — OPERATIONAL REPAIR PROJECT",
      "Business: " + saved.data.businessName,
      "Project: " + project.title,
      "Status: " + labels[project.status],
      "Assigned to: " + (project.owner || "Unassigned"),
      "Due: " + (project.dueDate || "Not set"),
      "Evidence confirmed by the owner: " + (project.evidenceConfirmed ? "Yes" : "No"),
      "Finding and supporting facts: " + (project.finding || "Unconfirmed"),
      "Metric: " + project.metric,
      "Baseline: " + (project.baseline || "Missing"),
      "Target: " + (project.target || "Not agreed"),
      "Current: " + (project.current || "Not reviewed"),
      "Tasks: " + progress.completed + " of " + progress.total + " complete",
      ...project.steps.map(step => (step.done ? "[x] " : "[ ] ") + step.title + " — " + step.detail),
      "Notes: " + (project.notes || "None"),
      "",
      "This is an owner-reviewed operational plan, not an audited financial result, insolvency assessment or guarantee.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "lifeline-repair-" + project.blueprintId + ".txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const readyToFinish = (project: RepairProject) =>
    project.evidenceConfirmed && project.steps.length > 0 &&
    project.steps.every(step => step.done) && Boolean(project.current.trim());

  return <section className="workspace-section-stack" aria-label="Business Lifeline repair centre">
    <section className="panel">
      <div className="section-heading"><span>RECOVER · IMPLEMENT</span><h2>Repair Centre</h2></div>
      <p>Turn a reviewed MRI concern into an owner-approved improvement project. These are <strong>possible operational improvements</strong>, not proven root causes. Compare actual evidence before making changes.</p>
      <p><strong>{projects.length} repair project{projects.length === 1 ? "" : "s"}</strong> saved to this signed-in workspace. Confirm cloud sync before signing out.</p>
      {notice && <p role="status">{notice}</p>}
      <label style={{ display: "block", marginBlock: "0.75rem" }}>
        <input type="checkbox" checked={showAll} onChange={event => setShowAll(event.target.checked)} /> Show all improvement templates (including those not flagged by this MRI)
      </label>
      <div className="action-grid">
        {blueprints.filter(item => showAll || item.relevant).map(plan =>
          <article key={plan.id} className="action-card">
            <div className="action-top"><strong>{plan.title}</strong><span className="tag">{plan.relevant ? "Investigate" : "Optional"}</span></div>
            <p>{plan.reason}</p>
            <p><strong>Check:</strong> {plan.evidence.join("; ")}</p>
            <p><strong>Track:</strong> {plan.metric}</p>
            {plan.referral && <p><strong>Escalate:</strong> {plan.referral}</p>}
            <button type="button" className="button primary" onClick={() => start(plan.id)}>Create repair project</button>
          </article>
        )}
      </div>
    </section>

    {projects.length > 0 && <section className="panel">
      <div className="section-heading"><span>ASSIGNED REPAIR WORK</span><h3>Projects and progress</h3></div>
      <div className="action-grid">
        {projects.map(project => {
          const progress = repairProgress(project);
          return <button type="button" key={project.id}
            className={active?.id === project.id ? "button primary" : "button ghost"}
            onClick={() => setSelected(project.id)}>
            {project.title} · {labels[project.status]} · {progress.percent}%
          </button>;
        })}
      </div>
    </section>}

    {active && <section className="panel" aria-label={"Repair project: " + active.title}>
      <div className="section-heading"><span>PROJECT DETAILS</span><h3>{active.title}</h3></div>
      <p>Record why the change is justified, who owns it and what will prove improvement. A completed checklist means the work was attempted, not that the business is recovered.</p>
      <div className="form-grid">
        <label>Responsible person
          <input value={active.owner} maxLength={100} onChange={e => update(active.id, p => ({ ...p, owner: e.target.value }))} />
        </label>
        <label>Target date
          <input type="date" value={active.dueDate} onChange={e => update(active.id, p => ({ ...p, dueDate: e.target.value }))} />
        </label>
        <label>Status
          <select value={active.status} onChange={e => {
            const status = e.target.value as RepairProject["status"];
            if (status === "completed" && !readyToFinish(active)) { setNotice("Finish every step, confirm the evidence and record a current result before marking work complete."); return; }
            update(active.id, p => ({ ...p, status }));
          }}>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>How you will measure it
          <input value={active.metric} maxLength={200} onChange={e => update(active.id, p => ({ ...p, metric: e.target.value }))} />
        </label>
        <label>Baseline (include date and units)
          <input value={active.baseline} maxLength={180} placeholder="e.g. 3 of 10 jobs over budget, Sep 2026" onChange={e => update(active.id, p => ({ ...p, baseline: e.target.value }))} />
        </label>
        <label>Owner-agreed target
          <input value={active.target} maxLength={180} placeholder="e.g. reduce quote-to-actual variance" onChange={e => update(active.id, p => ({ ...p, target: e.target.value }))} />
        </label>
        <label>Actual result after change
          <input value={active.current} maxLength={180} placeholder="Record result and date after trial" onChange={e => update(active.id, p => ({ ...p, current: e.target.value }))} />
        </label>
      </div>
      <label style={{ display: "block", marginBlock: "0.75rem" }}>Facts checked with the owner, and possible causes
        <textarea rows={3} maxLength={2500} value={active.finding} placeholder="What actually happened? Which records support it? What's still uncertain?" onChange={e => update(active.id, p => ({ ...p, finding: e.target.value }))} />
      </label>
      <label style={{ display: "block", marginBlock: "0.75rem" }}>
        <input type="checkbox" checked={active.evidenceConfirmed}
          onChange={e => update(active.id, p => ({ ...p, evidenceConfirmed: e.target.checked }))} />
        Owner has checked the supporting evidence and approved this operational plan
      </label>
      <div className="action-grid">
        {active.steps.map((step, index) =>
          <article className="action-card" key={index}>
            <div className="action-top"><strong>{index + 1}. {step.title}</strong><span className="tag">{step.done ? "Recorded complete" : "To do"}</span></div>
            <p>{step.detail}</p>
            <label><input type="checkbox" checked={step.done} onChange={e =>
              update(active.id, project => ({ ...project, steps: project.steps.map((item, i) =>
                i === index ? { ...item, done: e.target.checked, completedAt: e.target.checked ? new Date().toISOString() : undefined } : item) }))} />
              Step completed and checked
            </label>
          </article>
        )}
      </div>
      <label style={{ display: "block", marginBlock: "0.75rem" }}>Review notes and unresolved risks
        <textarea rows={3} maxLength={2500} value={active.notes} onChange={e => update(active.id, p => ({ ...p, notes: e.target.value }))} />
      </label>
      <div className="form-actions">
        <button type="button" className="button ghost" onClick={() => download(active)}>Download repair plan</button>
        <button type="button" className="button ghost" onClick={() => openTool(active.blueprintId === "cash-visibility" ? "cashflow" : active.blueprintId === "work-scheduling" ? "command" : "run")}>
          Open related Business Lifeline tools
        </button>
      </div>
      <p className="form-disclaimer">Use the existing quote, job, CRM, expense or stock workflows where relevant. No quote, reminder, accounting change or payment is sent automatically by this repair plan. Refer tax, wages, legal, lending or suspected insolvency matters to qualified professionals.</p>
    </section>}
  </section>;
}
