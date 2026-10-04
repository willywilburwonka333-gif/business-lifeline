import test from"node:test";import assert from"node:assert/strict";
import{generateReport}from"./planner.ts";
import{diagnosticStandard}from"./business-health-standard.ts";
import{buildRecoveryFindings}from"./recovery-engine.ts";
import{reconcileCandidates,reconciliationSummary,reconciliationToDraft,type ReconciliationCandidate}from"./mri-reconciliation.ts";
import{provisionalRecovery}from"./provisional-recovery.ts";
import{australianComplianceReadiness}from"./au-compliance-readiness.ts";
import{createEmptyCrmStore}from"./lifeline-crm.ts";
import{applyCadence,defaultSalesCadence,cadenceIntegrity}from"./crm-cadence.ts";
import{receivePurchaseOrderTransaction}from"./purchase-transaction-engine.ts";
import{booksIntegrity}from"./money-integrity.ts";
import type{BooksStore}from"./lifeline-books-engine.ts";
import type{BusinessData}from"./types.ts";
import type{OperatingStore}from"./lifeline-operations.ts";

const now="2026-10-04T02:30:00Z";
const evidence:ReconciliationCandidate[]=[
 {key:"monthlyRevenue",value:42000,source:"Owner estimate",sourceKind:"owner",confidence:"review",observedAt:"2026-10-04",evidence:"Owner estimate"},
 {key:"monthlyRevenue",value:38400,source:"Lifeline Books",sourceKind:"books",confidence:"high",observedAt:"2026-10-02",evidence:"P&L"},
 {key:"monthlyRevenue",value:39150,source:"Bank analysis",sourceKind:"bank",confidence:"high",observedAt:"2026-10-03",evidence:"Deposits"},
 {key:"overdueInvoices",value:18000,source:"Owner estimate",sourceKind:"owner",confidence:"review",observedAt:"2026-10-04"},
 {key:"overdueInvoices",value:22600,source:"Lifeline Books",sourceKind:"books",confidence:"high",observedAt:"2026-10-02"},
 {key:"overdueSuppliers",value:14300,source:"Supplier statement",sourceKind:"statement",confidence:"high",observedAt:"2026-08-15"},
 {key:"employees",value:7,source:"Owner estimate",sourceKind:"owner",confidence:"review",observedAt:"2026-10-04"},
 {key:"employees",value:5,source:"Payroll records",sourceKind:"payroll",confidence:"high",observedAt:"2026-10-03"},
 {key:"overdueTax",value:12400,source:"BAS working papers",sourceKind:"owner",confidence:"review",observedAt:"2026-10-01"},
 {key:"overdueTax",value:11100,source:"ATO record",sourceKind:"tax",confidence:"high",observedAt:"2026-10-03"},
];
test("pilot 2: messy records are reconciled without false precision",()=>{
 const fields=reconcileCandidates(evidence,now),summary=reconciliationSummary(fields);
 assert.ok(summary.conflicts>=4);
 assert.ok(summary.stale>=1);
 assert.equal(summary.safeForPrecision,false);
 assert.ok(summary.requiresVerification.includes("monthlyRevenue"));
 assert.equal(fields.find(x=>x.key==="monthlyRevenue")?.selected.sourceKind,"bank");
 assert.equal(fields.find(x=>x.key==="overdueTax")?.selected.sourceKind,"tax");
});
test("pilot 2: MRI lowers confidence and marks recovery provisional",()=>{
 const fields=reconcileCandidates(evidence,now),draft=reconciliationToDraft(fields,now);
 const pick=(key:keyof BusinessData,fallback:number)=>Number(fields.find(x=>x.key===key)?.selected.value??fallback);
 const data:BusinessData={businessName:"Messy Records Cafe",industry:"Cafe and hospitality",country:"Australia",yearsOperating:5,employees:pick("employees",5),monthlyRevenue:pick("monthlyRevenue",39000),fixedExpenses:21000,variableExpenses:16000,ownerDrawings:3500,loanRepayments:1800,cashAvailable:6500,accountsReceivable:26000,overdueInvoices:pick("overdueInvoices",22600),totalDebt:68000,overdueTax:pick("overdueTax",11100),overdueSuppliers:pick("overdueSuppliers",14300),revenueTrend:"declining",biggestProblem:"Records conflict and cash is tight.",immediateGoal:"Verify the numbers and stabilise cash.",urgentConcerns:["tax","debts"],pressureFactors:["margins","costs"]};
 const report=generateReport(data),standard=diagnosticStandard(data,report.metrics,false,{draft});
 assert.ok(standard.dataWarnings.some(x=>/conflict/i.test(x)));
 assert.ok(standard.evidenceConfidence<90);
 const guarded=provisionalRecovery(buildRecoveryFindings(data,report,standard),fields);
 assert.equal(guarded.precisionSafe,false);
 assert.ok(guarded.verificationRequired.length>=4);
 assert.ok(guarded.findings.every(x=>x.provisional===true&&x.caution.length>0));
});
test("accounting/compliance readiness distinguishes core from external rails",()=>{
 const r=australianComplianceReadiness({atoPayg2026:true,gstLedger:true,auditTrail:true,directStpProvider:false,superstreamProvider:false,bankFeedConfigured:false,basReviewed:false});
 assert.ok(r.verified>=3);assert.ok(r.external>=2);assert.equal(r.productionClaimSafe,false);
 assert.equal(r.items.find(x=>x.id==="direct-stp-lodgement")?.state,"external-integration-required");
});
test("CRM cadences create deterministic non-duplicated follow-up work",()=>{
 let s=createEmptyCrmStore();s.accounts.push({id:"a",name:"Cafe",type:"prospect",tags:[],customFields:{},createdAt:now,updatedAt:now});s.opportunities.push({id:"o",accountId:"a",pipelineId:"sales-default",stageId:"proposal",title:"MRI",value:199,createdAt:now,updatedAt:now});
 s=applyCadence(s,"o",defaultSalesCadence("proposal"),now);const count=s.tasks.length;s=applyCadence(s,"o",defaultSalesCadence("proposal"),now);
 assert.equal(count,3);assert.equal(s.tasks.length,3);assert.equal(cadenceIntegrity(s).valid,true);
});
test("ERP purchase receipt updates stock supplier bill ledger and events atomically",()=>{
 const books:BooksStore={journals:[],docs:[],bills:[],refunds:[],nextQuote:1,nextInvoice:1,nextCredit:1,lockDate:""};
 const ops:OperatingStore={industryPack:"hospitality",locations:[{id:"main",name:"Main",type:"store",active:true}],inventory:[{productId:"beans",locationId:"main",onHand:10,allocated:0,available:10,averageCost:20}],movements:[],salesOrders:[],purchaseOrders:[{id:"po1",supplierAccountId:"supplier",status:"ordered",lines:[{id:"l1",description:"Coffee beans",quantity:5,unitPrice:22,taxRate:.1,productId:"beans"}],locationId:"main",received:{},createdAt:now,updatedAt:now}],projects:[],projectTasks:[],variations:[],progressClaims:[],serviceAgreements:[],serviceOrders:[],boms:[],routings:[],workCentres:[],productionOrders:[]};
 const r=receivePurchaseOrderTransaction({operations:ops,books,orderId:"po1",receipts:{l1:5},supplierName:"Bean Co",businessId:"b",actorId:"owner",at:now,correlationId:"po-flow"});
 assert.equal(r.applied,true);assert.equal(r.operations.inventory[0].onHand,15);assert.equal(r.books.bills.length,1);assert.equal(r.books.journals.length,1);assert.equal(r.events.length,2);assert.equal(booksIntegrity(r.books).valid,true);
});
