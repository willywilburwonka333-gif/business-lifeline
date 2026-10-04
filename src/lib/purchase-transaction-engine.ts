import{postSupplierBill,type BooksStore,type SupplierBill}from"./lifeline-books-engine.ts";
import{businessEvent,type BusinessEvent}from"./business-event-engine.ts";
import{receivePurchaseOrder,type OperatingStore,type PurchaseOrder}from"./lifeline-operations.ts";
const round=(n:number)=>Math.round(n*100)/100;
export function receivePurchaseOrderTransaction(input:{operations:OperatingStore;books:BooksStore;orderId:string;receipts:Record<string,number>;supplierName:string;businessId:string;actorId:string;at:string;correlationId:string}){
 const order=input.operations.purchaseOrders.find(x=>x.id===input.orderId);if(!order)return{applied:false as const,reason:"order-not-found",operations:input.operations,books:input.books,events:[] as BusinessEvent[]};
 const updated=receivePurchaseOrder(order,input.receipts,input.at);
 let inventory=[...input.operations.inventory],movements=[...input.operations.movements],receivedValue=0;
 for(const line of order.lines){const before=Number(order.received[line.id]||0),after=Number(updated.received[line.id]||0),qty=Math.max(0,after-before);if(qty<=0)continue;receivedValue+=qty*line.unitPrice;if(line.productId){const current=inventory.find(x=>x.productId===line.productId&&x.locationId===order.locationId);if(current){inventory=inventory.map(x=>x===current?{...x,onHand:x.onHand+qty,available:x.available+qty,averageCost:round(((x.onHand*x.averageCost)+(qty*line.unitPrice))/Math.max(1,x.onHand+qty))}:x)}else inventory.push({productId:line.productId,locationId:order.locationId,onHand:qty,allocated:0,available:qty,averageCost:line.unitPrice});movements=[{id:`receipt-${order.id}-${line.id}-${after}`,productId:line.productId,toLocationId:order.locationId,quantity:qty,kind:"receipt",occurredAt:input.at,sourceId:order.id},...movements]}}
 if(receivedValue<=0)return{applied:false as const,reason:"nothing-received",operations:input.operations,books:input.books,events:[] as BusinessEvent[]};
 const gst=round(receivedValue/11),bill:SupplierBill={id:`po-bill-${order.id}-${Object.values(updated.received).reduce((n,x)=>n+Number(x||0),0)}`,number:`PO-${order.id}`,supplier:input.supplierName,date:input.at.slice(0,10),due:"",amount:round(receivedValue),gst,status:"approved",paid:0};
 const posted=postSupplierBill(input.books,bill);if(!posted.added)return{applied:false as const,reason:"ledger-rejected",operations:input.operations,books:input.books,events:[] as BusinessEvent[]};
 const operations={...input.operations,purchaseOrders:input.operations.purchaseOrders.map(x=>x.id===order.id?updated:x),inventory,movements};
 const billEvent=businessEvent({type:"SUPPLIER_BILL_APPROVED",businessId:input.businessId,actorId:input.actorId,occurredAt:input.at,entityType:"supplier-bill",entityId:bill.id,correlationId:input.correlationId,payload:{amount:bill.amount,supplier:bill.supplier,orderId:order.id}});
 const stockEvent=businessEvent({type:"STOCK_MOVED",businessId:input.businessId,actorId:input.actorId,occurredAt:input.at,entityType:"purchase-order",entityId:order.id,correlationId:input.correlationId,causationId:billEvent.id,payload:{total:round(receivedValue),kind:"receipt"}});
 return{applied:true as const,reason:"received",operations,books:{...posted.store,bills:[bill,...posted.store.bills]},bill,events:[billEvent,stockEvent]};
}
