"use client";

import { useState } from "react";
import type { BusinessData } from "@/lib/types";

type Template = { title: string; purpose: string; body: (data: BusinessData) => string };

const templates: Template[] = [
  {
    title: "Overdue invoice follow-up",
    purpose: "Use this to collect overdue customer payments without damaging the relationship.",
    body: (data) => `Subject: Overdue invoice follow-up — ${data.businessName}\n\nHi [Customer name],\n\nI’m following up on invoice [number] for [amount], which is now overdue. Please confirm when payment will be made. If there is a problem with the invoice, let me know today so we can resolve it quickly.\n\nPayment details: [insert details]\n\nThanks,\n${data.businessName}`,
  },
  {
    title: "Supplier payment-plan request",
    purpose: "Ask a key supplier for breathing room while protecting the trading relationship.",
    body: (data) => `Subject: Request to agree a temporary payment plan\n\nHi [Supplier name],\n\n${data.businessName} is reviewing cash commitments and I want to address our outstanding balance early and directly. I propose paying [amount] on [date], followed by [amount/frequency] until the account is current.\n\nPlease let me know whether this arrangement is acceptable or suggest an alternative we can realistically maintain.\n\nRegards,\n${data.businessName}`,
  },
  {
    title: "Tax or creditor call script",
    purpose: "Prepare for a difficult call and keep the conversation focused on a workable arrangement.",
    body: (data) => `I’m calling from ${data.businessName}. I want to deal with the outstanding amount before the position worsens. The business currently has monthly revenue of approximately ${data.monthlyRevenue.toLocaleString()} and available cash of approximately ${data.cashAvailable.toLocaleString()}. I’m requesting a realistic payment arrangement. I can provide current figures and propose [amount] from [date]. What information do you need to assess this request?`,
  },
  {
    title: "Weekly team update",
    purpose: "Give staff a calm, honest update without creating unnecessary panic.",
    body: (data) => `Team,\n\nWe are tightening operations at ${data.businessName} and focusing on cash, customers, and the work that contributes most. This week our priorities are:\n1. [Priority]\n2. [Priority]\n3. [Priority]\n\nPlease raise problems early, avoid non-essential spending, and confirm any customer or supplier issue that could affect delivery or cash collection. I’ll provide another update on [date].`,
  },
];

export function BusinessTemplates({ data }: { data: BusinessData }) {
  const [copied, setCopied] = useState("");

  const copy = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.body(data));
      setCopied(template.title);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  };

  return (
    <section className="business-templates no-print">
      <div className="section-heading">
        <span>Ready-to-use templates</span>
        <h3>Handle difficult conversations faster</h3>
      </div>
      <div className="template-grid">
        {templates.map((template) => (
          <article className="panel" key={template.title}>
            <h3>{template.title}</h3>
            <p>{template.purpose}</p>
            <details>
              <summary>Preview template</summary>
              <pre>{template.body(data)}</pre>
            </details>
            <button className="button ghost" type="button" onClick={() => copy(template)}>
              {copied === template.title ? "Copied" : "Copy template"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
