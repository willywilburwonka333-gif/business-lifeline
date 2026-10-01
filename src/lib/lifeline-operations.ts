export type IndustryPack = "hospitality" | "trades" | "retail" | "professional-services" | "field-service" | "wholesale" | "manufacturing";
export type OrderStatus = "draft" | "confirmed" | "partially-fulfilled" | "fulfilled" | "cancelled";
export type PurchaseStatus = "draft" | "ordered" | "partially-received" | "received" | "cancelled";
export type WorkStatus = "planned" | "scheduled" | "active" | "blocked" | "complete" | "cancelled";

export type MoneyLine = { id:string; description:string; quantity:number; unitPrice:number; taxRate:number; accountCode?:string; productId?:string };
export type Location = { id:string; name:string; type:"store"|"warehouse"|"vehicle"|"site"; active:boolean };
export type InventoryBalance = { productId:string; locationId:string; onHand:number; allocated:number; available:number; averageCost:number; reorderPoint?:number };
export type StockMovement = { id:string; productId:string; fromLocationId?:string; toLocationId?:string; quantity:number; kind:"receipt"|"sale"|"transfer"|"adjustment"|"return"|"production-consume"|"production-output"; occurredAt:string; sourceId?:string };

export type SalesOrder = { id:string; accountId:string; contactId?:string; opportunityId?:string; quoteId?:string; status:OrderStatus; lines:MoneyLine[]; requiredAt?:string; locationId?:string; createdAt:string; updatedAt:string };
export type PurchaseOrder = { id:string; supplierAccountId:string; status:PurchaseStatus; lines:MoneyLine[]; orderedAt?:string; expectedAt?:string; locationId:string; received:Record<string,number>; createdAt:string; updatedAt:string };

export type Project = { id:string; accountId:string; salesOrderId?:string; name:string; status:WorkStatus; budgetRevenue:number; budgetCost:number; startAt?:string; dueAt?:string; managerId?:string; createdAt:string; updatedAt:string };
export type ProjectTask = { id:string; projectId:string; name:string; status:WorkStatus; assigneeId?:string; plannedHours:number; actualHours:number; budgetCost:number; actualCost:number; dependsOn:string[]; dueAt?:string };
export type Variation = { id:string; projectId:string; description:string; revenueChange:number; costChange:number; status:"draft"|"submitted"|"approved"|"rejected"; createdAt:string };
export type ProgressClaim = { id:string; projectId:string; description:string; amount:number; status:"draft"|"submitted"|"approved"|"invoiced"|"paid"; createdAt:string };

export type ServiceAgreement = { id:string; accountId:string; name:string; cadence:"weekly"|"fortnightly"|"monthly"|"quarterly"|"annual"|"custom"; nextServiceAt:string; active:boolean };
export type ServiceOrder = { id:string; accountId:string; contactId?:string; agreementId?:string; site?:string; status:WorkStatus; scheduledStart?:string; scheduledEnd?:string; assignedTo:string[]; parts:Record<string,number>; labourHours:number; completionNotes?:string; customerSignoffAt?:string; createdAt:string };

export type BillOfMaterialLine = { productId:string; quantity:number; scrapPercent?:number };
export type BillOfMaterial = { id:string; outputProductId:string; outputQuantity:number; version:string; active:boolean; components:BillOfMaterialLine[] };
export type RoutingOperation = { id:string; sequence:number; workCentreId:string; description:string; setupMinutes:number; runMinutes:number };
export type Routing = { id:string; outputProductId:string; version:string; operations:RoutingOperation[] };
export type WorkCentre = { id:string; name:string; hourlyCapacity:number; costPerHour:number; active:boolean };
export type ProductionOrder = { id:string; productId:string; quantity:number; bomId:string; routingId?:string; status:"planned"|"released"|"in-progress"|"complete"|"cancelled"; dueAt?:string; consumed:Record<string,number>; outputQuantity:number; createdAt:string };

export type OperatingStore = {
  industryPack:IndustryPack; locations:Location[]; inventory:InventoryBalance[]; movements:StockMovement[];
  salesOrders:SalesOrder[]; purchaseOrders:PurchaseOrder[]; projects:Project[]; projectTasks:ProjectTask[];
  variations:Variation[]; progressClaims:ProgressClaim[]; serviceAgreements:ServiceAgreement[]; serviceOrders:ServiceOrder[];
  boms:BillOfMaterial[]; routings:Routing[]; workCentres:WorkCentre[]; productionOrders:ProductionOrder[];
};

export function lineTotal(line: MoneyLine) { return Math.max(0,line.quantity) * Math.max(0,line.unitPrice); }
export function documentSubtotal(lines: MoneyLine[]) { return lines.reduce((sum,line)=>sum+lineTotal(line),0); }
export function documentTax(lines: MoneyLine[]) { return lines.reduce((sum,line)=>sum+lineTotal(line)*Math.max(0,line.taxRate),0); }

export function receivePurchaseOrder(order: PurchaseOrder, receipts: Record<string,number>, nowIso:string): PurchaseOrder {
  const received={...order.received};
  for(const line of order.lines){
    const requested=Math.max(0,Number(receipts[line.id]||0));
    const prior=Math.max(0,Number(received[line.id]||0));
    received[line.id]=Math.min(Math.max(0,line.quantity),prior+requested);
  }
  const complete=order.lines.every(line=>(received[line.id]||0)>=Math.max(0,line.quantity));
  const any=Object.values(received).some(value=>value>0);
  return {...order,received,status:complete?"received":any?"partially-received":order.status,updatedAt:nowIso};
}

export function transferStock(balance: InventoryBalance[], productId:string, fromLocationId:string, toLocationId:string, quantity:number) {
  if(quantity<=0) throw new Error("Transfer quantity must be positive.");
  const from=balance.find(item=>item.productId===productId&&item.locationId===fromLocationId);
  if(!from || from.onHand < quantity) throw new Error("Insufficient stock for transfer.");
  const to=balance.find(item=>item.productId===productId&&item.locationId===toLocationId);
  return balance.map(item=>{
    if(item===from){const onHand=item.onHand-quantity;return {...item,onHand,available:onHand-item.allocated};}
    if(item===to){const onHand=item.onHand+quantity;return {...item,onHand,available:onHand-item.allocated};}
    return item;
  }).concat(to?[]:[{productId,locationId:toLocationId,onHand:quantity,allocated:0,available:quantity,averageCost:from.averageCost}]);
}

export function projectEconomics(project:Project,tasks:ProjectTask[],variations:Variation[]) {
  const scoped=tasks.filter(task=>task.projectId===project.id);
  const approved=variations.filter(item=>item.projectId===project.id&&item.status==="approved");
  const budgetRevenue=project.budgetRevenue+approved.reduce((s,v)=>s+v.revenueChange,0);
  const budgetCost=project.budgetCost+approved.reduce((s,v)=>s+v.costChange,0);
  const actualCost=scoped.reduce((s,t)=>s+t.actualCost,0);
  return {budgetRevenue,budgetCost,actualCost,forecastMargin:budgetRevenue-Math.max(budgetCost,actualCost)};
}

export function adjustStocktake(balance:InventoryBalance[],productId:string,locationId:string,counted:number){
 const item=balance.find(x=>x.productId===productId&&x.locationId===locationId);if(!item)throw new Error("Stock item not found.");
 const safe=Math.max(0,Number(counted)||0),variance=safe-item.onHand,varianceValue=variance*item.averageCost;
 return{balances:balance.map(x=>x===item?{...x,onHand:safe,available:Math.max(0,safe-x.allocated)}:x),variance,varianceValue};
}
export function reorderItems(balance:InventoryBalance[]){return balance.filter(x=>x.available<=Math.max(0,x.reorderPoint||0));}
export function projectProfitability(project:Project,tasks:ProjectTask[],variations:Variation[],materialCost=0,otherExpenses=0){
 const e=projectEconomics(project,tasks,variations),labour=tasks.filter(t=>t.projectId===project.id).reduce((n,t)=>n+t.actualCost,0),cost=labour+Math.max(0,materialCost)+Math.max(0,otherExpenses),profit=e.budgetRevenue-cost;
 return{revenue:e.budgetRevenue,labour,materials:Math.max(0,materialCost),expenses:Math.max(0,otherExpenses),cost,profit,marginPercent:e.budgetRevenue>0?profit/e.budgetRevenue*100:0};
}

export function requiredBomComponents(bom:BillOfMaterial,outputQuantity:number){
  const factor=outputQuantity/Math.max(1,bom.outputQuantity);
  return Object.fromEntries(bom.components.map(line=>[line.productId,line.quantity*factor*(1+Math.max(0,line.scrapPercent||0)/100)]));
}

export const INDUSTRY_CAPABILITIES: Record<IndustryPack,string[]> = {
  hospitality:["pos","inventory","purchasing","people","daily-close","books","tax"],
  trades:["crm","quotes","sales-orders","projects","scheduling","variations","progress-claims","timesheets","purchasing","invoicing"],
  retail:["crm","pos","sales-orders","inventory","purchasing","returns","fulfilment","books"],
  "professional-services":["crm","proposals","projects","tasks","timesheets","retainers","invoicing","forecasting"],
  "field-service":["crm","service-agreements","service-orders","scheduling","dispatch","parts","signoff","recurring-invoices"],
  wholesale:["crm","sales-orders","purchasing","inventory","warehouse","pick-pack-ship","returns","receivables"],
  manufacturing:["crm","sales-orders","purchasing","inventory","boms","routings","work-centres","production-orders","warehouse","costing"],
};
