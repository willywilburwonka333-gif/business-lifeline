"use client";

import { useMemo, useState } from "react";
import type { BusinessData, BusinessReport } from "@/lib/types";
import { coachProgress, readCoachCheckIn, writeCoachCheckIn, type CoachCheckIn } from "@/lib/recovery-coach";

const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : country.toLowerCase().includes("new zealand") ? "NZD" : country.toLowerCase().includes("united kingdom") ? "GBP" : country.toLowerCase().includes("canada") ? "CAD" : "USD";
const money = (value: number, country: string) => new Intl.NumberFormat("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0 }).format(value);

export function RecoveryCoach({ data, report }: { data: BusinessData; report: BusinessReport }) {
  const [checkIn, setCheckIn] = useState<CoachCheckIn>(readCoachCheckIn);
  const [saved, setSaved] = useState(false);
  const progress = coachProgress(checkIn, report);
  const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(checkIn.startedAt).getTime()) / 86400000));
  const totalCashImprovement = checkIn.invoicesCollected + checkIn.obligationsPaid;
  const shouldRerun = elapsedDays >= 7 || totalCashImprovement > 0 || checkIn.monthlySavingsFound > 0 || progress >= 60;
  const currency = currencyFor(data.country);
  const currencyPrefix = currency === "AUD" ? "A$" : currency === "NZD" ? "NZ$" : currency === "USD" ? "$" : currency === "CAD" ? "C$" : "£";

  const prompts = useMemo(() => {
    const items: string[] = [];
    if (data.overdueInvoices > 0 && !checkIn.contactedCustomers) items.push(`Call overdue customers about ${money(data.overdueInvoices, data.country)} still outstanding.`);
    if (data.overdueTax > 0 && !checkIn.contactedTaxAuthority) items.push(`Contact the ATO or your tax agent about ${money(data.overdueTax, data.country)} overdue tax.`);
    if (data.overdueSuppliers > 0 && !checkIn.contactedSuppliers) items.push(`Contact key suppliers before ${money(data.overdueSuppliers, data.country)} in arrears becomes harder to negotiate.`);
    if (!checkIn.frozeSpending) items.push("Freeze non-essential spending and owner drawings for seven days.");
    if (report.urgentHelp && !checkIn.soughtProfessionalHelp) items.push("Contact a qualified accountant, turnaround adviser, lawyer, or registered insolvency professional today.");
    return items.slice(0, 3);
  }, [checkIn, data, report]);

  const update = <K extends keyof CoachCheckIn>(key: K, value: CoachCheckIn[K]) => {
    setCheckIn((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    const next = { ...checkIn, updatedAt: new Date().toISOString() };
    writeCoachCheckIn(next);
    setCheckIn(next);
    setSaved(true);
  };

  return <section className="recovery-coach no-print" aria-labelledby="recovery-coach-title">
    <div className="section-heading"><span>Stage 3 · Recovery Coach</span><h3 id="recovery-coach-title">Turn advice into weekly follow-through</h3></div>
    <div className="coach-overview">
      <article><span>Coach progress</span><strong>{progress}%</strong><small>{progress >= 80 ? "Strong follow-through" : progress >= 50 ? "Recovery is moving" : "Start with one action today"}</small></article>
      <article><span>Cash recovered or paid</span><strong>{money(totalCashImprovement, data.country)}</strong><small>Since this recovery cycle started</small></article>
      <article><span>Monthly savings found</span><strong>{money(checkIn.monthlySavingsFound, data.country)}</strong><small>Recurring improvement identified</small></article>
      <article><span>Next MRI</span><strong>{shouldRerun ? "Run now" : `In ${Math.max(1, 7 - elapsedDays)} days`}</strong><small>Update the figures when circumstances change</small></article>
    </div>
    {prompts.length > 0 && <div className="coach-priority"><p className="eyebrow">Your next coach prompts</p><ol>{prompts.map((item) => <li key={item}>{item}</li>)}</ol></div>}
    <div className="coach-grid">
      <fieldset className="coach-checklist"><legend>Actions completed</legend>
        {[["contactedCustomers", "Contacted overdue customers"],["contactedTaxAuthority", "Contacted the ATO or tax adviser"],["contactedSuppliers", "Contacted key suppliers"],["frozeSpending", "Froze non-essential spending"],["soughtProfessionalHelp", "Sought qualified professional advice"]].map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(checkIn[key as keyof CoachCheckIn])} onChange={(event) => update(key as keyof CoachCheckIn, event.target.checked as never)} /><span>{label}</span></label>)}
      </fieldset>
      <div className="coach-fields">
        <label><span>Overdue invoices collected</span><div className="money-input"><span>{currencyPrefix}</span><input type="number" min="0" value={checkIn.invoicesCollected} onChange={(event) => update("invoicesCollected", Math.max(0, Number(event.target.value) || 0))} /></div></label>
        <label><span>Tax, supplier or debt obligations paid</span><div className="money-input"><span>{currencyPrefix}</span><input type="number" min="0" value={checkIn.obligationsPaid} onChange={(event) => update("obligationsPaid", Math.max(0, Number(event.target.value) || 0))} /></div></label>
        <label><span>Monthly savings identified</span><div className="money-input"><span>{currencyPrefix}</span><input type="number" min="0" value={checkIn.monthlySavingsFound} onChange={(event) => update("monthlySavingsFound", Math.max(0, Number(event.target.value) || 0))} /></div></label>
      </div>
    </div>
    <label className="coach-notes"><span>What changed this week?</span><textarea value={checkIn.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Example: Landlord agreed to defer part of the rent. Collected two invoices. Sales are still soft." /></label>
    <div className="coach-footer"><div><b>{shouldRerun ? "Your figures have changed enough to run a fresh MRI." : "Keep completing the priority actions, then update your MRI after seven days."}</b><small>Started {new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(checkIn.startedAt))}</small></div><button className="button primary" type="button" onClick={save}>{saved ? "Check-in saved" : "Save weekly check-in"}</button></div>
  </section>;
}
