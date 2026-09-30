export const lifelineSuite = [
  { id: "books", name: "Lifeline Books", purpose: "Double-entry accounting, receivables, payables and financial reporting." },
  { id: "bank", name: "Lifeline Bank", purpose: "Bank accounts, statement imports, reconciliation and cash controls." },
  { id: "tax", name: "Lifeline Tax", purpose: "GST/BAS preparation, tax obligations and tax-period controls." },
  { id: "pay", name: "Lifeline Pay", purpose: "Invoices, customer payments, recurring billing, instalments and refunds." },
  { id: "people", name: "Lifeline People", purpose: "Employees, timesheets, payroll preparation, leave, PAYG and super liabilities." },
  { id: "spend", name: "Lifeline Spend", purpose: "Supplier spend, purchase orders, expense claims, receipts and reimbursements." },
  { id: "assets", name: "Lifeline Assets", purpose: "Fixed assets, acquisition records and depreciation schedules." },
  { id: "plan", name: "Lifeline Plan", purpose: "Budgets, actuals and variance tracking from Lifeline Books." },
  { id: "plan", name: "Lifeline Plan", purpose: "Budgets, account targets, actual-vs-budget variance and rolling forecasts." },
  { id: "fx", name: "Lifeline FX", purpose: "Foreign-currency receivables, payables, settlement rates and exchange gains/losses." },
  { id: "sales", name: "Lifeline Sales", purpose: "CRM, quotes, pipeline, counter/market sales and customer history." },
  { id: "stock", name: "Lifeline Stock", purpose: "Products, stocktake, reorder controls, suppliers and inventory value." },
  { id: "jobs", name: "Lifeline Jobs", purpose: "Jobs, delivery workflow, tasks, appointments and work-to-invoice flow." },
  { id: "vault", name: "Lifeline Vault", purpose: "Business documents, source records, evidence and due-diligence files." },
  { id: "move", name: "Lifeline Move", purpose: "Import and migrate records from spreadsheets or previous business software." },
] as const;

export type LifelineSuiteId = typeof lifelineSuite[number]["id"];

export const nativeSuitePrinciples = [
  "Business Lifeline owns the canonical business record.",
  "One transaction should update operations, accounting, recovery, growth and exit evidence once.",
  "External software is optional migration/import infrastructure, not a dependency.",
  "Regulated lodgement and banking rails remain separable from the accounting engine.",
  "Every automated accounting entry must remain balanced, traceable and reversible by an audit entry.",
] as const;
