"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { notifyBusinessDataChanged } from "@/lib/business-data-events";
import { LIFELINE_BOOKS_KEY, readBooksStore, type BooksStore, type LedgerJournal } from "@/lib/lifeline-books-engine";
import { calculatePayroll, payrollJournalLines, type PayComponent } from "@/lib/lifeline-payroll-engine";

export const LIFELINE_PEOPLE_KEY = "business-lifeline-people-v1";
const OPERATIONS_KEY = "business-lifeline-connected-operations-v2";

type Employee = {
  id: string;
  name: string;
  email: string;
  employmentType: "full-time" | "part-time" | "casual" | "contractor";
  hourlyRate: number;
  ordinaryHoursPerWeek: number;
  employerName: string;
  employerAbn: string;
  superFundName: string;
  awardOrAgreement: string;
  classification: string;
  superRatePercent: number;
  withholdingRatePercent: number;
  payFrequency: "weekly"|"fortnightly"|"monthly";
  taxResident: boolean;
  taxFreeThreshold: boolean;
  tfnProvided: boolean;
  studyLoan: boolean;
  annualLeaveHours: number;
  personalLeaveHours: number;
  annualLeaveAccrualPerHour: number;
  personalLeaveAccrualPerHour: number;
  active: boolean;
};

type PayLine = {
  employeeId: string;
  employeeName: string;
  hours: number;
  gross: number;
  payg: number;
  super: number;
  net: number;
  annualLeaveAccrued: number;
  personalLeaveAccrued: number;
  hourlyRate: number;
  ordinaryGross: number;
  overtime: number;
  paidLeave: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  qualifyingEarnings: number;
};

type PayRun = {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  lines: PayLine[];
  status: "draft" | "finalised" | "paid";
  createdAt: string;
};

type PeopleStore = { employees: Employee[]; payRuns: PayRun[] };
type Timesheet = { person: string; date: string; start: string; end: string; breakMinutes: number; notes?: string };
type OperationsStore = { timesheets?: Timesheet[] };

const empty: PeopleStore = { employees: [], payRuns: [] };
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const id = (prefix: string) => prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

function readPeople(): PeopleStore {
  try {
    const raw = localStorage.getItem(LIFELINE_PEOPLE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PeopleStore>;
    return { employees: Array.isArray(parsed.employees) ? parsed.employees : [], payRuns: Array.isArray(parsed.payRuns) ? parsed.payRuns : [] };
  } catch { return empty; }
}

function readTimesheets(): Timesheet[] {
  try {
    const raw = localStorage.getItem(OPERATIONS_KEY);
    if (!raw) return [];
    const value = JSON.parse(raw) as OperationsStore;
    return Array.isArray(value.timesheets) ? value.timesheets : [];
  } catch { return []; }
}

function hoursBetween(start: string, end: string, breakMinutes: number) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm) - Number(breakMinutes || 0);
  if (minutes < 0) minutes += 24 * 60;
  return round(Math.max(0, minutes) / 60);
}

function postJournal(journal: LedgerJournal) {
  const store = readBooksStore();
  if (store.journals.some((item) => item.source === journal.source)) return false;
  const debit = round(journal.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount, 0));
  const credit = round(journal.lines.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.amount, 0));
  if (debit !== credit || debit <= 0 || (store.lockDate && journal.date <= store.lockDate)) return false;
  const next: BooksStore = { ...store, journals: [journal, ...store.journals] };
  localStorage.setItem(LIFELINE_BOOKS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync", { detail: { changed: true } }));
  notifyBusinessDataChanged({domain:"books",entityType:"payroll-journal",entityId:journal.id,reason:"payroll-journal-posted"});
  return true;
}

export function LifelinePeople() {
  const [store, setStore] = useState<PeopleStore>(empty);
  const [ready, setReady] = useState(false);
  const [employee, setEmployee] = useState({
    name: "", email: "", employmentType: "full-time" as Employee["employmentType"], hourlyRate: 0,
    ordinaryHoursPerWeek: 38, employerName: "", employerAbn: "", superFundName: "", awardOrAgreement: "", classification: "", superRatePercent: 12, withholdingRatePercent: 0, payFrequency:"weekly" as Employee["payFrequency"], taxResident:true, taxFreeThreshold:true, tfnProvided:true, studyLoan:false, annualLeaveAccrualPerHour: 0, personalLeaveAccrualPerHour: 0,
  });
  const [period, setPeriod] = useState({ start: "", end: "", payDate: today() });
  const [message, setMessage] = useState("");
  const [timesheetRevision, setTimesheetRevision] = useState(0);

  useEffect(() => { setStore(readPeople()); setReady(true); }, []);
  useEffect(() => { if (ready) { localStorage.setItem(LIFELINE_PEOPLE_KEY, JSON.stringify(store)); notifyBusinessDataChanged({domain:"people",entityType:"people-store",reason:"people-store-saved"}); } }, [store, ready]);
  useEffect(() => {
    const refresh = () => setTimesheetRevision((value) => value + 1);
    window.addEventListener("business-lifeline-operating-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("business-lifeline-operating-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const timesheets = useMemo(() => readTimesheets(), [store.payRuns.length, ready, timesheetRevision]);
  const activeEmployees = store.employees.filter((item) => item.active);
  const latestRun = store.payRuns[0];

  const addEmployee = (event: FormEvent) => {
    event.preventDefault();
    if (!employee.name.trim()) return;
    const next: Employee = {
      id: id("employee"), ...employee, name: employee.name.trim(),
      annualLeaveHours: 0, personalLeaveHours: 0, annualLeaveAccrualPerHour: employee.annualLeaveAccrualPerHour, personalLeaveAccrualPerHour: employee.personalLeaveAccrualPerHour, active: true,
    };
    setStore((current) => ({ ...current, employees: [next, ...current.employees] }));
    setEmployee({ name: "", email: "", employmentType: "full-time", hourlyRate: 0, ordinaryHoursPerWeek: 38, employerName: "", employerAbn: "", superFundName: "", awardOrAgreement: "", classification: "", superRatePercent: 12, withholdingRatePercent: 0, payFrequency:"weekly", taxResident:true, taxFreeThreshold:true, tfnProvided:true, studyLoan:false, annualLeaveAccrualPerHour: 0, personalLeaveAccrualPerHour: 0 });
  };

  const createPayRun = () => {
    if (!period.start || !period.end || !period.payDate || !activeEmployees.length) return;
    const lines: PayLine[] = activeEmployees.map((person) => {
      const matching = timesheets.filter((sheet) => sheet.person.trim().toLowerCase() === person.name.trim().toLowerCase() && sheet.date >= period.start && sheet.date <= period.end);
      const hours = matching.length
        ? round(matching.reduce((sum, sheet) => sum + hoursBetween(sheet.start, sheet.end, sheet.breakMinutes), 0))
        : round(person.ordinaryHoursPerWeek * Math.max(1, Math.round((new Date(period.end).getTime() - new Date(period.start).getTime()) / (7 * 86_400_000)) + 1));
      const components: PayComponent[] = [{ kind: "ordinary", description: "Ordinary hours", hours, rate: person.hourlyRate, qualifyingEarnings: true }];
      const tfnProvided=person.tfnProvided!==false,taxResident=person.taxResident!==false,taxFreeThreshold=person.taxFreeThreshold!==false; const scale=tfnProvided?(taxResident?(taxFreeThreshold?2:1):3):4; const payroll = calculatePayroll({...person,payg2026:{frequency:person.payFrequency||"weekly",scale,resident:taxResident,studyLoan:person.studyLoan===true,taxFreeThreshold,tfnProvided}}, components);
      return { employeeId: person.id, employeeName: person.name, hours, gross: payroll.gross, payg: payroll.payg, super: payroll.super, net: payroll.net, annualLeaveAccrued: round(hours * Number(person.annualLeaveAccrualPerHour || 0)), personalLeaveAccrued: round(hours * Number(person.personalLeaveAccrualPerHour || 0)), hourlyRate: person.hourlyRate, ordinaryGross: payroll.ordinaryGross, overtime: payroll.overtime, paidLeave: payroll.paidLeave, allowances: payroll.allowances, bonuses: payroll.bonuses, deductions: payroll.deductions, qualifyingEarnings: payroll.qualifyingEarnings };
    });
    const run: PayRun = { id: id("payrun"), periodStart: period.start, periodEnd: period.end, payDate: period.payDate, lines, status: "draft", createdAt: new Date().toISOString() };
    setStore((current) => ({ ...current, payRuns: [run, ...current.payRuns] }));
    setMessage("Draft pay run created. Review hours and withholding before finalising.");
  };

  const finalise = (run: PayRun) => {
    const gross = round(run.lines.reduce((sum, line) => sum + line.gross, 0));
    const payg = round(run.lines.reduce((sum, line) => sum + line.payg, 0));
    const superAmount = round(run.lines.reduce((sum, line) => sum + line.super, 0));
    const net = round(run.lines.reduce((sum, line) => sum + line.net, 0));
    const journal: LedgerJournal = {
      id: id("journal"), date: run.payDate, memo: "Payroll " + run.periodStart + " to " + run.periodEnd, source: "PEOPLE:PAYRUN:" + run.id,
      lines: payrollJournalLines({components:[],ordinaryGross:gross,overtime:0,paidLeave:0,allowances:0,bonuses:0,deductions:0,gross,payg,qualifyingEarnings:gross,super:superAmount,net,stp:{gross,overtime:0,paidLeave:0,allowances:0,bonuses:0,payg,super:superAmount}}),
    };
    if (!postJournal(journal)) { setMessage("Pay run could not be posted. Check the period lock or existing journal."); return; }
    setStore((current) => ({
      ...current,
      payRuns: current.payRuns.map((item) => item.id === run.id ? { ...item, status: "finalised" as const } : item),
      employees: current.employees.map((person) => {
        const line = run.lines.find((payLine) => payLine.employeeId === person.id);
        return line ? { ...person, annualLeaveHours: round(Number(person.annualLeaveHours || 0) + line.annualLeaveAccrued), personalLeaveHours: round(Number(person.personalLeaveHours || 0) + line.personalLeaveAccrued) } : person;
      }),
    }));
    setMessage("Pay run finalised into Lifeline Books.");
  };

  const markPaid = (run: PayRun) => {
    const net = round(run.lines.reduce((sum, line) => sum + line.net, 0));
    const journal: LedgerJournal = {
      id: id("journal"), date: run.payDate, memo: "Payroll payment " + run.periodEnd, source: "PEOPLE:PAYMENT:" + run.id,
      lines: [{ account: "Payroll Clearing", side: "debit", amount: net }, { account: "Bank", side: "credit", amount: net }],
    };
    if (!postJournal(journal)) { setMessage("Payroll payment could not be posted."); return; }
    setStore((current) => ({ ...current, payRuns: current.payRuns.map((item) => item.id === run.id ? { ...item, status: "paid" as const } : item) }));
    setMessage("Payroll payment posted to Lifeline Books.");
  };

  const printPayslip = (run: PayRun, line: PayLine) => {
    const person = store.employees.find((item) => item.id === line.employeeId);
    const win = window.open("", "_blank", "width=760,height=900");
    if (!win) return;
    win.document.write(`<html><head><title>Draft payroll statement - ${line.employeeName}</title><style>body{font-family:Arial;padding:44px;color:#173244}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #ccd8de;padding:14px;border-radius:10px}h1{margin-bottom:4px}.total{font-size:22px;font-weight:700}</style></head><body><h1>Lifeline People · Draft payroll statement</h1><p>${line.employeeName}<br>Period ${run.periodStart} to ${run.periodEnd}<br>Pay date ${run.payDate}</p><div class="grid"><div class="box"><strong>Hours</strong><br>${line.hours}</div><div class="box"><strong>Hourly rate</strong><br>${money(line.hourlyRate)}</div><div class="box"><strong>Gross</strong><br>${money(line.gross)}</div><div class="box"><strong>PAYG withheld</strong><br>${money(line.payg)}</div><div class="box"><strong>Super</strong><br>${money(line.super)}</div><div class="box"><strong>Net pay</strong><br><span class="total">${money(line.net)}</span></div><div class="box"><strong>Annual leave balance</strong><br>${person?.annualLeaveHours ?? 0} hrs</div><div class="box"><strong>Personal leave balance</strong><br>${person?.personalLeaveHours ?? 0} hrs</div></div><p>${person?.employerName || "Employer"} · ABN ${person?.employerAbn || "not recorded"} · ${person?.awardOrAgreement || "Award/agreement not recorded"} · ${person?.classification || "Classification not recorded"}<br>Super fund: ${person?.superFundName || "not recorded"}</p><p>Prepared by Business Lifeline for payroll review only. This is not represented as a Fair Work-complete statutory pay slip until employer ABN, required allowances/loadings/penalties/deductions, super fund details and all applicable award/tax rules have been validated.</p><script>window.print()</script></body></html>`);
    win.document.close();
  };

  const totals = latestRun ? {
    gross: latestRun.lines.reduce((sum, line) => sum + line.gross, 0),
    payg: latestRun.lines.reduce((sum, line) => sum + line.payg, 0),
    super: latestRun.lines.reduce((sum, line) => sum + line.super, 0),
    net: latestRun.lines.reduce((sum, line) => sum + line.net, 0),
  } : { gross: 0, payg: 0, super: 0, net: 0 };

  return <section className="lifeline-product">
    <header className="lifeline-product-hero"><div><p className="eyebrow">LIFELINE PEOPLE</p><h2>People, time and payroll preparation in the same operating record.</h2><p>Timesheets flow into pay runs; finalised payroll posts wages, PAYG, super and clearing liabilities directly into Lifeline Books.</p></div><div className="lifeline-integrity good"><strong>{activeEmployees.length} active people</strong><span>{timesheets.length} recorded timesheets</span></div></header>
    {message && <div className="os-notice"><span>{message}</span><button onClick={() => setMessage("")}>Dismiss</button></div>}

    <section className="metric-grid">
      <article><span>Latest gross payroll</span><strong>{money(totals.gross)}</strong></article>
      <article><span>PAYG prepared</span><strong>{money(totals.payg)}</strong></article>
      <article><span>Super prepared</span><strong>{money(totals.super)}</strong></article>
      <article><span>Net payroll</span><strong>{money(totals.net)}</strong></article>
    </section>

    <div className="lifeline-report-grid">
      <form className="panel fields" onSubmit={addEmployee}><p className="eyebrow">EMPLOYEES</p><h3>Add a person</h3>
        <label className="field"><span>Name</span><input value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} required /></label>
        <label className="field"><span>Email</span><input type="email" value={employee.email} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} /></label>
        <label className="field"><span>Employment type</span><select value={employee.employmentType} onChange={(e) => setEmployee({ ...employee, employmentType: e.target.value as Employee["employmentType"] })}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="casual">Casual</option><option value="contractor">Contractor</option></select></label>
        <label className="field"><span>Hourly rate</span><input type="number" min="0" step="0.01" value={employee.hourlyRate || ""} onChange={(e) => setEmployee({ ...employee, hourlyRate: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Ordinary hours / week</span><input type="number" min="0" step="0.1" value={employee.ordinaryHoursPerWeek} onChange={(e) => setEmployee({ ...employee, ordinaryHoursPerWeek: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Employer name</span><input value={employee.employerName} onChange={(e) => setEmployee({ ...employee, employerName: e.target.value })} /></label><label className="field"><span>Employer ABN</span><input value={employee.employerAbn} onChange={(e) => setEmployee({ ...employee, employerAbn: e.target.value })} /></label><label className="field"><span>Super fund</span><input value={employee.superFundName} onChange={(e) => setEmployee({ ...employee, superFundName: e.target.value })} /></label><label className="field"><span>Award / agreement</span><input value={employee.awardOrAgreement} onChange={(e) => setEmployee({ ...employee, awardOrAgreement: e.target.value })} /></label><label className="field"><span>Classification</span><input value={employee.classification} onChange={(e) => setEmployee({ ...employee, classification: e.target.value })} /></label><label className="field"><span>Super rate %</span><input type="number" min="0" step="0.1" value={employee.superRatePercent} onChange={(e) => setEmployee({ ...employee, superRatePercent: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Pay frequency</span><select value={employee.payFrequency} onChange={(e)=>setEmployee({...employee,payFrequency:e.target.value as Employee["payFrequency"]})}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select></label><label className="field"><span><input type="checkbox" checked={employee.taxResident} onChange={(e)=>setEmployee({...employee,taxResident:e.target.checked})}/> Australian resident for tax</span></label><label className="field"><span><input type="checkbox" checked={employee.tfnProvided} onChange={(e)=>setEmployee({...employee,tfnProvided:e.target.checked})}/> TFN provided</span></label><label className="field"><span><input type="checkbox" checked={employee.taxFreeThreshold} onChange={(e)=>setEmployee({...employee,taxFreeThreshold:e.target.checked})}/> Claims tax-free threshold</span></label><label className="field"><span><input type="checkbox" checked={employee.studyLoan} onChange={(e)=>setEmployee({...employee,studyLoan:e.target.checked})}/> HELP/VSL/other study or training loan</span></label><label className="field"><span>Fallback PAYG estimate %</span><input type="number" min="0" max="100" step="0.1" value={employee.withholdingRatePercent} onChange={(e) => setEmployee({ ...employee, withholdingRatePercent: Number(e.target.value) || 0 })} /></label><label className="field"><span>Annual leave accrued per ordinary hour</span><input type="number" min="0" step="0.0001" value={employee.annualLeaveAccrualPerHour} onChange={(e) => setEmployee({ ...employee, annualLeaveAccrualPerHour: Number(e.target.value) || 0 })} /></label><label className="field"><span>Personal leave accrued per ordinary hour</span><input type="number" min="0" step="0.0001" value={employee.personalLeaveAccrualPerHour} onChange={(e) => setEmployee({ ...employee, personalLeaveAccrualPerHour: Number(e.target.value) || 0 })} /></label>
        <button className="button primary">Add employee</button><small>Default super is 12% for the current Australian SG rate. From 1 July 2026 Payday Super generally requires SG to be paid on payday and received by the fund within 7 business days. Confirm qualifying earnings, exceptions, award, PAYG and entitlements before relying on a pay run.</small>
      </form>

      <section className="panel"><p className="eyebrow">PEOPLE REGISTER</p><h3>Employees and leave balances</h3><div className="item-list">
        {store.employees.map((person) => <article key={person.id}><div><strong>{person.name}</strong><span>{person.employmentType} · {money(person.hourlyRate)}/hr · {person.ordinaryHoursPerWeek} hrs/week</span><small>Annual leave {person.annualLeaveHours} hrs · Personal leave {person.personalLeaveHours} hrs</small></div><button type="button" onClick={() => setStore((current) => ({ ...current, employees: current.employees.map((item) => item.id === person.id ? { ...item, active: !item.active } : item) }))}>{person.active ? "Deactivate" : "Reactivate"}</button></article>)}
      </div></section>
    </div>

    <section className="panel"><div className="section-heading"><span>PAY RUN</span><h3>Create from Lifeline timesheets</h3></div>
      <div className="fields money-fields"><label className="field"><span>Period start</span><input type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} /></label><label className="field"><span>Period end</span><input type="date" value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} /></label><label className="field"><span>Pay date</span><input type="date" value={period.payDate} onChange={(e) => setPeriod({ ...period, payDate: e.target.value })} /></label></div>
      <button className="button primary" type="button" onClick={createPayRun}>Create draft pay run</button>
    </section>

    <section className="panel"><div className="section-heading"><span>PAY HISTORY</span><h3>Pay runs and accounting status</h3></div><div className="item-list">
      {store.payRuns.map((run) => <article key={run.id}><div><strong>{run.periodStart} → {run.periodEnd}</strong><span>Pay {run.payDate} · {run.lines.length} people · {run.status}</span><small>Gross {money(run.lines.reduce((sum, line) => sum + line.gross, 0))} · PAYG {money(run.lines.reduce((sum, line) => sum + line.payg, 0))} · Super {money(run.lines.reduce((sum, line) => sum + line.super, 0))} · Net {money(run.lines.reduce((sum, line) => sum + line.net, 0))}</small>{run.status !== "draft" && <div>{run.lines.map((line) => <button key={line.employeeId} type="button" className="button ghost" onClick={() => printPayslip(run, line)}>Draft payroll statement · {line.employeeName}</button>)}</div>}</div><div>{run.status === "draft" && <button type="button" onClick={() => finalise(run)}>Finalise to Books</button>}{run.status === "finalised" && <button type="button" onClick={() => markPaid(run)}>Mark paid</button>}</div></article>)}
    </div></section>

    <aside className="urgent"><b>Payroll boundary</b><p>Lifeline People prepares payroll and accounting liabilities. Direct STP submission, award interpretation and statutory tax calculations require validated rules/approved lodgement rails before production use.</p></aside>
  </section>;
}
