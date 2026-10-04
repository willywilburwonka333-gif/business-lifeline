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
