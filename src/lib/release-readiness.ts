export type ReleaseCapability={id:string;label:string;state:"verified-core"|"external-integration-required"|"beta";note:string};
export const V1_CAPABILITIES:ReleaseCapability[]=[
{id:"mri",label:"Rules-first MRI and recovery",state:"verified-core",note:"Deterministic scoring, evidence confidence, recovery actions and rescans."},
{id:"crm",label:"CRM and customer lifecycle",state:"verified-core",note:"Accounts, contacts, opportunities, activities and delivery follow-up."},
{id:"books",label:"Books and money integrity",state:"verified-core",note:"Double-entry journals, AR/AP posting, payments and reconciliation controls."},
{id:"pos",label:"POS accounting core",state:"verified-core",note:"Sales/refunds/register workflow with ledger and inventory integration."},
{id:"payroll",label:"Payroll preparation",state:"beta",note:"Balanced payroll/STP-style data; PAYG remains estimate mode unless a verified tax-table engine is configured."},
{id:"stp",label:"Direct STP lodgement",state:"external-integration-required",note:"Requires compliant registered transmission/provider integration and credentials."},
{id:"warehouse",label:"Warehouse execution",state:"verified-core",note:"Locations, bin balances, receiving/put-away, pick and transfer invariants."},
{id:"manufacturing",label:"Manufacturing execution",state:"verified-core",note:"BOM/routing release gates, MRP, WIP consumption, capacity, costing and traceability."},
{id:"cloud",label:"Structured cloud workspace",state:"beta",note:"Signed-in per-business structured records plus whole-workspace backup/restore; production security still depends on deployed Firebase rules."}
];
export function releaseSummary(items=V1_CAPABILITIES){return{verified:items.filter(x=>x.state==="verified-core").length,beta:items.filter(x=>x.state==="beta").length,external:items.filter(x=>x.state==="external-integration-required").length,blockingCore:items.filter(x=>x.state!=="verified-core"&&!["payroll","stp","cloud"].includes(x.id))}}
