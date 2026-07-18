"use client";

import { useState } from "react";
import type { BusinessData } from "@/lib/types";

type Template = { title: string; purpose: string; body: (data: BusinessData) => string };

const currencyFor = (country: string) => country.toLowerCase().includes("australia") ? "AUD" : "USD";
const money = (value: number, country: string) => new Intl.NumberFormat("en", { style: "currency", currency: currencyFor(country), maximumFractionDigits: 0 }).format(value);
const nextBusinessDay = () => {
  const date = new Date();
  date.setDate(date.getDate() + (date.getDay() === 5 ? 3 : date.getDay() === 6 ? 2 : 1));
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(date);
};
const weeklyOffer = (amount: number) => Math.max(50, Math.ceil((amount / 12) / 10) * 10);

const templates: Template[] = [
  { title: "Overdue invoice follow-up", purpose: "Collect overdue customer payments without damaging the relationship.", body: (data) => `Subject: Payment required — overdue account with ${data.businessName}\n\nHi [Customer name],\n\nI’m following up on your overdue account with ${data.businessName}. Our records show overdue customer invoices totalling ${money(data.overdueInvoices, data.country)}.\n\nPlease arrange payment or confirm a firm payment date by ${nextBusinessDay()}. If there is a genuine issue with the invoice, reply today so we can resolve it quickly.\n\nPayment details: [bank details]\nReference: [invoice number]\n\nThanks,\n${data.businessName}` },
  { title: "Supplier payment-plan request", purpose: "Ask a key supplier for breathing room while protecting the trading relationship.", body: (data) => `Subject: Proposed temporary payment arrangement — ${data.businessName}\n\nHi [Supplier name],\n\nI want to address our outstanding supplier balance early and directly. ${data.businessName} currently has approximately ${money(data.overdueSuppliers, data.country)} in overdue supplier commitments.\n\nI propose an initial payment of ${money(Math.min(data.cashAvailable * 0.1, weeklyOffer(data.overdueSuppliers)), data.country)} on ${nextBusinessDay()}, followed by weekly payments of ${money(weeklyOffer(data.overdueSuppliers), data.country)} until the account is current.\n\nPlease confirm whether this arrangement is acceptable or suggest an alternative that both parties can realistically maintain.\n\nRegards,\n${data.businessName}` },
  { title: "ATO payment-arrangement request", purpose: "Prepare an Australian tax-debt call with the figures already organised.", body: (data) => `I’m calling from ${data.businessName} about overdue tax of approximately ${money(data.overdueTax, data.country)}. I want to deal with it before the position worsens.\n\nThe business currently has monthly revenue of ${money(data.monthlyRevenue, data.country)}, monthly operating commitments of approximately ${money(data.fixedExpenses + data.variableExpenses + data.ownerDrawings + data.loanRepayments, data.country)}, and available cash of ${money(data.cashAvailable, data.country)}.\n\nI’m requesting a sustainable payment arrangement. I can propose an initial payment of ${money(Math.min(data.cashAvailable * 0.1, weeklyOffer(data.overdueTax)), data.country)} followed by weekly payments of ${money(weeklyOffer(data.overdueTax), data.country)}.\n\nWhat information or lodgements must be completed for this request to be assessed? I understand the ATO must approve any arrangement and that interest or other obligations may continue.` },
  { title: "Bank repayment renegotiation", purpose: "Request temporary relief before a repayment is missed.", body: (data) => `Subject: Request for temporary business-loan hardship support\n\nHi [Bank contact],\n\nI’m contacting you on behalf of ${data.businessName} before our position deteriorates. Current monthly loan repayments are ${money(data.loanRepayments, data.country)}, available cash is ${money(data.cashAvailable, data.country)}, and our immediate priority is ${data.immediateGoal || "to stabilise cash flow"}.\n\nPlease review whether a temporary repayment reduction, interest-only period, term extension, or short deferral is available. I can provide current financial figures and a 90-day recovery plan.\n\nPlease confirm the documents required and the earliest time we can discuss a workable arrangement.\n\nRegards,\n${data.businessName}` },
  { title: "Landlord rent-deferral request", purpose: "Open a direct negotiation before rent arrears escalate.", body: (data) => `Subject: Temporary rent arrangement request — ${data.businessName}\n\nHi [Landlord or property manager],\n\n${data.businessName} is experiencing short-term cash-flow pressure and I want to address the rent position before it worsens. We are implementing a 90-day recovery plan focused on cash collection, cost reduction, and revenue stability.\n\nI’m requesting a temporary arrangement from ${nextBusinessDay()}: [reduced payment or deferral requested], with the deferred amount repaid over [number] months once trading stabilises.\n\nI’m available to provide supporting figures and agree the arrangement in writing. Please let me know a suitable time to discuss it.\n\nRegards,\n${data.businessName}` },
  { title: "Emergency cost-cutting checklist", purpose: "Run a controlled seven-day spending freeze without cutting blindly.", body: (data) => `${data.businessName} — 7-DAY EMERGENCY COST REVIEW\n\nCurrent monthly fixed expenses: ${money(data.fixedExpenses, data.country)}\nCurrent monthly variable expenses: ${money(data.variableExpenses, data.country)}\nOwner drawings: ${money(data.ownerDrawings, data.country)}\n\nTODAY\n☐ Freeze non-essential purchases and subscriptions\n☐ List every automatic payment due in the next 14 days\n☐ Pause discretionary owner drawings where safely possible\n☐ Contact suppliers before missing any commitment\n☐ Protect payroll, essential utilities, insurance, tax lodgements, and revenue-producing work\n\nWITHIN 48 HOURS\n☐ Cancel unused software, memberships, storage, and advertising\n☐ Renegotiate freight, phone, internet, finance, and supplier terms\n☐ Identify stock or assets that can be sold without damaging core operations\n☐ Stop low-margin work that consumes cash\n☐ Set a weekly cash ceiling and require approval for exceptions\n\nDo not cancel insurance, ignore employee obligations, stop required tax lodgements, or dispose of secured assets without appropriate professional advice.` },
  { title: "Weekly team update", purpose: "Give staff a calm, honest update without creating unnecessary panic.", body: (data) => `Team,\n\nWe are tightening operations at ${data.businessName} and focusing on the work that protects customers, cash, and delivery.\n\nThis week our priorities are:\n1. Improve cash collection and resolve overdue customer accounts.\n2. Avoid non-essential spending and flag commitments before they are made.\n3. Focus effort on profitable, deliverable work that supports our immediate goal: ${data.immediateGoal || "stabilise the business"}.\n\nPlease raise problems early and report any customer or supplier issue that could affect delivery or payment. I’ll provide another update in seven days.` },
];

export function BusinessTemplates({ data }: { data: BusinessData }) {
  const [copied, setCopied] = useState("");

  const copy = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.body(data));
      setCopied(template.title);
      window.setTimeout(() => setCopied(""), 2200);
    } catch {
      setCopied("");
    }
  };

  return (
    <section className="business-templates no-print">
      <div className="section-heading"><span>Ready-to-use templates</span><h3>Handle difficult conversations faster</h3></div>
      <p className="template-note">Amounts and business details are pre-filled from the MRI. Review every message before sending and replace only the remaining recipient-specific details.</p>
      <div className="template-grid">
        {templates.map((template) => (
          <article className="panel" key={template.title}>
            <h3>{template.title}</h3><p>{template.purpose}</p>
            <details><summary>Preview template</summary><pre>{template.body(data)}</pre></details>
            <button className="button ghost" type="button" onClick={() => copy(template)}>{copied === template.title ? "✓ Copied" : "Copy template"}</button>
          </article>
        ))}
      </div>
      {copied && <div className="copy-toast" role="status" aria-live="polite">✓ {copied} copied to clipboard</div>}
    </section>
  );
}
