export type ComplianceCapability="bas-preparation"|"stp-preparation"|"direct-stp-lodgement"|"superstream-clearing"|"payg-2026"|"gst-ledger"|"audit-trail"|"bank-feed";
export type ComplianceState="verified-core"|"beta"|"external-integration-required"|"not-configured";
export type ComplianceItem={id:ComplianceCapability;label:string;state:ComplianceState;blocking:string[];evidence:string[]};
export function australianComplianceReadiness(input:{atoPayg2026:boolean;gstLedger:boolean;auditTrail:boolean;directStpProvider:boolean;superstreamProvider:boolean;bankFeedConfigured:boolean;basReviewed:boolean}){
 const items:ComplianceItem[]=[
  {id:"payg-2026",label:"ATO PAYG 2026 calculations",state:input.atoPayg2026?"verified-core":"beta",blocking:input.atoPayg2026?[]:["Verified tax-table engine"],evidence:["PAYG calculation tests"]},
  {id:"gst-ledger",label:"GST-aware ledger",state:input.gstLedger?"verified-core":"beta",blocking:input.gstLedger?[]:["GST posting integrity"],evidence:["Double-entry journal integrity"]},
  {id:"audit-trail",label:"Audit trail",state:input.auditTrail?"verified-core":"beta",blocking:input.auditTrail?[]:["Immutable audit lineage"],evidence:["Mutation and event lineage"]},
  {id:"bas-preparation",label:"BAS preparation",state:input.basReviewed?"verified-core":"beta",blocking:input.basReviewed?[]:["Qualified review of BAS mapping and edge cases"],evidence:["GST/PAYG ledger data"]},
  {id:"stp-preparation",label:"STP preparation",state:input.atoPayg2026?"verified-core":"beta",blocking:input.atoPayg2026?[]:["Verified payroll calculation"],evidence:["STP-style disaggregation integrity"]},
  {id:"direct-stp-lodgement",label:"Direct STP lodgement",state:input.directStpProvider?"verified-core":"external-integration-required",blocking:input.directStpProvider?[]:["Registered STP transmission/provider integration"],evidence:[]},
  {id:"superstream-clearing",label:"SuperStream clearing",state:input.superstreamProvider?"verified-core":"external-integration-required",blocking:input.superstreamProvider?[]:["SuperStream-compliant provider/clearing integration"],evidence:[]},
  {id:"bank-feed",label:"Bank feed/reconciliation",state:input.bankFeedConfigured?"verified-core":"not-configured",blocking:input.bankFeedConfigured?[]:["Bank-feed provider credentials and production reconciliation"],evidence:[]},
 ];
 const verified=items.filter(x=>x.state==="verified-core").length,external=items.filter(x=>x.state==="external-integration-required").length,beta=items.filter(x=>x.state==="beta").length;
 return{items,verified,external,beta,score:Math.round(items.reduce((n,x)=>n+(x.state==="verified-core"?100:x.state==="beta"?65:x.state==="external-integration-required"?45:25),0)/items.length),productionClaimSafe:external===0&&beta===0&&items.every(x=>x.state==="verified-core")}}
