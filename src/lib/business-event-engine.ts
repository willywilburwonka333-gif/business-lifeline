export type BusinessEventType="MRI_COMPLETED"|"RECOVERY_ACTION_CHANGED"|"CRM_STAGE_CHANGED"|"QUOTE_ACCEPTED"|"JOB_CREATED"|"SALE_COMPLETED"|"PAYMENT_RECEIVED"|"SUPPLIER_BILL_APPROVED"|"STOCK_MOVED"|"PAYROLL_FINALISED"|"PRODUCTION_COMPLETED";
export type BusinessEvent<T=Record<string,unknown>>={id:string;type:BusinessEventType;businessId:string;actorId:string;occurredAt:string;entityType:string;entityId:string;correlationId:string;causationId?:string;payload:T};
export type EventHandler<T=Record<string,unknown>>=(event:BusinessEvent<T>)=>void|Promise<void>;
export function businessEvent<T>(input:Omit<BusinessEvent<T>,"id">):BusinessEvent<T>{
 if(!input.businessId||!input.actorId||!input.entityId||!input.correlationId)throw new Error("Business event requires business, actor, entity and correlation IDs.");
 return{id:`evt-${input.type.toLowerCase()}-${input.entityId}-${input.occurredAt}`,...input};
}
export function eventKey(event:BusinessEvent){return [event.businessId,event.type,event.entityType,event.entityId,event.correlationId].join(":")}
export function applyEventOnce<T>(seen:Set<string>,event:BusinessEvent<T>,handler:EventHandler<T>){
 const key=eventKey(event);if(seen.has(key))return{applied:false,key};seen.add(key);
 try{const result=handler(event);return{applied:true,key,result}}catch(error){seen.delete(key);throw error}
}
export function eventIntegrity(events:BusinessEvent[]){const errors:string[]=[],ids=new Set<string>(),keys=new Set<string>();for(const e of events){if(ids.has(e.id))errors.push(`Duplicate event id ${e.id}.`);ids.add(e.id);const k=eventKey(e);if(keys.has(k))errors.push(`Duplicate business event ${k}.`);keys.add(k);if(!e.occurredAt||Number.isNaN(Date.parse(e.occurredAt)))errors.push(`Event ${e.id} has invalid time.`)}return{valid:errors.length===0,errors}}
