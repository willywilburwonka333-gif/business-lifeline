import assert from "node:assert/strict";
import { documentSubtotal, documentTax, receivePurchaseOrder, transferStock, projectEconomics, requiredBomComponents, adjustStocktake, reorderItems, projectProfitability } from "./lifeline-operations";
const lines=[{id:"1",description:"A",quantity:2,unitPrice:100,taxRate:.1}];
assert.equal(documentSubtotal(lines),200); assert.equal(documentTax(lines),20);
const po={id:"p",supplierAccountId:"s",status:"ordered" as const,lines,locationId:"w",received:{},createdAt:"x",updatedAt:"x"};
assert.equal(receivePurchaseOrder(po,{"1":1},"y").status,"partially-received");
assert.equal(receivePurchaseOrder(po,{"1":2},"y").status,"received");
const moved=transferStock([{productId:"a",locationId:"one",onHand:10,allocated:2,available:8,averageCost:4}],"a","one","two",3);
assert.equal(moved.find(x=>x.locationId==="one")?.onHand,7); assert.equal(moved.find(x=>x.locationId==="two")?.onHand,3);
const econ=projectEconomics({id:"p",accountId:"a",name:"Job",status:"active",budgetRevenue:10000,budgetCost:6000,createdAt:"x",updatedAt:"x"},[{id:"t",projectId:"p",name:"Work",status:"active",plannedHours:1,actualHours:1,budgetCost:100,actualCost:7000,dependsOn:[]}],[{id:"v",projectId:"p",description:"Extra",revenueChange:1000,costChange:500,status:"approved",createdAt:"x"}]);
assert.equal(econ.budgetRevenue,11000); assert.equal(econ.forecastMargin,4000);
assert.equal(requiredBomComponents({id:"b",outputProductId:"x",outputQuantity:1,version:"1",active:true,components:[{productId:"c",quantity:2,scrapPercent:10}]},5).c,11);
console.log("lifeline-operations tests passed");

const counted=adjustStocktake([{productId:"a",locationId:"one",onHand:10,allocated:2,available:8,averageCost:4,reorderPoint:5}],"a","one",6);
assert.equal(counted.variance,-4);assert.equal(counted.varianceValue,-16);assert.equal(counted.balances[0].available,4);
assert.equal(reorderItems(counted.balances).length,1);
const profit=projectProfitability({id:"jp",accountId:"a",name:"Job",status:"complete",budgetRevenue:1000,budgetCost:0,createdAt:"x",updatedAt:"x"},[{id:"jt",projectId:"jp",name:"Labour",status:"complete",plannedHours:1,actualHours:1,budgetCost:0,actualCost:300,dependsOn:[]}],[],200,100);
assert.equal(profit.profit,400);assert.equal(profit.marginPercent,40);
