import type{CrmStore,CrmTask}from"./lifeline-crm.ts";
export type CadenceStep={afterDays:number;title:string;priority:"low"|"normal"|"high"};
export type FollowupCadence={id:string;name:string;steps:CadenceStep[]};
const taskId=(opp:string,index:number)=>`cadence-${opp}-${index}`;
export function applyCadence(store:CrmStore,opportunityId:string,cadence:FollowupCadence,startIso:string){
 const opp=store.opportunities.find(x=>x.id===opportunityId);if(!opp)throw new Error("Opportunity not found.");
 const existing=new Set(store.tasks.map(t=>t.id));const additions:CrmTask[]=[];
 cadence.steps.forEach((step,index)=>{const id=taskId(opportunityId,index);if(existing.has(id))return;const due=new Date(Date.parse(startIso)+Math.max(0,step.afterDays)*86400000).toISOString();additions.push({id,accountId:opp.accountId,opportunityId,title:step.title,dueAt:due,priority:step.priority,status:"open",createdAt:startIso})});
 return{...store,tasks:[...additions,...store.tasks]}
}
export function defaultSalesCadence(stageId:string):FollowupCadence{
 if(stageId==="proposal")return{id:"proposal-followup",name:"Proposal follow-up",steps:[{afterDays:2,title:"Check proposal received",priority:"normal"},{afterDays:5,title:"Resolve proposal objections",priority:"high"},{afterDays:10,title:"Decision follow-up",priority:"high"}]};
 if(stageId==="qualified")return{id:"qualified-followup",name:"Qualified lead follow-up",steps:[{afterDays:1,title:"Confirm needs and decision process",priority:"normal"},{afterDays:4,title:"Schedule next sales conversation",priority:"normal"}]};
 return{id:"lead-followup",name:"Lead follow-up",steps:[{afterDays:1,title:"Initial follow-up",priority:"normal"},{afterDays:3,title:"Second follow-up",priority:"normal"},{afterDays:7,title:"Final nurture follow-up",priority:"low"}]}
}
export function cadenceIntegrity(store:CrmStore){const errors:string[]=[];const ids=new Set<string>();for(const t of store.tasks){if(ids.has(t.id))errors.push(`Duplicate CRM task ${t.id}.`);ids.add(t.id);if(t.opportunityId&&!store.opportunities.some(o=>o.id===t.opportunityId))errors.push(`Task ${t.id} references missing opportunity.`)}return{valid:errors.length===0,errors}}
