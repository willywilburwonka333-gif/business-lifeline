"use client";

import { useMemo, useState } from "react";
import { BUSINESS } from "@/lib/legal-content";
import { DIAGNOSTIC_OFFERS } from "@/lib/diagnostic-offers";

const SETTINGS_KEY = "business-lifeline-owner-invoice-settings-v1";
const HISTORY_KEY = "business-lifeline-owner-invoice-history-v1";

type Settings = { phone:string; email:string; bankName:string; accountName:string; bsb:string; accountNumber:string; gstRegistered:boolean; };
type Customer = { name:string; business:string; email:string; phone:string; address:string; abn:string; };
type InvoiceRecord = { number:string; issued:string; due:string; customer:Customer; description:string; amount:number; gstRegistered:boolean; status:"issued"|"paid"; };

const defaultSettings:Settings={phone:"",email:BUSINESS.supportEmail,bankName:"",accountName:BUSINESS.businessName,bsb:"",accountNumber:"",gstRegistered:false};
const emptyCustomer:Customer={name:"",business:"",email:"",phone:"",address:"",abn:""};
const read=<T,>(key:string,fallback:T):T=>{if(typeof window==="undefined")return fallback;try{return JSON.parse(localStorage.getItem(key)||"") as T}catch{return fallback}};
const money=(n:number)=>new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD"}).format(n);
const today=()=>new Date().toISOString().slice(0,10);
const nextNumber=()=>{const rows=read<InvoiceRecord[]>(HISTORY_KEY,[]);const max=rows.reduce((m,r)=>Math.max(m,Number(r.number.replace(/\D/g,""))||0),0);return `BL-${String(max+1).padStart(4,"0")}`};

export function CustomerInvoice({onClose}:{onClose:()=>void}){
 const [settings,setSettings]=useState<Settings>(()=>read(SETTINGS_KEY,defaultSettings));
 const [customer,setCustomer]=useState<Customer>(emptyCustomer);
 const [offer,setOffer]=useState("Lifeline MRI");
 const selected=DIAGNOSTIC_OFFERS.find(x=>x.name===offer)??DIAGNOSTIC_OFFERS[1];
 const [amount,setAmount]=useState<number>(selected.price);
 const [description,setDescription]=useState("Business Lifeline MRI — Paid Beta diagnostic and results walkthrough");
 const [issued,setIssued]=useState(today());
 const [due,setDue]=useState(today());
 const [number,setNumber]=useState(nextNumber);
 const [notice,setNotice]=useState("");
 const [history,setHistory]=useState<InvoiceRecord[]>(()=>read(HISTORY_KEY,[]));
 const gst=useMemo(()=>settings.gstRegistered?amount/11:0,[amount,settings.gstRegistered]);
 const invoice:InvoiceRecord={number,issued,due,customer,description,amount,gstRegistered:settings.gstRegistered,status:"issued"};
 const saveSettings=()=>{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));setNotice("Your invoice details are saved on this device.")};
 const saveInvoice=()=>{if(!(customer.business||customer.name)||amount<=0){setNotice("Add the customer name/business and a valid amount first.");return false}const rows=[invoice,...history.filter(x=>x.number!==number)];localStorage.setItem(HISTORY_KEY,JSON.stringify(rows));setHistory(rows);setNotice("Invoice saved.");return true};
 const shareText=()=>`${settings.gstRegistered?"TAX INVOICE":"INVOICE"} ${number}\n${BUSINESS.businessName} · ABN ${BUSINESS.abn}\nIssued: ${issued} · Due: ${due}\nCustomer: ${customer.business||customer.name}\n${description}\nTotal: ${money(amount)}${settings.gstRegistered?` (includes GST ${money(gst)})`:" · GST not included"}\nPayment: ${settings.accountName}${settings.bsb?` · BSB ${settings.bsb}`:""}${settings.accountNumber?` · Account ${settings.accountNumber}`:""}\nReference: ${number}\nContact: ${settings.email}${settings.phone?` · ${settings.phone}`:""}`;
 const share=async()=>{if(!saveInvoice())return;const text=shareText();try{if(navigator.share)await navigator.share({title:`${settings.gstRegistered?"Tax invoice":"Invoice"} ${number}`,text});else{await navigator.clipboard.writeText(text);setNotice("Invoice copied. Paste it into Messages or email.")}}catch{}};
 const newInvoice=()=>{setCustomer(emptyCustomer);setNumber(nextNumber());setIssued(today());setDue(today());setNotice("");};
 return <div className="customer-invoice-backdrop" role="presentation" onClick={onClose}><section className="customer-invoice" role="dialog" aria-modal="true" aria-labelledby="customer-invoice-title" onClick={e=>e.stopPropagation()}>
  <header><div><p className="eyebrow">OWNER TOOL · SEPARATE FROM CLIENT MRI</p><h2 id="customer-invoice-title">Customer invoice</h2><p>Create the invoice here, then use your phone's Share sheet to send it by Messages, Mail or another installed app.</p></div><button type="button" aria-label="Close invoice" onClick={onClose}>×</button></header>
  <details className="invoice-settings"><summary>Your invoice details</summary><div className="invoice-fields two">
   <label>Email<input value={settings.email} onChange={e=>setSettings({...settings,email:e.target.value})}/></label><label>Phone<input value={settings.phone} onChange={e=>setSettings({...settings,phone:e.target.value})}/></label>
   <label>Account name<input value={settings.accountName} onChange={e=>setSettings({...settings,accountName:e.target.value})}/></label><label>Bank name<input value={settings.bankName} onChange={e=>setSettings({...settings,bankName:e.target.value})}/></label>
   <label>BSB<input inputMode="numeric" value={settings.bsb} onChange={e=>setSettings({...settings,bsb:e.target.value})}/></label><label>Account number<input inputMode="numeric" value={settings.accountNumber} onChange={e=>setSettings({...settings,accountNumber:e.target.value})}/></label>
  </div><label className="invoice-gst"><input type="checkbox" checked={settings.gstRegistered} onChange={e=>setSettings({...settings,gstRegistered:e.target.checked})}/><span>I am registered for GST. Use “Tax Invoice” and show GST.</span></label><p className="invoice-warning">Only turn this on if your business is actually GST-registered.</p><button className="button ghost" type="button" onClick={saveSettings}>Save my details</button></details>
  <div className="invoice-fields two"><label>Customer / contact name<input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/></label><label>Business name<input value={customer.business} onChange={e=>setCustomer({...customer,business:e.target.value})}/></label><label>Email<input type="email" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})}/></label><label>Phone<input value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></label><label>Address<input value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/></label><label>Customer ABN (optional)<input value={customer.abn} onChange={e=>setCustomer({...customer,abn:e.target.value})}/></label></div>
  <div className="invoice-fields two"><label>Service<select value={offer} onChange={e=>{const n=e.target.value;const o=DIAGNOSTIC_OFFERS.find(x=>x.name===n);setOffer(n);if(o){setAmount(o.price);setDescription(`${o.name} — Paid Beta business diagnostic service`)}}}>{DIAGNOSTIC_OFFERS.map(x=><option key={x.name}>{x.name}</option>)}</select></label><label>Amount (AUD)<input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(Math.max(0,Number(e.target.value)||0))}/></label><label>Invoice number<input value={number} onChange={e=>setNumber(e.target.value)}/></label><label>Issue date<input type="date" value={issued} onChange={e=>setIssued(e.target.value)}/></label><label>Due date<input type="date" value={due} onChange={e=>setDue(e.target.value)}/></label><label>Description<input value={description} onChange={e=>setDescription(e.target.value)}/></label></div>
  <article className="invoice-preview"><small>{settings.gstRegistered?"TAX INVOICE":"INVOICE"}</small><h3>{number}</h3><div><b>{BUSINESS.businessName}</b><span>ABN {BUSINESS.abn}</span><span>{settings.email}{settings.phone?` · ${settings.phone}`:""}</span></div><hr/><div><b>Bill to</b><span>{customer.business||customer.name||"Customer"}</span>{customer.business&&customer.name&&<span>{customer.name}</span>}{customer.address&&<span>{customer.address}</span>}{customer.abn&&<span>ABN {customer.abn}</span>}</div><p>{description}</p><strong className="invoice-total">{money(amount)}</strong><span>{settings.gstRegistered?`Includes GST ${money(gst)}`:"GST not included"}</span><hr/><span>Issued {issued} · Due {due}</span><span>Payment reference: {number}</span>{settings.bsb&&settings.accountNumber&&<span>{settings.accountName} · BSB {settings.bsb} · Account {settings.accountNumber}</span>}</article>
  {notice&&<p className="invoice-notice" role="status">{notice}</p>}<div className="invoice-actions"><button className="button ghost" type="button" onClick={newInvoice}>New invoice</button><button className="button ghost" type="button" onClick={saveInvoice}>Save invoice</button><button className="button primary" type="button" onClick={share}>Save &amp; share invoice</button></div>
  {history.length>0&&<details className="invoice-history"><summary>Recent invoices ({history.length})</summary>{history.slice(0,8).map(x=><div key={x.number}><b>{x.number}</b><span>{x.customer.business||x.customer.name}</span><strong>{money(x.amount)}</strong></div>)}</details>}
 </section></div>
}
