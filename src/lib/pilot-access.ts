export type PilotTier = "public" | "pilot" | "full";
export type PilotEntitlement = {
  tier: PilotTier;
  isStudioOwner: boolean;
  emailVerified: boolean;
};

export const PILOT_ALLOWED_AREAS = ["mri", "lifeline"] as const;
export const PILOT_ALLOWED_TOOLS = [
  "diagnosis", "accuracy", "evidence",
  "recovery", "repairs", "progress", "coach", "cashflow", "resources",
] as const;

export function canOpenPilotArea(area: string) {
  return PILOT_ALLOWED_AREAS.some((item) => item === area);
}
export function canOpenPilotTool(tool: string) {
  return PILOT_ALLOWED_TOOLS.some((item) => item === tool);
}
