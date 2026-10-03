import {appendJournal,type BooksStore,type LedgerJournal} from "./lifeline-books-engine.ts";

export type AccountingCorrection={
  id:string; originalSource:string; reversalSource:string; replacementSource?:string;
  reason:string; actor:string; correctedAt:string;
};
const round=(n:number)=>Math.round((Number(n)||0)*100)/100;
export function reverseJournal(store:BooksStore,source:string,input:{id:string;date:string;reason:string;actor:string}){
 const original=store.journals.find(j=>j.source===source);
 if(!original)return{store,added:false,reason:"source-not-found" as const};
 if(!input.reason.trim()||!input.actor.trim())return{store,added:false,reason:"audit-required" as const};
 const reversalSource="REVERSAL:"+source;
 const reversal:LedgerJournal={id:input.id,date:input.date,memo:`Reversal: ${original.memo} · ${input.reason.trim()}`,source:reversalSource,lines:original.lines.map(l=>({...l,side:l.side==="debit"?"credit":"debit",amount:round(l.amount)}))};
 const posted=appendJournal(store,reversal);
 return{...posted,correction:posted.added?{id:input.id,originalSource:source,reversalSource,reason:input.reason.trim(),actor:input.actor,correctedAt:input.date}:undefined};
}
export function correctingJournal(store:BooksStore,originalSource:string,replacement:LedgerJournal,input:{reversalId:string;date:string;reason:string;actor:string}){
 const reversed=reverseJournal(store,originalSource,{id:input.reversalId,date:input.date,reason:input.reason,actor:input.actor});
 if(!reversed.added)return{store,added:false,reason:reversed.reason};
 const posted=appendJournal(reversed.store,replacement);
 if(!posted.added)return{store,added:false,reason:posted.reason};
 return{store:posted.store,added:true,reason:"corrected" as const,correction:{...reversed.correction!,replacementSource:replacement.source}};
}
export function accountingLineage(store:BooksStore,source:string){
 const original=store.journals.find(j=>j.source===source);
 const reversal=store.journals.find(j=>j.source==="REVERSAL:"+source);
 return{original,reversal,corrected:Boolean(original&&reversal)};
}
