import type{AuditEvent}from"./shared-platform.ts";import type{BusinessEvent}from"./business-event-engine.ts";
export type AuditLink={auditId:string;eventId?:string;correlationId:string;actor:string;recordType:string;recordId:string;at:string};
export function linkAuditToEvent(audit:AuditEvent,event?:BusinessEvent):AuditLink{
 if(event&&event.actorId!==audit.actor)throw new Error("Audit actor does not match business event actor.");
 if(event&&event.entityId!==audit.recordId)throw new Error("Audit record does not match business event entity.");
 return{auditId:audit.id,eventId:event?.id,correlationId:event?.correlationId??audit.id,actor:audit.actor,recordType:audit.recordType,recordId:audit.recordId,at:audit.at}
}
export function auditLineageIntegrity(links:AuditLink[],events:BusinessEvent[]){
 const errors:string[]=[],eventIds=new Set(events.map(e=>e.id)),seenAudit=new Set<string>();
 for(const l of links){
  if(seenAudit.has(l.auditId))errors.push(`Duplicate audit link ${l.auditId}.`);
  seenAudit.add(l.auditId);
  if(l.eventId&&!eventIds.has(l.eventId))errors.push(`Audit link ${l.auditId} references missing event ${l.eventId}.`);
  if(!l.actor||!l.recordType||!l.recordId)errors.push(`Audit link ${l.auditId} is incomplete.`);
 }
 return{valid:errors.length===0,errors}
}
