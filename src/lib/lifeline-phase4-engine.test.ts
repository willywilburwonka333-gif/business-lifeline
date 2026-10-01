import test from"node:test";import assert from"node:assert/strict";import{applyStockMovement,stocktake,needsReorder,jobProfitability,nextWorkflowStatus,canInvoice}from"./lifeline-phase4-engine.ts";
const item={id:"p1",name:"Pump",onHand:10,available:10,reorderPoint:3,unitCost:25};
test("stock movement prevents negative inventory",()=>{assert.equal(applyStockMovement(item,{productId:"p1",quantity:7,kind:"sale"}).onHand,3);assert.throws(()=>applyStockMovement(item,{productId:"p1",quantity:11,kind:"job-use"}))});
test("stocktake produces accounting variance",()=>{const r=stocktake(item,8);assert.equal(r.variance,-2);assert.equal(r.varianceValue,-50);assert.equal(r.item.onHand,8)});
test("reorder uses available stock",()=>assert.equal(needsReorder({...item,available:3}),true));
test("job profitability includes materials labour and expenses",()=>assert.deepEqual(jobProfitability({jobId:"j",revenue:1000,materials:200,labour:300,expenses:100}),{cost:600,profit:400,marginPercent:40}));
test("workflow cannot invoice unfinished work",()=>{assert.equal(nextWorkflowStatus("accepted"),"job");assert.equal(canInvoice("job"),false);assert.equal(canInvoice("complete"),true)});
