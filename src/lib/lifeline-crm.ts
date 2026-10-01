export type CrmAccountType = "prospect" | "customer" | "partner" | "supplier";
export type CrmLeadStatus = "new" | "working" | "qualified" | "disqualified";
export type CrmActivityType = "note" | "call" | "email" | "meeting" | "task" | "system";
export type CrmTaskStatus = "open" | "done" | "cancelled";

export type CrmAccount = {
  id: string; name: string; domain?: string; phone?: string; email?: string;
  industry?: string; type: CrmAccountType; ownerId?: string; tags: string[];
  customFields: Record<string, string | number | boolean | null>;
  createdAt: string; updatedAt: string;
};

export type CrmContact = {
  id: string; accountId?: string; firstName: string; lastName: string;
  email?: string; phone?: string; title?: string; ownerId?: string; tags: string[];
  customFields: Record<string, string | number | boolean | null>;
  createdAt: string; updatedAt: string;
};

export type CrmLead = {
  id: string; accountId?: string; contactId?: string; name: string;
  source?: string; ownerId?: string; status: CrmLeadStatus; score: number;
  createdAt: string; updatedAt: string;
};

export type CrmStage = { id: string; name: string; order: number; probability: number; closed?: "won" | "lost" };
export type CrmPipeline = { id: string; name: string; stages: CrmStage[]; isDefault?: boolean };

export type CrmOpportunity = {
  id: string; accountId: string; primaryContactId?: string; pipelineId: string; stageId: string;
  title: string; value: number; probability?: number; ownerId?: string; source?: string;
  expectedCloseDate?: string; nextAction?: string; nextActionAt?: string;
  winLossReason?: string; createdAt: string; updatedAt: string;
};

export type CrmActivity = {
  id: string; type: CrmActivityType; accountId?: string; contactId?: string; opportunityId?: string;
  ownerId?: string; subject: string; body?: string; occurredAt: string; createdAt: string;
};

export type CrmTask = {
  id: string; accountId?: string; contactId?: string; opportunityId?: string;
  ownerId?: string; title: string; dueAt?: string; priority: "low" | "normal" | "high";
  status: CrmTaskStatus; createdAt: string; completedAt?: string;
};

export type CrmStore = {
  accounts: CrmAccount[]; contacts: CrmContact[]; leads: CrmLead[]; pipelines: CrmPipeline[];
  opportunities: CrmOpportunity[]; activities: CrmActivity[]; tasks: CrmTask[];
};

export const DEFAULT_SALES_PIPELINE: CrmPipeline = {
  id: "sales-default", name: "Sales", isDefault: true,
  stages: [
    { id: "lead", name: "Lead", order: 10, probability: 10 },
    { id: "qualified", name: "Qualified", order: 20, probability: 30 },
    { id: "proposal", name: "Proposal", order: 30, probability: 55 },
    { id: "negotiation", name: "Negotiation", order: 40, probability: 75 },
    { id: "won", name: "Won", order: 50, probability: 100, closed: "won" },
    { id: "lost", name: "Lost", order: 60, probability: 0, closed: "lost" },
  ],
};

export function createEmptyCrmStore(): CrmStore {
  return { accounts: [], contacts: [], leads: [], pipelines: [DEFAULT_SALES_PIPELINE], opportunities: [], activities: [], tasks: [] };
}

const normalized = (value?: string) => (value || "").trim().toLowerCase();
export const contactDedupeKey = (contact: Pick<CrmContact, "email" | "phone" | "firstName" | "lastName">) =>
  normalized(contact.email) || normalized(contact.phone) || normalized(contact.firstName + "|" + contact.lastName);
export const accountDedupeKey = (account: Pick<CrmAccount, "domain" | "name">) => normalized(account.domain) || normalized(account.name);

export function findDuplicateContact(contacts: CrmContact[], candidate: Pick<CrmContact, "email" | "phone" | "firstName" | "lastName">) {
  const key = contactDedupeKey(candidate);
  return contacts.find((contact) => contactDedupeKey(contact) === key);
}

export function findDuplicateAccount(accounts: CrmAccount[], candidate: Pick<CrmAccount, "domain" | "name">) {
  const key = accountDedupeKey(candidate);
  return accounts.find((account) => accountDedupeKey(account) === key);
}

export function opportunityProbability(opportunity: CrmOpportunity, pipelines: CrmPipeline[]) {
  if (typeof opportunity.probability === "number") return Math.max(0, Math.min(100, opportunity.probability));
  return pipelines.find((p) => p.id === opportunity.pipelineId)?.stages.find((s) => s.id === opportunity.stageId)?.probability ?? 0;
}

export function pipelineForecast(store: CrmStore) {
  return store.opportunities.reduce((result, opportunity) => {
    const pipeline = store.pipelines.find((p) => p.id === opportunity.pipelineId);
    const stage = pipeline?.stages.find((s) => s.id === opportunity.stageId);
    if (stage?.closed === "lost") return result;
    const value = Math.max(0, Number(opportunity.value) || 0);
    result.gross += value;
    result.weighted += value * opportunityProbability(opportunity, store.pipelines) / 100;
    if (stage?.closed === "won") result.won += value;
    return result;
  }, { gross: 0, weighted: 0, won: 0 });
}

export function accountTimeline(store: CrmStore, accountId: string) {
  return store.activities.filter((item) => item.accountId === accountId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function dueTasks(store: CrmStore, nowIso: string) {
  return store.tasks.filter((task) => task.status === "open" && Boolean(task.dueAt) && task.dueAt! <= nowIso)
    .sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || ""));
}

export function moveOpportunity(store: CrmStore, opportunityId: string, stageId: string, nowIso: string, winLossReason?: string): CrmStore {
  const opportunity = store.opportunities.find((item) => item.id === opportunityId);
  if (!opportunity) return store;
  const pipeline = store.pipelines.find((item) => item.id === opportunity.pipelineId);
  if (!pipeline?.stages.some((stage) => stage.id === stageId)) throw new Error("Stage does not belong to this opportunity pipeline.");
  return {
    ...store,
    opportunities: store.opportunities.map((item) => item.id === opportunityId ? { ...item, stageId, winLossReason, updatedAt: nowIso } : item),
  };
}

export type CrmImportRow = { accountName?: string; domain?: string; firstName?: string; lastName?: string; email?: string; phone?: string };
export function validateImportRow(row: CrmImportRow) {
  const errors: string[] = [];
  if (!row.accountName?.trim() && !row.email?.trim() && !row.phone?.trim()) errors.push("A company name, email or phone is required.");
  if (row.email && !/^\S+@\S+\.\S+$/.test(row.email.trim())) errors.push("Email is invalid.");
  return errors;
}
