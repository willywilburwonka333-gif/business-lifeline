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
  stage: number;
  label: string;
  detail: string;
};

export const workspaceTabs: readonly WorkspaceTabDefinition[] = [
  { id: "dashboard", stage: 1, label: "Dashboard", detail: "Overview" },
  { id: "recovery", stage: 2, label: "Recovery", detail: "Plan" },
  { id: "coach", stage: 3, label: "Coach", detail: "Check-in" },
  { id: "brain", stage: 4, label: "Business Brain", detail: "Advice" },
  { id: "cashflow", stage: 5, label: "Cashflow", detail: "Simulator" },
  { id: "operations", stage: 6, label: "Operations", detail: "Business OS" },
  { id: "resources", stage: 7, label: "Resources", detail: "Templates" },
];

export function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return typeof value === "string" && workspaceTabIds.includes(value as WorkspaceTab);
}
