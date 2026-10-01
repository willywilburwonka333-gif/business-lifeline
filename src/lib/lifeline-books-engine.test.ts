import {
  agedPayables,
  agedReceivables,
  agingTotals,
  balanceSheet,
  booksIntegrity,
  cashflowSummary,
  gstSummary,
  profitAndLoss,
  trialBalance,
  validateJournal,
  postInvoice,
  postCreditNote,
  postSupplierBill,
  postCustomerPayment,
  postSupplierPayment,
  type BooksStore,
} from "./lifeline-books-engine";

const store: BooksStore = {
  journals: [
    { id:"j1", date:"2026-07-01", memo:"Opening bank", source:"TEST:OPEN", lines:[
      { account:"Bank", side:"debit", amount:10000 },
      { account:"Owner Equity", side:"credit", amount:10000 },
    ]},
    { id:"j2", date:"2026-07-02", memo:"Invoice", source:"TEST:INV", lines:[
      { account:"Accounts Receivable", side:"debit", amount:1100 },
      { account:"Sales Revenue", side:"credit", amount:1000 },
      { account:"GST Payable", side:"credit", amount:100 },
    ]},
    { id:"j3", date:"2026-07-03", memo:"Expense", source:"TEST:EXP", lines:[
      { account:"Operating Expense", side:"debit", amount:500 },
      { account:"GST Input Credit", side:"debit", amount:50 },
      { account:"Bank", side:"credit", amount:550 },
    ]},
    { id:"j4", date:"2026-07-04", memo:"Receive customer", source:"TEST:PAY", lines:[
      { account:"Bank", side:"debit", amount:1100 },
      { account:"Accounts Receivable", side:"credit", amount:1100 },
    ]},
  ],
  docs:[
    { id:"i1", number:"INV-1", kind:"invoice", customer:"Acme", date:"2026-06-01", due:"2026-06-15", status:"sent", items:[{description:"Work",qty:1,rate:1100,gst:"gst"}], payments:0, notes:"" },
  ],
  bills:[
    { id:"b1", number:"BILL-1", supplier:"Supplier", date:"2026-06-01", due:"2026-06-15", amount:550, gst:50, status:"approved", paid:0 },
  ],
  refunds:[], nextQuote:1,nextInvoice:2,nextCredit:1,lockDate:"",
};

for (const journal of store.journals) {
  if (!validateJournal(journal).balanced) throw new Error("Balanced test journal rejected: "+journal.id);
}
const tb=trialBalance(store);
if (Math.round(tb.reduce((s,r)=>s+r.debit,0)*100)!==Math.round(tb.reduce((s,r)=>s+r.credit,0)*100)) throw new Error("Trial balance does not balance.");

const pnl=profitAndLoss(store);
if (pnl.totalIncome!==1000 || pnl.totalExpenses!==500 || pnl.netProfit!==500) throw new Error("P&L calculation failed.");

const bs=balanceSheet(store);
if (Math.abs(bs.equationDifference)>.01) throw new Error("Balance sheet equation failed: "+bs.equationDifference);

const cf=cashflowSummary(store);
if (cf.operating!==550) throw new Error("Operating cashflow failed: "+cf.operating);

const ar=agedReceivables(store,"2026-09-30");
if (ar.length!==1 || ar[0].bucket!=="90+" || agingTotals(ar).total!==1100) throw new Error("Aged receivables failed.");

const ap=agedPayables(store,"2026-09-30");
if (ap.length!==1 || ap[0].bucket!=="90+" || agingTotals(ap).total!==550) throw new Error("Aged payables failed.");

const gst=gstSummary(store,"2026-01-01","2026-12-31");
if (gst.gstOnSales!==100 || gst.gstCredits!==50 || gst.estimatedNetGst!==50) throw new Error("GST summary failed.");

const integrity=booksIntegrity(store);
if (!integrity.balanced || integrity.unbalanced.length) throw new Error("Books integrity failed.");

const invoice=store.docs[0];let flow=postInvoice({...store,journals:[]},invoice);if(!flow.added)throw new Error("Invoice posting failed.");if(!booksIntegrity(flow.store).balanced)throw new Error("Invoice journal unbalanced.");const duplicate=postInvoice(flow.store,invoice);if(duplicate.added)throw new Error("Duplicate invoice source was accepted.");flow=postCustomerPayment(flow.store,invoice,1100,"2026-07-05","pay-1");if(!flow.added||!booksIntegrity(flow.store).balanced)throw new Error("Customer payment failed.");
const credit={...invoice,id:"c1",number:"CR-1",kind:"credit" as const,date:"2026-07-06"};const credited=postCreditNote(flow.store,credit);if(!credited.added||!booksIntegrity(credited.store).balanced)throw new Error("Credit note failed.");
let apflow=postSupplierBill({...store,journals:[]},store.bills[0]);if(!apflow.added||!booksIntegrity(apflow.store).balanced)throw new Error("Supplier bill failed.");apflow=postSupplierPayment(apflow.store,store.bills[0],550,"2026-07-07","billpay-1");if(!apflow.added||!booksIntegrity(apflow.store).balanced)throw new Error("Supplier payment failed.");
