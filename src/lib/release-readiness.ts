export type ReleaseCapability={id:string;label:string;state:"verified-core"|"external-integration-required"|"beta";note:string};
export const V1_CAPABILITIES:ReleaseCapability[]=[
{id:"mri",label:"Rules-first MRI and recovery",state:"verified-core",note:"Deterministic scoring, evidence confidence, recovery actions and rescans."},
{id:"crm",label:"CRM and customer lifecycle",state:"verified-core",note:"Accounts, contacts, opportunities, activities, deterministic follow-up cadences and delivery handoff."},
{id:"books",label:"Books and money integrity",state:"verified-core",note:"Double-entry journals, AR/AP posting, payments, reversals/corrections, purchasing-to-bill flow and reconciliation controls."},
{id:"pos",label:"POS accounting core",state:"verified-core",note:"Sales/refunds/register workflow with ledger and inventory integration."},
{id:"payroll",label:"Payroll preparation",state:"beta",note:"Balanced payroll/STP-style data with ATO 2026 PAYG formulas when employee tax settings are supplied; award interpretation, direct lodgement and provider rails remain separate."},
{id:"stp",label:"Direct STP lodgement",state:"external-integration-required",note:"Requires compliant registered transmission/provider integration and credentials."},
{id:"warehouse",label:"Warehouse execution",state:"verified-core",note:"Locations, bin balances, receiving/put-away, pick and transfer invariants."},
{id:"manufacturing",label:"Manufacturing execution",state:"verified-core",note:"BOM/routing release gates, MRP, WIP consumption, capacity, costing and traceability."},
{id:"grow",label:"Growth decision engine",state:"verified-core",note:"Growth readiness, capacity/funding constraints, unit economics, scenario stress tests and experiment scale/stop decisions."},
{id:"sell",label:"Sell / succession readiness",state:"verified-core",note:"Transferability, data-room readiness, buyer-risk, offer-quality comparison, handover and clearly labelled planning scenarios."},
{id:"cloud",label:"Structured cloud workspace",state:"beta",note:"Signed-in per-business structured records, propagation events and whole-workspace backup/restore; production security still depends on deployed Firebase rules."}
];
export function releaseSummary(items=V1_CAPABILITIES){return{verified:items.filter(x=>x.state==="verified-core").length,beta:items.filter(x=>x.state==="beta").length,external:items.filter(x=>x.state==="external-integration-required").length,blockingCore:items.filter(x=>x.state!=="verified-core"&&!["payroll","stp","cloud"].includes(x.id))}}
