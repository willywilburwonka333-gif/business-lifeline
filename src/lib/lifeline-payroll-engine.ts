export type PayComponentKind="ordinary"|"overtime"|"paid-leave"|"allowance"|"bonus-commission"|"deduction";
export type PayComponent={kind:PayComponentKind;description:string;hours?:number;rate?:number;amount?:number;stpCode?:string;qualifyingEarnings?:boolean};
export type PayrollEmployee={id:string;name:string;hourlyRate:number;superRatePercent:number;withholdingRatePercent:number};
export type PayrollResult={components:PayComponent[];ordinaryGross:number;overtime:number;paidLeave:number;allowances:number;bonuses:number;deductions:number;gross:number;payg:number;qualifyingEarnings:number;super:number;net:number;stp:{gross:number;overtime:number;paidLeave:number;allowances:number;bonuses:number;payg:number;super:number}};
const round=(n:number)=>Math.round((Number(n)||0)*100)/100;
export function calculatePayroll(employee:PayrollEmployee,components:PayComponent[]):PayrollResult{
 const amount=(c:PayComponent)=>round(c.amount??((c.hours||0)*(c.rate??employee.hourlyRate)));
 const sum=(kind:PayComponentKind)=>round(components.filter(c=>c.kind===kind).reduce((n,c)=>n+amount(c),0));
 const ordinaryGross=sum("ordinary"),overtime=sum("overtime"),paidLeave=sum("paid-leave"),allowances=sum("allowance"),bonuses=sum("bonus-commission"),deductions=sum("deduction");
 const gross=round(ordinaryGross+overtime+paidLeave+allowances+bonuses);
 const payg=round(gross*Math.max(0,employee.withholdingRatePercent)/100);
 const qualifyingEarnings=round(components.filter(c=>c.kind!=="deduction"&&c.qualifyingEarnings!==false).reduce((n,c)=>n+amount(c),0));
 const superAmount=round(qualifyingEarnings*Math.max(0,employee.superRatePercent)/100);
 const net=round(gross-payg-deductions);
 return{components,ordinaryGross,overtime,paidLeave,allowances,bonuses,deductions,gross,payg,qualifyingEarnings,super:superAmount,net,stp:{gross:ordinaryGross,overtime,paidLeave,allowances,bonuses,payg,super:superAmount}};
}
export function payrollJournalLines(result:PayrollResult){
 return[{account:"Wages & Salaries",side:"debit" as const,amount:result.gross},...(result.super>0?[{account:"Superannuation Expense",side:"debit" as const,amount:result.super}]:[]),...(result.payg>0?[{account:"PAYG Withholding Payable",side:"credit" as const,amount:result.payg}]:[]),...(result.super>0?[{account:"Superannuation Payable",side:"credit" as const,amount:result.super}]:[]),{account:"Payroll Clearing",side:"credit" as const,amount:result.net},...(result.deductions>0?[{account:"Payroll Deductions Payable",side:"credit" as const,amount:result.deductions}]:[])];
}
export function validatePayroll(result:PayrollResult){const lines=payrollJournalLines(result);const d=round(lines.filter(x=>x.side==="debit").reduce((n,x)=>n+x.amount,0)),c=round(lines.filter(x=>x.side==="credit").reduce((n,x)=>n+x.amount,0));return{balanced:d===c,debits:d,credits:c,stpDisaggregated:round(result.stp.gross+result.stp.overtime+result.stp.paidLeave+result.stp.allowances+result.stp.bonuses)===result.gross};}
