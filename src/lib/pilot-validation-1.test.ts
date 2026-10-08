import test from"node:test";import assert from"node:assert/strict";
import{distressedDemoBusiness}from"./demo.ts";
import{generateReport}from"./planner.ts";
import{diagnosticStandard}from"./business-health-standard.ts";
import{buildRecoveryFindings,recoveryProgress}from"./recovery-engine.ts";
import{createEmptyCrmStore}from"./lifeline-crm.ts";
import{advanceOpportunity,crmIntegrity}from"./customer-lifecycle.ts";
import{fulfilSalesOrder}from"./erp-transaction-engine.ts";
import{receivePaymentTransaction}from"./unified-transaction-engine.ts";
import{eventFeedbackMetrics,correlationLineage}from"./operational-mri-feedback.ts";
import{lifecycleAudit}from"./lifecycle-reliability.ts";
import{createWorkspaceBackup,roundTripBackup}from"./workspace-backup-integrity.ts";
import type{BooksStore}from"./lifeline-books-engine.ts";
import type{OperatingStore}from"./lifeline-operations.ts";

const at="2026-10-04T05:00:00Z";
const emptyBooks=():BooksStore=>({journals:[],docs:[],bills:[],refunds:[],nextQuote:1,nextInvoice:1,nextCredit:1,lockDate:""});

test("pilot 1: distressed cafe MRI identifies real pressure and prioritised recovery",()=>{
 const report=generateReport(distressedDemoBusiness);
 const standard=diagnosticStandard(distressedDemoBusiness,report.metrics);
 const findings=buildRecoveryFindings(distressedDemoBusiness,report,standard);
 assert.ok(standard.score<55,"distressed cafe should not receive a healthy score");
 assert.equal(standard.professionalReview,true,"tax/debt distress should trigger professional-review flag");
 assert.ok(standard.redFlags.length>=2);
 assert.ok(findings.some(x=>x.area==="obligations"&&x.severity==="critical"));
 assert.ok(findings.some(x=>x.area==="revenue"));
 assert.ok(report.today.some(x=>/13-week cash forecast/i.test(x.title)));
 assert.ok(report.sevenDays.some(x=>/tax authority|payment plan/i.test(x.title)));
});

test("pilot 1: recovery rescan measures objectively better business state",()=>{
 const baselineReport=generateReport(distressedDemoBusiness);
 const baseline=diagnosticStandard(distressedDemoBusiness,baselineReport.metrics);
 const improved={...distressedDemoBusiness,
  monthlyRevenue:70000,fixedExpenses:27000,variableExpenses:25500,ownerDrawings:3500,loanRepayments:3500,
  cashAvailable:26000,accountsReceivable:1800,overdueInvoices:500,totalDebt:126000,overdueTax:9000,overdueSuppliers:3500,
  revenueTrend:"stable" as const,
  // The owner confirmed payment arrangements and no longer reports an immediate inability to pay.
  // Keep the remaining overdue tax in the figures so the professional warning still applies.
  urgentConcerns:[],
  biggestProblem:"Cash pressure is improving; remaining focus is tax plan and margin discipline.",
  immediateGoal:"Sustain positive cash flow and clear remaining arrears.",
  pressureFactors:["costs","margins"],
 };
 const currentReport=generateReport(improved);
 const current=diagnosticStandard(improved,currentReport.metrics);
 const progress=recoveryProgress(baseline,current);
 assert.equal(progress.direction,"improving");
 assert.ok(progress.delta>=10,"expected a meaningful health improvement");
 assert.ok(current.score>baseline.score);
 assert.ok(currentReport.metrics.monthlyOperatingResult>baselineReport.metrics.monthlyOperatingResult);
 assert.ok(buildRecoveryFindings(improved,currentReport,current).length<=buildRecoveryFindings(distressedDemoBusiness,baselineReport,baseline).length);
});

test("pilot 1: customer engagement flows CRM to operations to invoice payment books MRI evidence and backup",()=>{
 let crm=createEmptyCrmStore();
 crm.accounts.push({id:"acct",name:"Family Table Cafe",type:"customer",tags:["pilot"],customFields:{mriScore:35},createdAt:at,updatedAt:at});
 crm.opportunities.push({id:"opp",accountId:"acct",pipelineId:"sales-default",stageId:"lead",title:"Business Lifeline MRI + Recovery",value:349,createdAt:at,updatedAt:at});
 crm=advanceOpportunity(crm,"opp","won","2026-10-04T05:05:00Z");
 assert.equal(crmIntegrity(crm).valid,true);
 assert.ok(crm.tasks.some(t=>t.opportunityId==="opp"));

 const operations:OperatingStore={industryPack:"hospitality",locations:[{id:"main",name:"Main",type:"store",active:true}],inventory:[{productId:"pilot-service",locationId:"main",onHand:1,allocated:0,available:1,averageCost:0}],movements:[],salesOrders:[{id:"so1",accountId:"acct",status:"confirmed",lines:[{id:"l1",description:"MRI + Recovery Map",quantity:1,unitPrice:349,taxRate:0,productId:"pilot-service"}],locationId:"main",createdAt:at,updatedAt:at}],purchaseOrders:[],projects:[],projectTasks:[],variations:[],progressClaims:[],serviceAgreements:[],serviceOrders:[],boms:[],routings:[],workCentres:[],productionOrders:[]};
 const fulfilled=fulfilSalesOrder({operations,books:emptyBooks(),orderId:"so1",customerName:"Family Table Cafe",actorId:"owner",businessId:"pilot-family-table",at:"2026-10-04T05:10:00Z",correlationId:"pilot-flow-1"});
 assert.equal(fulfilled.applied,true);
 assert.equal(fulfilled.operations.inventory[0].onHand,0);
 assert.equal(fulfilled.books.journals.length,1);

 const paid=receivePaymentTransaction(fulfilled.books,fulfilled.invoice,349,"pilot-payment-1",{businessId:"pilot-family-table",actorId:"owner",correlationId:"pilot-flow-1",at:"2026-10-04T05:15:00Z"});
 assert.equal(paid.applied,true);
 const events=[...fulfilled.events,...paid.events];
 assert.equal(correlationLineage(events,"pilot-flow-1").valid,true);
 assert.equal(eventFeedbackMetrics(events).paymentReceipts,349);
 const audit=lifecycleAudit({events,books:paid.store,inventory:fulfilled.operations.inventory,mri:{score:35,confidence:80}});
 assert.equal(audit.ready,true);

 const backup=createWorkspaceBackup({books:paid.store,events,metadata:{businessId:"pilot-family-table",exportedBy:"owner"}},1,"2026-10-04T05:20:00Z");
 assert.equal(roundTripBackup(backup).verification.valid,true);
});
