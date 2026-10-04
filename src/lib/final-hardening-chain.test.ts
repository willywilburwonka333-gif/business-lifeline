import test from"node:test";import assert from"node:assert/strict";
import{businessEvent}from"./business-event-engine.ts";
import{fulfilSalesOrder}from"./erp-transaction-engine.ts";
import{receivePaymentTransaction}from"./unified-transaction-engine.ts";
import{evidenceFromEvents,eventFeedbackMetrics,correlationLineage}from"./operational-mri-feedback.ts";
import{lifecycleAudit}from"./lifecycle-reliability.ts";
import{createWorkspaceBackup,roundTripBackup}from"./workspace-backup-integrity.ts";
import type{BooksStore}from"./lifeline-books-engine.ts";
import type{OperatingStore}from"./lifeline-operations.ts";
const emptyBooks=():BooksStore=>({journals:[],docs:[],bills:[],refunds:[],nextQuote:1,nextInvoice:1,nextCredit:1,lockDate:""});
test("final chain: order to stock to invoice to payment to MRI evidence to verified backup",()=>{
 const at="2026-10-04T04:00:00Z";
 const operations:OperatingStore={industryPack:"retail",locations:[{id:"main",name:"Main",type:"store",active:true}],inventory:[{productId:"p1",locationId:"main",onHand:10,allocated:0,available:10,averageCost:20}],movements:[],salesOrders:[{id:"so1",accountId:"a1",status:"confirmed",lines:[{id:"l1",description:"Product",quantity:2,unitPrice:55,taxRate:0,productId:"p1"}],locationId:"main",createdAt:at,updatedAt:at}],purchaseOrders:[],projects:[],projectTasks:[],variations:[],progressClaims:[],serviceAgreements:[],serviceOrders:[],boms:[],routings:[],workCentres:[],productionOrders:[]};
 const fulfilled=fulfilSalesOrder({operations,books:emptyBooks(),orderId:"so1",customerName:"Customer",actorId:"owner",businessId:"b1",at,correlationId:"flow1"});
 assert.equal(fulfilled.applied,true);assert.equal(fulfilled.operations.inventory[0].onHand,8);
 const paid=receivePaymentTransaction(fulfilled.books,fulfilled.invoice,110,"pay1",{businessId:"b1",actorId:"owner",correlationId:"flow1",at:"2026-10-04T04:05:00Z"});
 assert.equal(paid.applied,true);
 const events=[...fulfilled.events,...paid.events];
 assert.ok(evidenceFromEvents(events).length>=2);assert.equal(eventFeedbackMetrics(events).paymentReceipts,110);assert.equal(correlationLineage(events,"flow1").valid,true);
 const audit=lifecycleAudit({events,books:paid.store,inventory:fulfilled.operations.inventory,mri:{score:70,confidence:90}});assert.equal(audit.ready,true);
 const backup=createWorkspaceBackup({books:paid.store,events,metadata:{businessId:"b1",exportedBy:"owner"}},1,"2026-10-04T04:06:00Z");assert.equal(roundTripBackup(backup).verification.valid,true);
});
test("final chain: orphaned causation and impossible stock are detected",()=>{
 const e=businessEvent({type:"PAYMENT_RECEIVED",businessId:"b1",actorId:"owner",occurredAt:"2026-10-04T05:00:00Z",entityType:"payment",entityId:"p1",correlationId:"flow2",causationId:"missing",payload:{amount:1}});
 assert.equal(correlationLineage([e],"flow2").valid,false);
 const audit=lifecycleAudit({events:[e],books:emptyBooks(),inventory:[{onHand:1,allocated:2,available:-1}],mri:{score:50}});assert.equal(audit.ready,false);
});

import{affectedSubsystems,propagationContract}from"./business-data-events.ts";
test("propagation contract updates every relevant core subsystem",()=>{assert.deepEqual(new Set(affectedSubsystems("pos")),new Set(["inventory","books","mri","recovery","cloud","dashboard"]));assert.ok(affectedSubsystems("people").includes("payroll"));assert.ok(affectedSubsystems("crm").includes("operations"));assert.ok(affectedSubsystems("books").includes("mri"));const contract=propagationContract();for(const domain of ["books","crm","operations","pos","people","tax","mri"] as const){assert.ok(contract[domain].length>=3)}});
