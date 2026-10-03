import{businessEvent,type BusinessEvent}from"./business-event-engine.ts";import{documentSubtotal,documentTax,type OperatingStore,type SalesOrder,type Project}from"./lifeline-operations.ts";import type{BooksStore,SalesDocument}from"./lifeline-books-engine.ts";import{issueInvoiceTransaction}from"./unified-transaction-engine.ts";
export type FulfilmentResult={operations:OperatingStore;books:BooksStore;invoice:SalesDocument;events:BusinessEvent[];applied:boolean;reason:string};
export function fulfilSalesOrder(input:{operations:OperatingStore;books:BooksStore;orderId:string;customerName:string;actorId:string;businessId:string;at:string;correlationId:string}):FulfilmentResult{
 const order=input.operations.salesOrders.find(x=>x.id===input.orderId);if(!order)return fail(input,"sales-order-not-found");
 if(order.status==="cancelled"||order.status==="fulfilled")return fail(input,"invalid-sales-order-state");
 const shortage=order.lines.find(l=>l.productId&&((input.operations.inventory.find(i=>i.productId===l.productId&&(!order.locationId||i.locationId===order.locationId))?.available??0)<l.quantity));if(shortage)return fail(input,"insufficient-stock");
 const total=Math.round((documentSubtotal(order.lines)+documentTax(order.lines))*100)/100;
 const invoice:SalesDocument={id:"invoice-"+order.id,number:"AUTO-"+order.id,kind:"invoice",customer:input.customerName,date:input.at.slice(0,10),due:"",status:"sent",items:order.lines.map(l=>({description:l.description,qty:l.quantity,rate:Math.round(l.unitPrice*(1+Math.max(0,l.taxRate))*100)/100,gst:l.taxRate>0?"gst":"free"})),payments:0,notes:"Generated from sales order "+order.id};
 const posted=issueInvoiceTransaction(input.books,invoice,{businessId:input.businessId,actorId:input.actorId,correlationId:input.correlationId,at:input.at});if(!posted.applied)return fail(input,posted.reason,invoice);
 const inventory=input.operations.inventory.map(i=>{const qty=order.lines.filter(l=>l.productId===i.productId&&(!order.locationId||i.locationId===order.locationId)).reduce((n,l)=>n+l.quantity,0);if(!qty)return i;const onHand=i.onHand-qty;return{...i,onHand,available:onHand-i.allocated}});
 const operations={...input.operations,inventory,salesOrders:input.operations.salesOrders.map(x=>x.id===order.id?{...x,status:"fulfilled" as const,updatedAt:input.at}:x)};
 const event=businessEvent({type:"STOCK_MOVED",businessId:input.businessId,actorId:input.actorId,occurredAt:input.at,entityType:"sales-order",entityId:order.id,correlationId:input.correlationId,payload:{total}});
 return{operations,books:posted.store,invoice,events:[...posted.events,event],applied:true,reason:"applied"};
}
function fail(input:{operations:OperatingStore;books:BooksStore},reason:string,invoice?:SalesDocument):FulfilmentResult{return{operations:input.operations,books:input.books,invoice:invoice??({} as SalesDocument),events:[],applied:false,reason}}
export function createProjectFromOrder(order:SalesOrder,now:string):Project{return{id:"project-"+order.id,accountId:order.accountId,salesOrderId:order.id,name:"Delivery "+order.id,status:"planned",budgetRevenue:documentSubtotal(order.lines)+documentTax(order.lines),budgetCost:0,createdAt:now,updatedAt:now}}
