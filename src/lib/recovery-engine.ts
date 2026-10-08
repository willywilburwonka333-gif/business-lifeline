import type { BusinessData, BusinessReport } from "./types.ts";
import type { DiagnosticStandard } from "./business-health-standard.ts";

export type RecoveryFinding = {
  id:string; area:"cash"|"obligations"|"receivables"|"debt"|"margin"|"revenue"|"evidence";
  severity:"critical"|"high"|"watch"; finding:string; rootCause:string; monthlyImpact:number|null;
  action:string; timeframe:"today"|"7-days"|"30-days"|"90-days"; measure:string;
};

const round=(n:number)=>Math.round(n*100)/100;

export function buildRecoveryFindings(data:BusinessData,report:BusinessReport,standard:DiagnosticStandard):RecoveryFinding[]{
 const m=report.metrics; const out:RecoveryFinding[]=[];
 if(m.monthlyOperatingResult<0)out.push({id:"cash-deficit",area:"cash",severity:m.runwayMonths!==null&&m.runwayMonths<2?"critical":"high",finding:`Estimated monthly cash outgoings exceed revenue by ${Math.abs(m.monthlyOperatingResult).toFixed(0)} after drawings and loan repayments.`,rootCause:"The supplied monthly inputs indicate a cash shortfall. Verify actual receipts, operating expenses, drawings, debt repayments and payment timing before identifying causes.",monthlyImpact:round(Math.abs(m.monthlyOperatingResult)),action:"Build a weekly cash-control plan and identify enough cost, pricing or sales changes to close the monthly deficit.",timeframe:"today",measure:"Monthly operating result reaches break-even or better."});
 const obligations=data.overdueTax+data.overdueSuppliers;
 if(obligations>0)out.push({id:"overdue-obligations",area:"obligations",severity:obligations>data.cashAvailable?"critical":"high",finding:`${obligations.toFixed(0)} of tax and supplier obligations are reported overdue.`,rootCause:"Overdue tax and supplier balances were reported; the reasons, due dates and payment options have not yet been independently confirmed.",monthlyImpact:null,action:"Confirm each overdue balance, due date and enforcement status; arrange qualified advice or payment arrangements where required.",timeframe:"today",measure:"Every overdue obligation has a confirmed balance, owner and documented resolution path."});
 if(data.overdueInvoices>0)out.push({id:"receivables",area:"receivables",severity:data.accountsReceivable>0&&data.overdueInvoices/data.accountsReceivable>=.4?"high":"watch",finding:`${data.overdueInvoices.toFixed(0)} of customer invoices are reported overdue.`,rootCause:"Reported overdue invoices may be delaying collections; check aging, disputes and collectability before concluding why cash is tight.",monthlyImpact:null,action:"Prioritise collection of overdue invoices, confirm disputed amounts and tighten payment follow-up.",timeframe:"7-days",measure:"Overdue receivables reduce from the current baseline."});
 if(m.operatingMargin<5)out.push({id:"margin",area:"margin",severity:m.operatingMargin<0?"critical":"high",finding:`Operating margin is ${m.operatingMargin}% on the supplied monthly figures.`,rootCause:"The reported revenue and operating costs produce a low margin; actual prices, product mix and cost allocation need verification.",monthlyImpact:m.monthlyOperatingResult<0?round(Math.abs(m.monthlyOperatingResult)):null,action:"Review pricing, direct costs and recurring overheads by product/service and protect contribution margin.",timeframe:"30-days",measure:"Operating margin improves against this MRI baseline."});
 if(m.debtPressure>35)out.push({id:"debt",area:"debt",severity:m.debtPressure>70?"high":"watch",finding:`Recorded debt equals approximately ${m.debtPressure}% of annualised revenue.`,rootCause:"Debt relative to sales is a screening signal, not a solvency or affordability finding; repayment schedules and liquidity still need review.",monthlyImpact:round(data.loanRepayments),action:"Map every facility, rate, repayment and security; test refinance/restructure options with an appropriate adviser where useful.",timeframe:"30-days",measure:"Debt-service burden and arrears trend improve without worsening liquidity."});
 if(data.revenueTrend==="declining")out.push({id:"revenue",area:"revenue",severity:"high",finding:"Revenue is reported as declining.",rootCause:"The owner selected a declining revenue trend; its causes and the relevance of seasonality, pricing or customer mix still need investigation.",monthlyImpact:null,action:"Measure lead volume, conversion, average sale and customer retention weekly; choose the weakest driver for a focused recovery experiment.",timeframe:"7-days",measure:"Weekly leading sales indicator and monthly revenue trend stabilise or improve."});
 if(standard.dataWarnings.length)out.push({id:"evidence",area:"evidence",severity:"watch",finding:"The MRI contains evidence-quality warnings.",rootCause:standard.dataWarnings.join(" "),monthlyImpact:null,action:"Reconcile the conflicting or incomplete source records before relying on fine-grained conclusions.",timeframe:"7-days",measure:"Evidence warnings are resolved and evidence confidence increases."});
 return out.sort((a,b)=>({critical:0,high:1,watch:2}[a.severity]-{critical:0,high:1,watch:2}[b.severity]));
}

export function recoveryProgress(baseline:DiagnosticStandard,current:DiagnosticStandard){
 const delta=current.score-baseline.score;
 return {baselineScore:baseline.score,currentScore:current.score,delta,direction:delta>0?"improving":delta<0?"deteriorating":"unchanged" as "improving"|"deteriorating"|"unchanged"};
}
