export const workspaceTabIds = [
  "dashboard",
  "recovery",
  "coach",
  "brain",
  "cashflow",
  "operations",
  "resources",
] as const;

export type WorkspaceTab = (typeof workspaceTabIds)[number];

export type WorkspaceTabDefinition = {
  id: WorkspaceTab;
  label: string;
  detail: string;
};

export const workspaceTabs: readonly WorkspaceTabDefinition[] = [
  { id: "dashboard", label: "Dashboard", detail: "Overview" },
  { id: "recovery", label: "Recovery", detail: "Plan and timeline" },
  { id: "coach", label: "Coach", detail: "Weekly follow-through" },
  { id: "brain", label: "Business Brain", detail: "Grounded advice" },
  { id: "cashflow", label: "Cashflow", detail: "Simulator" },
  { id: "operations", label: "Operations", detail: "Business OS" },
  { id: "resources", label: "Resources", detail: "Sheets and templates" },
];

export function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return typeof value === "string" && workspaceTabIds.includes(value as WorkspaceTab);
}
