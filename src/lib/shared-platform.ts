export type PlatformRole="owner"|"admin"|"manager"|"member"|"viewer";
export type Permission="records.read"|"records.write"|"finance.write"|"people.write"|"automation.manage"|"audit.read";
const grants:Record<PlatformRole,Permission[]>={owner:["records.read","records.write","finance.write","people.write","automation.manage","audit.read"],admin:["records.read","records.write","finance.write","people.write","automation.manage","audit.read"],manager:["records.read","records.write","finance.write","people.write","audit.read"],member:["records.read","records.write"],viewer:["records.read"]};
export function can(role:PlatformRole,permission:Permission){return grants[role].includes(permission)}
export type AuditEvent={id:string;at:string;actor:string;action:string;recordType:string;recordId:string;summary:string};
export function auditEvent(input:Omit<AuditEvent,"id"|"at">,now=new Date().toISOString()):AuditEvent{return{id:"audit-"+now+"-"+input.recordId,at:now,...input}}
export type AutomationRule={id:string;name:string;enabled:boolean;trigger:"record-created"|"status-changed"|"date-due"|"stock-low";recordType:string;conditionField?:string;conditionValue?:string;action:"notify"|"create-task"|"flag-record";actionValue:string};
export function evaluateAutomation(rule:AutomationRule,event:{trigger:AutomationRule["trigger"];recordType:string;record:Record<string,unknown>}){if(!rule.enabled||rule.trigger!==event.trigger||rule.recordType!==event.recordType)return false;if(!rule.conditionField)return true;return String(event.record[rule.conditionField]??"")===String(rule.conditionValue??"")}
export function dashboardSeries(values:number[],maxPoints=12){return values.slice(-Math.max(1,maxPoints)).map((value,index)=>({index,value:Number(value)||0}))}
