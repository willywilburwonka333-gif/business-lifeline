import type { CrmActivity,CrmOpportunity,CrmStore,CrmTask } from "./lifeline-crm.ts";
export type CustomerLifecycle={accountId:string;opportunityId:string;state:"lead"|"qualified"|"proposal"|"won"|"delivery"|"complete"|"lost";nextAction?:string;updatedAt:string};
const id=(p:string,seed:string)=>`${p}-${seed.replace(/[^a-z0-9]/gi,"").slice(-20)}`;
export function advanceOpportunity(store:CrmStore,opportunityId:string,stageId:string,nowIso:string):CrmStore{
 const opp=store.opportunities.find(x=>x.id===opportunityId);if(!opp)throw new Error("Opportunity not found");
 const pipeline=store.pipelines.find(x=>x.id===opp.pipelineId);const stage=pipeline?.stages.find(x=>x.id===stageId);if(!stage)throw new Error("Invalid pipeline stage");
 const opportunities=store.opportunities.map(x=>x.id===opportunityId?{...x,stageId,updatedAt:nowIso}:x);
 const activity:CrmActivity={id:id("activity",nowIso+opportunityId+stageId),type:"system",accountId:opp.accountId,opportunityId,subject:`${opp.title} moved to ${stage.name}`,occurredAt:nowIso,createdAt:nowIso};
 let tasks=store.tasks;
 if(stage.closed==="won"&&!tasks.some(t=>t.opportunityId===opportunityId&&t.status==="open")){
   const task:CrmTask={id:id("task",opportunityId+nowIso),accountId:opp.accountId,opportunityId,title:`Start delivery: ${opp.title}`,priority:"high",status:"open",createdAt:nowIso};tasks=[task,...tasks];
 }
 return{...store,opportunities,activities:[activity,...store.activities],tasks};
}
export function lifecycleFor(store:CrmStore,opportunity:CrmOpportunity):CustomerLifecycle{
 const stage=store.pipelines.find(p=>p.id===opportunity.pipelineId)?.stages.find(s=>s.id===opportunity.stageId);
 const state=stage?.closed==="won"?"won":stage?.closed==="lost"?"lost":opportunity.stageId==="proposal"||opportunity.stageId==="negotiation"?"proposal":opportunity.stageId==="qualified"?"qualified":"lead";
 return{accountId:opportunity.accountId,opportunityId:opportunity.id,state,nextAction:opportunity.nextAction,updatedAt:opportunity.updatedAt};
}
export function crmIntegrity(store:CrmStore){const errors:string[]=[];for(const o of store.opportunities){if(!store.accounts.some(a=>a.id===o.accountId))errors.push(`Opportunity ${o.id} has no account.`);if(!store.pipelines.some(p=>p.id===o.pipelineId&&p.stages.some(s=>s.id===o.stageId)))errors.push(`Opportunity ${o.id} has an invalid stage.`)}for(const c of store.contacts){if(c.accountId&&!store.accounts.some(a=>a.id===c.accountId))errors.push(`Contact ${c.id} has no account.`)}return{valid:errors.length===0,errors}}
