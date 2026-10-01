export type IntegrationStatus = "disabled" | "sandbox" | "ready" | "error";
export type RegulatedCapability = "open-banking" | "payments" | "stp" | "bas-lodgement" | "super-payments" | "fx-execution" | "corrwealth-account";

export type IntegrationGate = {
  capability: RegulatedCapability;
  status: IntegrationStatus;
  provider?: string;
  approvalReference?: string;
  configuredAt?: string;
};

export const DEFAULT_INTEGRATION_GATES: IntegrationGate[] = [
  { capability:"open-banking", status:"disabled" },
  { capability:"payments", status:"disabled" },
  { capability:"stp", status:"disabled" },
  { capability:"bas-lodgement", status:"disabled" },
  { capability:"super-payments", status:"disabled" },
  { capability:"fx-execution", status:"disabled" },
  { capability:"corrwealth-account", status:"disabled" },
];

export function capabilityEnabled(gates:IntegrationGate[], capability:RegulatedCapability) {
  return gates.some(gate=>gate.capability===capability && (gate.status==="sandbox" || gate.status==="ready"));
}

export function requireCapability(gates:IntegrationGate[], capability:RegulatedCapability) {
  const gate=gates.find(item=>item.capability===capability);
  if(!gate || (gate.status!=="sandbox" && gate.status!=="ready")) throw new Error(`${capability} is disabled until its external integration and approval requirements are configured.`);
  return gate;
}
