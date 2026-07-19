"use client";

import { useEffect, useMemo, useState } from "react";
import { createBusinessOs, newOsId, osSummary, readBusinessOs, writeBusinessOs, type BusinessOsState, type OsContact, type OsTask, type OsTeamMember } from "@/lib/business-os";
import type { SavedReport } from "@/lib/saved-report";

const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : "USD";
const currencySymbol = (country: string) => country.toLowerCase().includes("australia") ? "A$" : "$";
const money = (value: number, country: string) => new Intl.NumberFormat("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0 }).format(value);
const number = (value: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
const parseMoney = (value: string) => Math.max(0, Number(value.replace(/[^0-9.-]/g, "")) || 0);
const isRiverbendDemo = (saved: SavedReport) => saved.data.businessName.trim().toLowerCase() === "riverbend café";

type TargetInputProps = {
  label: string;
  value: number;
  country: string;
  onCommit: (value: number) => void;
};

function TargetInput({ label, value, country, onCommit }: TargetInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(number(value));

  useEffect(() => {
    if (!editing) setDraft(number(value));
  }, [editing, value]);

  const commit = () => {
    const next = parseMoney(draft);
    onCommit(next);
    setDraft(number(next));
    setEditing(false);
  };

  return (
    <label className="os-money-target">
      <span>{label}</span>
      <div>
        <b>{currencySymbol(country)}</b>
        <input
          inputMode="numeric"
          value={editing ? draft : number(value)}
          onFocus={() => { setEditing(true); setDraft(String(value)); }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          aria-label={`${label} target in ${currencyFor(country)}`}
        />
      </div>
    </label>
  );
}

export function BusinessOperatingSystem({ saved }: { saved: SavedReport }) {
  const [state, setState] = useState<BusinessOsState>(() => createBusinessOs(saved));
  const [tab, setTab] = useState<"command" | "tasks" | "contacts" | "team" | "documents">("command");
  const [message, setMessage] = useState("");
  const demo = isRiverbendDemo(saved);

  useEffect(() => setState(readBusinessOs(saved)), [saved]);
  const summary = useMemo(() => osSummary(state), [state]);
  const save = (next: BusinessOsState, note = "Business OS saved.") => { setState(next); writeBusinessOs(next); setMessage(note); window.setTimeout(() => setMessage(""), 1800); };

  const addTask = () => {
    const task: OsTask = { id: newOsId("task"), title: "New priority", owner: "Owner", due: "This week", priority: "Normal", done: false };
    save({ ...state, tasks: [...state.tasks, task] }); setTab("tasks");
  };
  const addContact = () => {
    const contact: OsContact = { id: newOsId("contact"), name: "New contact", type: "Customer", nextAction: "Follow up", value: 0 };
    save({ ...state, contacts: [...state.contacts, contact] }); setTab("contacts");
  };
  const addTeam = () => {
    const member: OsTeamMember = { id: newOsId("team"), name: "Team member", responsibility: "Key responsibility", weeklyOutcome: "Expected weekly outcome" };
    save({ ...state, team: [...state.team, member] }); setTab("team");
  };

  return (
    <section className="business-os no-print">
      <header className="business-os-header">
        <div><span>Stage 6 · Business operating system</span><h3>Run the business from one command centre</h3><p>The MRI identifies pressure. This workspace turns that diagnosis into weekly operating discipline.</p></div>
        <div className="business-os-actions"><button className="button primary" type="button" onClick={addTask}>Add task</button><button className="button ghost" type="button" onClick={addContact}>Add contact</button></div>
      </header>

      {demo && <aside className="os-demo-note"><strong>Example demo progress</strong><span>Riverbend includes one completed task, three sample relationships and one current control document so judges can see the operating system in motion. Reset from MRI restores this example state.</span></aside>}

      <div className="os-kpi-strip">
        <article><span>Health score</span><strong>{saved.report.metrics.overallScore}/100</strong><small>MRI baseline</small></article>
        <article><span>Task completion</span><strong>{summary.completion}%</strong><small>{summary.openTasks} still open</small></article>
        <article><span>Cash target</span><strong>{money(state.cashTarget, saved.data.country)}</strong><small>Current {money(saved.data.cashAvailable, saved.data.country)}</small></article>
        <article><span>Invoice target</span><strong>{money(state.invoiceCollectionTarget, saved.data.country)}</strong><small>{summary.nextActions} contact follow-ups</small></article>
      </div>

      <nav className="os-tabs" aria-label="Business operating system modules">
        {([['command','Command centre'],['tasks','Tasks'],['contacts','CRM'],['team','Team'],['documents','Documents']] as const).map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} type="button" onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === "command" && <div className="os-command-grid">
        <article className="os-panel os-focus"><span>This week’s focus</span><textarea value={state.weekFocus} onChange={(e) => setState({ ...state, weekFocus: e.target.value })} onBlur={() => writeBusinessOs(state)} /><p>Keep this to one outcome that matters most.</p></article>
        <article className="os-panel os-targets"><span>Monthly targets</span>
          <TargetInput label="Revenue" value={state.revenueTarget} country={saved.data.country} onCommit={(value) => save({ ...state, revenueTarget: value }, "Revenue target updated.")} />
          <TargetInput label="Cash available" value={state.cashTarget} country={saved.data.country} onCommit={(value) => save({ ...state, cashTarget: value }, "Cash target updated.")} />
          <TargetInput label="Invoices collected" value={state.invoiceCollectionTarget} country={saved.data.country} onCommit={(value) => save({ ...state, invoiceCollectionTarget: value }, "Invoice target updated.")} />
        </article>
        <article className="os-panel"><span>Operating alerts</span><ul><li className={summary.criticalTasks ? "warning" : "good"}>{summary.criticalTasks ? `${summary.criticalTasks} critical task${summary.criticalTasks === 1 ? "" : "s"} unresolved` : "No critical tasks unresolved"}</li><li className={saved.report.metrics.monthlyOperatingResult < 0 ? "warning" : "good"}>{saved.report.metrics.monthlyOperatingResult < 0 ? `Monthly operating loss of ${money(Math.abs(saved.report.metrics.monthlyOperatingResult), saved.data.country)}` : "Monthly operating result is positive"}</li><li className={saved.data.overdueTax + saved.data.overdueSuppliers > 0 ? "warning" : "good"}>{saved.data.overdueTax + saved.data.overdueSuppliers > 0 ? `${money(saved.data.overdueTax + saved.data.overdueSuppliers, saved.data.country)} overdue obligations` : "No overdue tax or supplier balance recorded"}</li></ul></article>
        <article className="os-panel"><span>Control coverage</span><div className="os-coverage"><b>{state.documents.filter((d) => d.current).length}/{state.documents.length}</b><p>core documents current</p></div><div className="os-coverage"><b>{state.team.length}</b><p>responsibility owners assigned</p></div><div className="os-coverage"><b>{state.contacts.length}</b><p>key relationships tracked</p></div></article>
      </div>}

      {tab === "tasks" && <div className="os-module"><div className="os-module-head"><div><h4>Execution board</h4><p>Every recovery commitment needs an owner and deadline.</p></div><button className="button primary" type="button" onClick={addTask}>Add task</button></div>{state.tasks.map((task) => <div className={`os-row ${task.done ? "done" : ""}`} key={task.id}><input aria-label="Complete task" type="checkbox" checked={task.done} onChange={(e) => save({ ...state, tasks: state.tasks.map((x) => x.id === task.id ? { ...x, done: e.target.checked } : x) })}/><input value={task.title} onChange={(e) => setState({ ...state, tasks: state.tasks.map((x) => x.id === task.id ? { ...x, title: e.target.value } : x) })} onBlur={() => writeBusinessOs(state)}/><input value={task.owner} onChange={(e) => setState({ ...state, tasks: state.tasks.map((x) => x.id === task.id ? { ...x, owner: e.target.value } : x) })} onBlur={() => writeBusinessOs(state)}/><input value={task.due} onChange={(e) => setState({ ...state, tasks: state.tasks.map((x) => x.id === task.id ? { ...x, due: e.target.value } : x) })} onBlur={() => writeBusinessOs(state)}/><select value={task.priority} onChange={(e) => save({ ...state, tasks: state.tasks.map((x) => x.id === task.id ? { ...x, priority: e.target.value as OsTask['priority'] } : x) })}><option>Critical</option><option>High</option><option>Normal</option></select><button type="button" onClick={() => save({ ...state, tasks: state.tasks.filter((x) => x.id !== task.id) })}>Remove</button></div>)}</div>}

      {tab === "contacts" && <div className="os-module"><div className="os-module-head"><div><h4>Relationship and follow-up register</h4><p>Track the customers, suppliers, advisers and lenders that affect recovery.</p></div><button className="button primary" type="button" onClick={addContact}>Add contact</button></div>{state.contacts.length === 0 && <p className="os-empty">No contacts added yet.</p>}{state.contacts.map((contact) => <div className="os-row contact" key={contact.id}><input value={contact.name} onChange={(e) => setState({ ...state, contacts: state.contacts.map((x) => x.id === contact.id ? { ...x, name: e.target.value } : x) })} onBlur={() => writeBusinessOs(state)}/><select value={contact.type} onChange={(e) => save({ ...state, contacts: state.contacts.map((x) => x.id === contact.id ? { ...x, type: e.target.value as OsContact['type'] } : x) })}><option>Customer</option><option>Supplier</option><option>Adviser</option><option>Lender</option></select><input value={contact.nextAction} onChange={(e) => setState({ ...state, contacts: state.contacts.map((x) => x.id === contact.id ? { ...x, nextAction: e.target.value } : x) })} onBlur={() => writeBusinessOs(state)}/><input type="number" min="0" value={contact.value} onChange={(e) => setState({ ...state, contacts: state.contacts.map((x) => x.id === contact.id ? { ...x, value: Math.max(0, Number(e.target.value) || 0) } : x) })} onBlur={() => writeBusinessOs(state)}/><button type="button" onClick={() => save({ ...state, contacts: state.contacts.filter((x) => x.id !== contact.id) })}>Remove</button></div>)}</div>}

      {tab === "team" && <div className="os-module"><div className="os-module-head"><div><h4>Responsibility map</h4><p>Make ownership visible so the business does not depend on memory.</p></div><button className="button primary" type="button" onClick={addTeam}>Add person</button></div>{state.team.map((member) => <div className="os-row team" key={member.id}><input value={member.name} onChange={(e) => setState({ ...state, team: state.team.map((x) => x.id === member.id ? { ...x, name: e.target.value } : x) })} onBlur={() => writeBusinessOs(state)}/><input value={member.responsibility} onChange={(e) => setState({ ...state, team: state.team.map((x) => x.id === member.id ? { ...x, responsibility: e.target.value } : x) })} onBlur={() => writeBusinessOs(state)}/><input value={member.weeklyOutcome} onChange={(e) => setState({ ...state, team: state.team.map((x) => x.id === member.id ? { ...x, weeklyOutcome: e.target.value } : x) })} onBlur={() => writeBusinessOs(state)}/><button type="button" onClick={() => save({ ...state, team: state.team.filter((x) => x.id !== member.id) })}>Remove</button></div>)}</div>}

      {tab === "documents" && <div className="os-module"><div className="os-module-head"><div><h4>Business control documents</h4><p>Mark the evidence and operating records that are current and usable.</p></div></div><div className="os-document-grid">{state.documents.map((document) => <label className={document.current ? "current" : ""} key={document.id}><input type="checkbox" checked={document.current} onChange={(e) => save({ ...state, documents: state.documents.map((x) => x.id === document.id ? { ...x, current: e.target.checked } : x) })}/><span>{document.category}</span><strong>{document.name}</strong><small>{document.current ? "Current" : "Needs attention"}</small></label>)}</div></div>}

      <footer className="os-footer"><span>{message || `Last updated ${new Date(state.updatedAt).toLocaleString()}`}</span><button className="button ghost" type="button" onClick={() => save(createBusinessOs(saved), demo ? "Riverbend example progress restored from the MRI." : "Business OS reset from the current MRI.")}>Reset from MRI</button></footer>
    </section>
  );
}