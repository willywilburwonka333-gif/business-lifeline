import { agedPayables, agedReceivables, balanceSheet, profitAndLoss, readBooksStore, trialBalance } from "./lifeline-books-engine";
import type { BusinessData, RevenueTrend } from "./types";
const round=(n:number)=>Math.round((Number(n)||0)*100)/100;
export type FinanceEvidence={asAt:string;periodStart:string;periodEnd:string;revenue:number;costOfSales:number;expenses:number;cash:number;receivables:number;overdueReceivables:number;payables:number;overduePayables:number;taxLiabilities:number;confidence:"ledger-derived";notes:string[]};
export function financeEvidence(periodStart?:string,periodEnd?:string):FinanceEvidence{
 const store=readBooksStore(),end=periodEnd||new Date().toISOString().slice(0,10),start=periodStart||(()=>{const d=new Date(end+"T00:00:00Z");d.setUTCMonth(d.getUTCMonth()-1);return d.toISOString().slice(0,10)})();
 const pnl=profitAndLoss(store,undefined,start,end),bs=balanceSheet(store,undefined,end),tb=trialBalance(store,undefined,undefined,end),ar=agedReceivables(store,end),ap=agedPayables(store,end);
 const bal=(name:string)=>tb.find(x=>x.account.toLowerCase()===name.toLowerCase())?.balance||0;
 const cash=Math.max(0,bal("Bank")+bal("Cash on Hand")+bal("Card Clearing")),receivables=Math.max(0,ar.reduce((n,x)=>n+x.outstanding,0)),payables=Math.max(0,ap.reduce((n,x)=>n+x.outstanding,0));
 const overdueReceivables=ar.filter(x=>x.daysOverdue>0).reduce((n,x)=>n+x.outstanding,0),overduePayables=ap.filter(x=>x.daysOverdue>0).reduce((n,x)=>n+x.outstanding,0);
 const taxLiabilities=Math.max(0,bal("GST Payable")-Math.max(0,bal("GST Input Credit")))+Math.max(0,bal("PAYG Withholding Payable"))+Math.max(0,bal("Tax Payable"));
 return{asAt:end,periodStart:start,periodEnd:end,revenue:round(pnl.totalIncome),costOfSales:round(pnl.totalCostOfSales),expenses:round(pnl.totalExpenses),cash:round(cash),receivables:round(receivables),overdueReceivables:round(overdueReceivables),payables:round(payables),overduePayables:round(overduePayables),taxLiabilities:round(taxLiabilities),confidence:"ledger-derived",notes:["Derived from posted Lifeline Books records.","Owner drawings, loan repayments and contextual MRI answers remain human/context inputs unless separately recorded."]};
}
export function applyFinanceEvidence(base:BusinessData,evidence=financeEvidence()):BusinessData{
 const monthlyRevenue=Math.max(0,evidence.revenue),operating=Math.max(0,evidence.costOfSales+evidence.expenses);
 const prior=base.monthlyRevenue,trend:RevenueTrend=prior>0?monthlyRevenue>prior*1.05?"growing":monthlyRevenue<prior*.95?"declining":"stable":base.revenueTrend;
 return{...base,monthlyRevenue,fixedExpenses:operating,variableExpenses:0,cashAvailable:evidence.cash,accountsReceivable:evidence.receivables,overdueInvoices:evidence.overdueReceivables,overdueSuppliers:evidence.overduePayables,overdueTax:evidence.taxLiabilities,revenueTrend:trend};
}