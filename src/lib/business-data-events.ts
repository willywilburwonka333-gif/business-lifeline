export type BusinessDataDomain="books"|"crm"|"operations"|"pos"|"people"|"tax"|"mri"|"automation"|"cloud"|"other";
export type BusinessDataChange={domain:BusinessDataDomain;entityType?:string;entityId?:string;reason:string;at:string};
export const BUSINESS_DATA_CHANGED="business-lifeline-data-changed";
export function notifyBusinessDataChanged(change:Omit<BusinessDataChange,"at">&{at?:string}){
 if(typeof window==="undefined")return;
 const detail:BusinessDataChange={...change,at:change.at??new Date().toISOString()};
 window.dispatchEvent(new CustomEvent<BusinessDataChange>(BUSINESS_DATA_CHANGED,{detail}));
}
export function subscribeBusinessDataChanged(handler:(change:BusinessDataChange)=>void){
 if(typeof window==="undefined")return()=>{};
 const listener=(event:Event)=>handler((event as CustomEvent<BusinessDataChange>).detail);
 window.addEventListener(BUSINESS_DATA_CHANGED,listener);
 return()=>window.removeEventListener(BUSINESS_DATA_CHANGED,listener);
}

export type BusinessSubsystem="books"|"crm"|"operations"|"inventory"|"payroll"|"tax"|"mri"|"recovery"|"cloud"|"dashboard";
const IMPACT:Record<BusinessDataDomain,BusinessSubsystem[]>={
 books:["books","mri","recovery","cloud","dashboard"],
 crm:["crm","operations","recovery","cloud","dashboard"],
 operations:["operations","inventory","books","mri","recovery","cloud","dashboard"],
 pos:["inventory","books","mri","recovery","cloud","dashboard"],
 people:["payroll","books","mri","recovery","cloud","dashboard"],
 tax:["tax","mri","recovery","cloud","dashboard"],
 mri:["mri","recovery","crm","dashboard"],
 automation:["operations","crm","dashboard","cloud"],
 cloud:["books","crm","operations","inventory","payroll","tax","mri","recovery","dashboard"],
 other:["dashboard","cloud"],
};
export function affectedSubsystems(domain:BusinessDataDomain){return[...IMPACT[domain]]}
export function propagationContract(){return Object.fromEntries(Object.entries(IMPACT).map(([domain,targets])=>[domain,[...targets]])) as Record<BusinessDataDomain,BusinessSubsystem[]>}
