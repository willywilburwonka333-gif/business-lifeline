import type { SavedReport } from "./saved-report";

export const BUSINESS_OS_KEY = "business-lifeline-operating-system-v1";

export type OsTask = { id: string; title: string; owner: string; due: string; priority: "Critical" | "High" | "Normal"; done: boolean };
export type OsContact = { id: string; name: string; type: "Customer" | "Supplier" | "Adviser" | "Lender"; nextAction: string; value: number };
export type OsTeamMember = { id: string; name: string; responsibility: string; weeklyOutcome: string };
export type OsDocument = { id: string; name: string; category: "Finance" | "Tax" | "Legal" | "Operations" | "People"; current: boolean };
export type BusinessOsState = {
  updatedAt: string;
  weekFocus: string;
  revenueTarget: number;
  cashTarget: number;
  invoiceCollectionTarget: number;
  tasks: OsTask[];
  contacts: OsContact[];
  team: OsTeamMember[];
  documents: OsDocument[];
};

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createBusinessOs(saved: SavedReport, now = new Date()): BusinessOsState {
  const firstActions = [...saved.report.today, ...saved.report.sevenDays].slice(0, 4);
  return {
    updatedAt: now.toISOString(),
    weekFocus: saved.data.immediateGoal || "Protect cash and complete the highest-impact recovery actions.",
    revenueTarget: Math.max(0, saved.data.monthlyRevenue),
    cashTarget: Math.max(0, saved.data.cashAvailable + Math.max(0, -saved.report.metrics.monthlyOperatingResult)),
    invoiceCollectionTarget: Math.max(0, saved.data.overdueInvoices),
    tasks: firstActions.map((action, index) => ({ id: `mri-${index}`, title: action.title, owner: "Owner", due: "This week", priority: action.urgency === "Critical" ? "Critical" : action.urgency === "High" ? "High" : "Normal", done: false })),
    contacts: [],
    team: saved.data.employees > 0 ? [{ id: "owner", name: "Owner", responsibility: "Recovery leadership", weeklyOutcome: saved.data.immediateGoal }] : [],
    documents: [
      { id: "cashflow", name: "13-week cashflow forecast", category: "Finance", current: false },
      { id: "pnl", name: "Current profit and loss", category: "Finance", current: false },
      { id: "tax", name: "Tax account and payment arrangements", category: "Tax", current: saved.data.overdueTax === 0 },
      { id: "contracts", name: "Key customer and supplier contracts", category: "Legal", current: false },
      { id: "procedures", name: "Core operating procedures", category: "Operations", current: false },
    ],
  };
}

function validState(value: unknown): value is BusinessOsState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<BusinessOsState>;
  return typeof item.updatedAt === "string" && typeof item.weekFocus === "string" &&
    [item.revenueTarget, item.cashTarget, item.invoiceCollectionTarget].every((number) => typeof number === "number" && Number.isFinite(number) && number >= 0) &&
    Array.isArray(item.tasks) && Array.isArray(item.contacts) && Array.isArray(item.team) && Array.isArray(item.documents);
}

export function readBusinessOs(saved: SavedReport, storage: Storage = window.localStorage): BusinessOsState {
  try {
    const raw = storage.getItem(BUSINESS_OS_KEY);
    if (!raw) return createBusinessOs(saved);
    const value: unknown = JSON.parse(raw);
    if (!validState(value)) throw new Error("Invalid operating system state");
    return value;
  } catch {
    storage.removeItem(BUSINESS_OS_KEY);
    return createBusinessOs(saved);
  }
}

export function writeBusinessOs(state: BusinessOsState, storage: Storage = window.localStorage) {
  storage.setItem(BUSINESS_OS_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
}

export function osSummary(state: BusinessOsState) {
  const openTasks = state.tasks.filter((task) => !task.done);
  const criticalTasks = openTasks.filter((task) => task.priority === "Critical").length;
  const nextActions = state.contacts.filter((contact) => contact.nextAction.trim()).length;
  const currentDocuments = state.documents.filter((document) => document.current).length;
  const completion = state.tasks.length ? Math.round((state.tasks.filter((task) => task.done).length / state.tasks.length) * 100) : 0;
  return { openTasks: openTasks.length, criticalTasks, nextActions, currentDocuments, completion };
}

export const newOsId = id;
