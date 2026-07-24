"use client";

import { useEffect, useMemo, useState } from "react";
import { assessMriAccuracyProfile, emptyMriAccuracyProfile, type MriAccuracyProfile } from "@/lib/mri-accuracy-profile";
import type { BusinessData } from "@/lib/types";

const numberFields: Array<{ key: keyof MriAccuracyProfile; label: string; help: string }> = [
  { key: "monthlyWages", label: "Monthly wages", help: "Gross wages normally paid each month." },
  { key: "monthlySuper", label: "Monthly super", help: "Normal monthly superannuation obligation." },
  { key: "paygOutstanding", label: "Outstanding PAYG", help: "PAYG currently overdue or unpaid." },
  { key: "accountsPayable", label: "Total accounts payable", help: "All supplier and creditor bills currently owed." },
  { key: "nextThirtyDayCreditors", label: "Due in the next 30 days", help: "Known creditor payments falling due within 30 days." },
  { key: "overdraftLimit", label: "Overdraft limit", help: "Approved overdraft limit, not the amount already used." },
  { key: "availableFacilities", label: "Other available facilities", help: "Undrawn approved finance genuinely available now." },
  { key: "securedDebt", label: "Secured debt", help: "Debt secured against business or personal assets." },
  { key: "unsecuredDebt", label: "Unsecured debt", help: "Business debt without specific security." },
  { key: "largestCustomerPercent", label: "Largest customer share (%)", help: "Approximate percentage of revenue from the largest customer." },
  { key: "ownerLoansToBusiness", label: "Owner loans into business", help: "Money the business owes the owner." },
  { key: "ownerLoansFromBusiness", label: "Owner loans from business", help: "Money the owner owes the business." },
  { key: "oneOffIncome", label: "Known one-off income", help: "Non-recurring cash expected soon." },
  { key: "oneOffExpenses", label: "Known one-off expenses", help: "Non-recurring costs expected soon." },
];

export function MriAccuracyProfilePanel({ data }: { data: BusinessData }) {
  const storageKey = `business-lifeline-accuracy-profile-v1:${data.businessName.trim().toLowerCase() || "current"}`;
  const [profile, setProfile] = useState<MriAccuracyProfile>(emptyMriAccuracyProfile());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setProfile({ ...emptyMriAccuracyProfile(), ...JSON.parse(raw) });
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const assessment = useMemo(() => assessMriAccuracyProfile(profile), [profile]);
  const setNumber = (key: keyof MriAccuracyProfile, value: string) => setProfile((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify(profile));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <section className="panel mri-accuracy-profile no-print" aria-labelledby="accuracy-profile-title">
      <div className="section-heading"><span>Business MRI · Accuracy Inputs V2</span><h3 id="accuracy-profile-title">Improve the accuracy without repeating the MRI</h3></div>
      <p className="template-note">This optional section captures obligations and risks that average monthly figures can hide. Complete what you know now and update it later.</p>

      <div className="metric-grid">
        <article><span>Accuracy profile</span><strong>{assessment.confidence}%</strong><small>Completion confidence</small></article>
        <article><span>Additional warnings</span><strong>{assessment.risks.length}</strong><small>From the deeper inputs</small></article>
      </div>

      <div className="fields">
        <div className="two-cols">
          <label className="field"><span>Business structure</span><select value={profile.businessStructure} onChange={(event) => setProfile((current) => ({ ...current, businessStructure: event.target.value as MriAccuracyProfile["businessStructure"] }))}><option value="unknown">Not confirmed</option><option value="sole-trader">Sole trader</option><option value="company">Company</option><option value="partnership">Partnership</option><option value="trust">Trust</option><option value="other">Other</option></select></label>
          <label className="field"><span>GST basis used in MRI</span><select value={profile.gstBasis} onChange={(event) => setProfile((current) => ({ ...current, gstBasis: event.target.value as MriAccuracyProfile["gstBasis"] }))}><option value="unknown">Not confirmed</option><option value="inclusive">GST inclusive</option><option value="exclusive">GST exclusive</option><option value="not-registered">Not GST registered</option></select></label>
        </div>

        <details open>
          <summary>Payroll, tax and creditors</summary>
          <div className="money-fields">{numberFields.slice(0, 5).map((field) => <label className="field" key={String(field.key)}><span>{field.label}</span><div className="money-input"><span>$</span><input type="number" min="0" step="any" value={profile[field.key] as number} onChange={(event) => setNumber(field.key, event.target.value)} /></div><small>{field.help}</small></label>)}</div>
        </details>

        <details>
          <summary>Facilities, debt and guarantees</summary>
          <div className="money-fields">{numberFields.slice(5, 9).map((field) => <label className="field" key={String(field.key)}><span>{field.label}</span><div className="money-input"><span>$</span><input type="number" min="0" step="any" value={profile[field.key] as number} onChange={(event) => setNumber(field.key, event.target.value)} /></div><small>{field.help}</small></label>)}</div>
          <fieldset><legend>Personal guarantees</legend><div className="checks"><label><input type="radio" name="guarantees" checked={profile.personalGuarantees === true} onChange={() => setProfile((current) => ({ ...current, personalGuarantees: true }))} /><span>Yes</span></label><label><input type="radio" name="guarantees" checked={profile.personalGuarantees === false} onChange={() => setProfile((current) => ({ ...current, personalGuarantees: false }))} /><span>No</span></label><label><input type="radio" name="guarantees" checked={profile.personalGuarantees === null} onChange={() => setProfile((current) => ({ ...current, personalGuarantees: null }))} /><span>Not sure</span></label></div></fieldset>
        </details>

        <details>
          <summary>Seasonality, concentration and one-off items</summary>
          <div className="two-cols"><label className="field"><span>Seasonality</span><select value={profile.seasonality} onChange={(event) => setProfile((current) => ({ ...current, seasonality: event.target.value as MriAccuracyProfile["seasonality"] }))}><option value="unknown">Not confirmed</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>{numberFields.slice(9).map((field) => <label className="field" key={String(field.key)}><span>{field.label}</span><div className="money-input">{field.key === "largestCustomerPercent" ? null : <span>$</span>}<input type="number" min="0" max={field.key === "largestCustomerPercent" ? 100 : undefined} step="any" value={profile[field.key] as number} onChange={(event) => setNumber(field.key, event.target.value)} /></div><small>{field.help}</small></label>)}</div>
        </details>
      </div>

      {assessment.risks.length > 0 && <aside className="urgent" role="status"><b>Additional matters to review</b><ul>{assessment.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul></aside>}
      <div className="form-actions"><button type="button" className="button primary" onClick={save}>Save accuracy profile</button>{saved && <p role="status">Saved in this browser.</p>}</div>
    </section>
  );
}
