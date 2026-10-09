import type { BusinessData, BusinessReport } from "./types";

export type RepairStep = { title: string; detail: string; done: boolean; completedAt?: string };
export type RepairBlueprint = {
  id: string;
  title: string;
  area: string;
  reason: string;
  evidence: string[];
  metric: string;
  steps: ReadonlyArray<{ title: string; detail: string }>;
  relevant: boolean;
  referral?: string;
};
export type RepairProject = {
  id: string;
  blueprintId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
  dueDate: string;
  baseline: string;
  target: string;
  current: string;
  metric: string;
  evidenceConfirmed: boolean;
  finding: string;
  notes: string;
  status: "draft" | "in-progress" | "review" | "completed";
  steps: RepairStep[];
};
export type RepairStore = { version: 1; projects: RepairProject[] };
export const REPAIR_STORAGE_PREFIX = "business-lifeline-repair-projects-v1:";

export function repairStorageKey(accountId: string, businessName: string) {
  const normalised = businessName.toLowerCase().normalize("NFKC").trim().replace(/[^a-z0-9]+/g, "-").slice(0, 90) || "business";
  return REPAIR_STORAGE_PREFIX + encodeURIComponent(accountId || "guest") + ":" + normalised;
}

// Templates are candidates for investigation, NOT diagnoses or unverified root causes.
// Keep professional/regulated work out of operational implementation.
export function buildRepairBlueprints(data: BusinessData, report: BusinessReport): RepairBlueprint[] {
  const operations = (data.industry + " " + data.biggestProblem + " " + data.immediateGoal).toLowerCase();
  const usesQuotes = /trad|mechanic|landscap|building|construct|maintenance|clean|repair|job|quot|service|install|fabricat/.test(operations);
  const hasStock = /shop|retail|stock|inventor|supplier|warehouse|hospitality|cafe|restaurant|takeaway/.test(operations);
  const stretched = report.metrics.operatingMargin < 10;
  const overdue = data.overdueInvoices > 0;
  const declining = data.revenueTrend === "declining";
  const costs = report.metrics.expenseRatio >= 80;
  const workflow = /late|delay|miss|organis|process|schedule|staff|busy|time|chaos|overwork/.test(operations);
  const cashRisk = report.metrics.runwayMonths !== null && report.metrics.runwayMonths < 3;
  const plans: RepairBlueprint[] = [
    {
      id: "quote-profitability", title: "Improve quoting and job costing", area: "Sales and margins",
      reason: stretched ? "The reported operating margin is low. Quoting accuracy is one possible area to investigate, not an established cause." : "Use when the owner reports quoting delays or jobs coming in below expected margin.",
      evidence: ["Three recent quotes and their scope", "Actual labour, materials and subcontractor costs for matching jobs", "Approved variations and rework time"],
      metric: "Quoted versus actual job margin (like-for-like completed jobs)",
      relevant: usesQuotes || stretched,
      steps: [
        { title: "Compare three completed jobs", detail: "Match quote scope, original assumptions, actual direct costs, approved variations and final invoice. Check GST treatment." },
        { title: "Document the quoting checklist", detail: "Include labour hours, material quantities, supplier pricing, travel, overhead treatment, contingency and approvals." },
        { title: "Test the checklist on a new quote", detail: "Use the existing Lifeline quotes/jobs tools or the owner's system; get owner approval before sending anything." },
        { title: "Review job results", detail: "Compare estimated and actual costs after completion and update the checklist based on verified differences." },
      ],
    },
    {
      id: "receivables", title: "Improve invoice follow-up", area: "Cash collections",
      reason: overdue ? "The owner reported overdue customer invoices. Causes and collectability remain unverified." : "Use if the owner wants more consistent invoicing and payment follow-up.",
      evidence: ["Current invoice ageing", "Agreed payment terms and disputed balances", "Dates invoices were sent and payments received"],
      metric: "Overdue receivables and average days to payment",
      relevant: overdue,
      steps: [
        { title: "Check invoice accuracy", detail: "Confirm each selected overdue invoice is genuine, correctly addressed, undisputed and past its actual due date." },
        { title: "Set a repeatable reminder schedule", detail: "Draft polite payment reminders with correct invoice references; the owner reviews and sends them." },
        { title: "Assign weekly follow-up ownership", detail: "Record who checks overdue invoices, records responses and escalates disputes appropriately." },
        { title: "Measure collections", detail: "Compare aged balances and collection timing after 30 days without assuming every delay was a process failure." },
      ],
    },
    {
      id: "cost-controls", title: "Review avoidable operating costs", area: "Expenses",
      reason: costs ? "The entered expenses consume a high proportion of reported revenue. Verify categories and essential costs first." : "Use for an owner-requested review of subscriptions, supplier pricing and avoidable waste.",
      evidence: ["Three months of grouped operating expenses", "Supplier agreements and cancellation conditions", "Owner-approved list of essential and discretionary costs"],
      metric: "Comparable monthly controllable operating expenses",
      relevant: costs,
      steps: [
        { title: "Classify costs", detail: "Separate essential wages, compliance, insurance and revenue-producing costs from discretionary spending." },
        { title: "Investigate the largest variances", detail: "Check actual invoices, frequency and supplier terms; do not cut obligations blindly." },
        { title: "Agree reversible improvements", detail: "Seek owner approval for process changes and supplier comparisons; refer legal/tax/industrial matters to specialists." },
        { title: "Review the impact", detail: "Compare matching expense periods and confirm service quality or delivery was not damaged." },
      ],
    },
    {
      id: "sales-followup", title: "Improve lead and quote follow-up", area: "Sales",
      reason: declining ? "The owner reports declining revenue, which has multiple possible causes including seasonality and customer mix." : "Use to test lead handling and existing customer follow-up with appropriate permission.",
      evidence: ["Enquiries, quotes and accepted jobs by week", "Lost quote reasons where recorded", "Repeat customer and referral figures"],
      metric: "Qualified lead-to-accepted-quote conversion",
      relevant: declining || /customer|lead|sale|marketing|quote/.test(operations),
      steps: [
        { title: "Map the sales process", detail: "Track enquiry, qualification, quote, response, acceptance and handover." },
        { title: "Find actual drop-off points", detail: "Compare recent counts and conversion using the same period; check why quotes were lost." },
        { title: "Introduce an owner-approved follow-up cadence", detail: "Use CRM tasks and reminders rather than unsolicited or non-compliant messaging." },
        { title: "Measure against baseline", detail: "Record conversion and response timing over an agreed review period." },
      ],
    },
    {
      id: "stock-control", title: "Reduce stock errors and waste", area: "Inventory",
      reason: "Stock controls may help if the business handles physical inventory; first confirm a real issue exists.",
      evidence: ["Current stock count and valuation", "Recent stock variances, spoilage or write-offs", "Purchase orders, lead times and reorder practices"],
      metric: "Stock variance and verified stockholding cost",
      relevant: hasStock,
      steps: [
        { title: "Count a sample of important items", detail: "Compare physical counts with the stock register; investigate discrepancies rather than writing off balances immediately." },
        { title: "Review reorder decisions", detail: "Check demand, lead times, minimum orders and cash requirements." },
        { title: "Standardise receiving and stocktake steps", detail: "Set responsibilities, simple locations/bin labels and variance approvals using the existing stock tools." },
        { title: "Recount and review", detail: "Compare error rates and waste after a consistent review period." },
      ],
    },
    {
      id: "work-scheduling", title: "Fix scheduling and handover delays", area: "Operations",
      reason: "Review whether missed handovers, unclear priorities or scheduling actually cause rework or delays.",
      evidence: ["Recent jobs and promised completion dates", "Who owns approvals and customer updates", "Rework, missed appointments and delays"],
      metric: "On-time completion rate or documented rework hours",
      relevant: workflow,
      steps: [
        { title: "Trace three jobs end-to-end", detail: "List each handover, delay and approval with evidence and staff input." },
        { title: "Create a standard workflow", detail: "Set job stages, responsible person, due date, exception route and completion checklist." },
        { title: "Test the new workflow", detail: "Trial on a small number of jobs and get staff and owner feedback." },
        { title: "Check operational results", detail: "Compare delays and rework without confusing seasonality or job complexity with improvement." },
      ],
    },
    {
      id: "cash-visibility", title: "Introduce a weekly cash-control routine", area: "Cash",
      reason: cashRisk ? "Reported cash runway is short; the inputs and obligations must be checked urgently." : "Useful where the owner lacks a reliable weekly cash view.",
      evidence: ["Actual cash collected and paid, not just invoiced sales", "Upcoming wages, tax, supplier and debt due dates", "Bank balances and existing available facilities"],
      metric: "Weekly cash forecast versus actual receipts and payments",
      relevant: cashRisk || report.metrics.cashFlowBasis !== "cash-receipts-payments",
      referral: "If debts may not be paid as they fall due, or wages/super/tax/legal demands are overdue, stop operational-only advice and refer promptly to qualified advisers.",
      steps: [
        { title: "Confirm starting cash and due dates", detail: "Verify cash, committed payments, expected receipts and missing liabilities with the owner." },
        { title: "Set up the 13-week forecast", detail: "Use Cashflow & Accuracy Boost and mark each amount as confirmed or estimated." },
        { title: "Agree weekly variance checks", detail: "Compare actual incoming/outgoing cash to the forecast. No automatic borrowing or payment promises." },
        { title: "Escalate serious warnings", detail: "Seek suitable accountant, lawyer, registered tax agent or restructuring practitioner assistance when appropriate." },
      ],
    },
  ];
  return plans.sort((a,b) => Number(b.relevant) - Number(a.relevant));
}

export function createRepairProject(plan: RepairBlueprint, now = new Date(), id = crypto.randomUUID()): RepairProject {
  return {
    id, blueprintId: plan.id, title: plan.title, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    owner: "Business owner", dueDate: "", baseline: "", target: "", current: "", metric: plan.metric,
    evidenceConfirmed: false, finding: "", notes: "", status: "draft",
    steps: plan.steps.map(step => ({ ...step, done: false })),
  };
}

export function readRepairStore(storage: Pick<Storage, "getItem">, key: string): RepairStore {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) || "null");
    if (!parsed || typeof parsed !== "object") return { version: 1, projects: [] };
    const value = parsed as Partial<RepairStore>;
    if (value.version !== 1 || !Array.isArray(value.projects)) return { version: 1, projects: [] };
    const projects = value.projects.filter((p): p is RepairProject => Boolean(
      p && typeof p.id === "string" && typeof p.title === "string" && typeof p.owner === "string" &&
      Array.isArray(p.steps) && p.steps.every(s => s && typeof s.title === "string" && typeof s.done === "boolean")
    ));
    return { version: 1, projects };
  } catch { return { version: 1, projects: [] }; }
}

export function repairProgress(project: RepairProject) {
  const done = project.steps.filter(step => step.done).length;
  return { completed: done, total: project.steps.length, percent: project.steps.length ? Math.round(100 * done / project.steps.length) : 0 };
}
