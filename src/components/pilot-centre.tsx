"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { SERVICE_CATALOG } from "@/lib/service-payments";
import { readSavedReport } from "@/lib/saved-report";
import type { PublicPilot, PilotPaymentMethod } from "@/lib/pilot-project";

type PilotResult = { role: "creator" | "client"; pilots: PublicPilot[]; error?: string };
const money = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents/100);
const paymentOptions: {value: PilotPaymentMethod; label: string}[] = [
  {value:"free",label:"Free pilot (creator-approved)"},
  {value:"stripe",label:"Card payment via Stripe"},
  {value:"payid",label:"PayID (manual confirmation)"},
  {value:"cash",label:"Cash (manual confirmation)"},
  {value:"bank-transfer",label:"Bank transfer (manual confirmation)"},
];

export function PilotCentre({ user, onOpenMri, servicesConfigured }: { user: User; onOpenMri: () => void; servicesConfigured: boolean }) {
  const [role, setRole] = useState<"creator" | "client">("client");
  const [pilots,setPilots] = useState<PublicPilot[]>([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [inviteUrl,setInviteUrl] = useState("");
  const [newPilot,setNewPilot] = useState({ clientName:"",clientEmail:"",businessName:"",serviceKey:SERVICE_CATALOG[1].key as string,paymentMethod:"free" as PilotPaymentMethod,notes:"" });
  const [invite,setInvite] = useState<{ pilotId:string; invite:string } | null>(null);
  const [invitePreview,setInvitePreview] = useState<PublicPilot | null>(null);
  const [joinMethod,setJoinMethod] = useState<PilotPaymentMethod>("stripe");
  const [accept,setAccept] = useState(false);
  const [paymentReferences,setPaymentReferences] = useState<Record<string,string>>({});
  const [shareConsent,setShareConsent] = useState(false);

  const request = useCallback(async (path:string, method:"GET"|"POST"|"PATCH"="GET", payload?:object) => {
    const response = await fetch(path, {
      method, cache:"no-store",
      headers: { Authorization: "Bearer " + await user.getIdToken(), ...(payload ? { "Content-Type":"application/json" } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Request failed.");
    return value;
  },[user]);

  const refresh = useCallback(async () => {
    const value = await request("/api/pilots") as PilotResult;
    setRole(value.role);
    setPilots(value.pilots);
  },[request]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pilotId = params.get("pilot") || "";
    const code = params.get("invite") || "";
    if (pilotId && code) {
      setInvite({ pilotId, invite:code });
      void request("/api/pilots/join?pilotId="+encodeURIComponent(pilotId)+"&invite="+encodeURIComponent(code))
        .then(value => {setInvitePreview(value.pilot as PublicPilot); setJoinMethod(value.pilot.paymentMethod as PilotPaymentMethod);})
        .catch(e => setError(e instanceof Error ? e.message : "Invitation could not be validated."));
    }
    void refresh().catch(e => setError(e instanceof Error ? e.message : "Pilot services are unavailable."));
  },[refresh,request]);

  const create = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();setBusy(true);setError("");setNotice("");
    try {
      const result = await request("/api/pilots","POST",newPilot) as {inviteUrl:string};
      setInviteUrl(result.inviteUrl);
      setNotice("Pilot created. Copy the invitation link and send it to the customer.");
      await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not create pilot."); }
    finally {setBusy(false);}
  };
  const join = async () => {
    if (!invite) return;
    setBusy(true);setError("");
    try {
      await request("/api/pilots/join","POST",{...invite,consent:accept,paymentMethod:joinMethod});
      setInvite(null);setInvitePreview(null);setNotice("Pilot joined. Your account is now linked to this pilot.");
      const url = new URL(window.location.href); url.searchParams.delete("pilot");url.searchParams.delete("invite");
      window.history.replaceState(null,"",url.toString());
      await refresh();
    } catch(e) {setError(e instanceof Error ? e.message : "Could not join pilot.");}
    finally {setBusy(false);}
  };
  const doAction = async (pilot:PublicPilot,action:string, extra:object={}) => {
    setBusy(true);setError("");setNotice("");
    try {
      const result = await request("/api/pilots","PATCH",{pilotId:pilot.id,action,...extra}) as {inviteUrl?:string};
      if (result.inviteUrl) {setInviteUrl(result.inviteUrl);setNotice("A new invite link was issued. The previous link no longer works.");}
      else setNotice("Pilot updated.");
      await refresh();
    } catch(e) {setError(e instanceof Error ? e.message : "Unable to update pilot.");}
    finally {setBusy(false);}
  };
  const checkout = async (pilot:PublicPilot) => {
    setBusy(true);setError("");
    try {
      const result = await request("/api/billing/checkout","POST",{service:pilot.serviceKey,pilotId:pilot.id}) as {url:string};
      window.location.assign(result.url);
    } catch(e) {setError(e instanceof Error ? e.message : "Checkout unavailable.");setBusy(false);}
  };
  const shareReport = async (pilot:PublicPilot) => {
    if (!shareConsent) {setError("Confirm that this is your own report and you want to share a summary.");return;}
    const saved = readSavedReport();
    if (!saved) {setError("Complete or restore an MRI before sharing a summary.");return;}
    const report = {
      businessName: saved.data.businessName,
      overallScore: saved.report.metrics.overallScore,
      dataConfidence: saved.report.metrics.dataConfidence,
      pressureLevel: saved.report.metrics.pressureLevel,
      topActions: saved.report.today.slice(0,3).map(a=>a.title.slice(0,220)),
      warnings: saved.report.warnings.slice(0,4).map(w=>w.slice(0,220)),
    };
    await doAction(pilot,"report",{report,confirmShare:true});
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(inviteUrl);setNotice("Invitation link copied."); }
    catch { setNotice("Select and copy the invitation link below."); }
  };

  return <section className="pilot-centre" aria-label="Business Lifeline pilot centre">
    <h3>{role === "creator" ? "Creator dashboard · Pilot manager" : "My Business Lifeline pilots"}</h3>
    <p>Separate pilot records, service selection and payment verification. A free pilot can be used for a controlled demonstration. Paid work must be confirmed before sharing a diagnostic summary with the creator.</p>
    {error&&<p role="alert" className="cloud-account-error">{error}</p>}
    {notice&&<p role="status" className="cloud-account-notice">{notice}</p>}
    {invite&&<section className="pilot-join-panel">
      <h4>You have a pilot invitation</h4>
      {invitePreview&&<p><strong>{invitePreview.businessName}</strong> · {SERVICE_CATALOG.find(s=>s.key===invitePreview.serviceKey)?.offer.name} · {invitePreview.paymentStatus==="waived"?"Complimentary pilot":money(invitePreview.amountCents)+" list price"}. Invited contact: {invitePreview.clientEmail}.</p>}
      <p>Sign in using the exact email the business owner invited. Only use your own business information. You can start with fictional data while privacy and professional checks are pending.</p>
      <label>Payment preference
        <select value={joinMethod} onChange={e=>setJoinMethod(e.target.value as PilotPaymentMethod)}>
          {paymentOptions.filter(option=>invitePreview?.paymentStatus==="waived" ? option.value==="free" : option.value!=="free").map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
      </label>
      <label><input type="checkbox" checked={accept} onChange={e=>setAccept(e.target.checked)}/> I am authorised to represent the business and agree to the <a href="/legal/terms" target="_blank" rel="noopener noreferrer">terms</a> and <a href="/legal/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>. I understand the MRI is not professional advice.</label>
      <button type="button" className="button primary" disabled={!accept||busy} onClick={()=>void join()}>Accept & join pilot</button>
    </section>}
    {role==="creator"&&<section className="pilot-create">
      <h4>Create a pilot</h4>
      <form onSubmit={e=>void create(e)}>
        <label>Client name<input required maxLength={100} value={newPilot.clientName} onChange={e=>setNewPilot({...newPilot,clientName:e.target.value})}/></label>
        <label>Client email<input type="email" required value={newPilot.clientEmail} onChange={e=>setNewPilot({...newPilot,clientEmail:e.target.value})}/></label>
        <label>Business name<input required maxLength={120} value={newPilot.businessName} onChange={e=>setNewPilot({...newPilot,businessName:e.target.value})}/></label>
        <label>Service<select value={newPilot.serviceKey} onChange={e=>setNewPilot({...newPilot,serviceKey:e.target.value})}>
          {SERVICE_CATALOG.map(service=><option key={service.key} value={service.key}>{service.offer.name} — ${service.offer.price} AUD</option>)}
        </select></label>
        <label>How will they pay?<select value={newPilot.paymentMethod} onChange={e=>setNewPilot({...newPilot,paymentMethod:e.target.value as PilotPaymentMethod})}>{paymentOptions.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        {newPilot.paymentMethod==="free"&&<p>This is complimentary pilot access. No Stripe payment or charge will be created.</p>}
        <label>Optional scope notes<textarea maxLength={500} value={newPilot.notes} onChange={e=>setNewPilot({...newPilot,notes:e.target.value})}/></label>
        <button className="button primary" type="submit" disabled={busy}>Create pilot invitation</button>
      </form>
      {inviteUrl&&<div className="pilot-invite-link"><label>Customer&apos;s unique invitation link<input readOnly value={inviteUrl}/></label><button type="button" className="button ghost" onClick={()=>void copy()}>Copy invitation</button><p>Share only with the invited customer. It expires when replaced; it only works with their verified email.</p></div>}
    </section>}
    <h4>{role==="creator" ? "Customer pilots" : "Joined pilots"}</h4>
    {!pilots.length&&<p>No pilots listed yet. {role==="creator"?"Create your first pilot above.":"Use the unique invitation link provided by the owner."}</p>}
    {pilots.map(pilot=><article key={pilot.id} className="pilot-record">
      <strong>{pilot.businessName}</strong> · {SERVICE_CATALOG.find(s=>s.key===pilot.serviceKey)?.offer.name||pilot.serviceKey}
      <p>{role==="creator" ? pilot.clientName+" · "+pilot.clientEmail : "Service selected by Business Lifeline"}</p>
      <p>Stage: {pilot.status} · Payment: {pilot.paymentStatus} ({pilot.paymentMethod}) · {money(pilot.amountCents)} list price</p>
      {pilot.paymentStatus==="waived"&&<p>Complimentary pilot: no payment is due.</p>}
      {role==="creator"&&<>
        {pilot.status==="invited"&&!pilot.clientUid&&<button type="button" className="button ghost" disabled={busy} onClick={()=>void doAction(pilot,"reissue")}>Generate new invite link</button>}
        {pilot.paymentStatus==="pending"&&["cash","payid","bank-transfer"].includes(pilot.paymentMethod)&&
          <div className="pilot-manual-payment"><label>Verified transaction/receipt reference<input value={paymentReferences[pilot.id]||""} onChange={e=>setPaymentReferences({...paymentReferences,[pilot.id]:e.target.value})}/></label>
            <button className="button ghost" type="button" disabled={busy} onClick={()=>{if(window.confirm("Confirm that the FULL payment has actually arrived, based on your bank/cash records?")) void doAction(pilot,"manual_paid",{paymentReference:paymentReferences[pilot.id],confirmReceived:true});}}>Confirm full payment received</button></div>}
        {pilot.paymentStatus==="pending"&&pilot.paymentMethod==="stripe"&&
          <div><label>Stripe Checkout Session ID (manual verified reconciliation)<input placeholder="cs_live_..." value={paymentReferences[pilot.id]||""} onChange={e=>setPaymentReferences({...paymentReferences,[pilot.id]:e.target.value})}/></label><button className="button ghost" disabled={busy} type="button" onClick={()=>void doAction(pilot,"reconcile_stripe",{sessionId:paymentReferences[pilot.id]})}>Verify in Stripe and reconcile</button></div>}
        {pilot.status==="active"&&<button type="button" className="button ghost" disabled={busy} onClick={()=>void doAction(pilot,"set_status",{status:"completed"})}>Mark pilot completed</button>}
        {!["cancelled","completed"].includes(pilot.status)&&<button type="button" className="button ghost" disabled={busy} onClick={()=>{if(window.confirm("Cancel this pilot? Any refund must be processed separately."))void doAction(pilot,"set_status",{status:"cancelled"});}}>Cancel pilot</button>}
      </>}
      {role==="client"&&pilot.status==="active"&&<>
        {pilot.paymentStatus==="pending"&&pilot.paymentMethod==="stripe"&&servicesConfigured&&<button className="button primary" type="button" disabled={busy} onClick={()=>void checkout(pilot)}>Pay {money(pilot.amountCents)} securely</button>}
        {pilot.paymentStatus==="pending"&&pilot.paymentMethod==="stripe"&&!servicesConfigured&&<p>Automatic card payment confirmation is awaiting configuration. Ask the owner for a direct payment link; they must reconcile it after payment.</p>}
        {pilot.paymentStatus==="pending"&&pilot.paymentMethod!=="stripe"&&<p>Arrange your selected payment with Business Lifeline. Your creator will confirm it after receiving the funds.</p>}
        {["paid","waived"].includes(pilot.paymentStatus)&&<>
          <button type="button" className="button primary" onClick={onOpenMri}>Open Business MRI</button>
          <label><input type="checkbox" checked={shareConsent} onChange={e=>setShareConsent(e.target.checked)}/> I have checked the saved MRI uses my authorised business data, not a fictional demo, and agree to share the summary with the pilot creator.</label>
          <button type="button" className="button ghost" disabled={!shareConsent||busy} onClick={()=>void shareReport(pilot)}>Share saved MRI summary</button>
        </>}
      </>}
      {pilot.reportSummary&&<div className="pilot-summary"><strong>Client-shared MRI summary</strong>
        <p>Score {pilot.reportSummary.overallScore}/100 · Confidence {pilot.reportSummary.dataConfidence}/100 · {pilot.reportSummary.pressureLevel}</p>
        <p>Priorities: {pilot.reportSummary.topActions.join(" · ") || "None provided"}</p>
        <p>Shared {pilot.reportSummary.sharedAt.slice(0,10)} · Screening only; source records require review</p>
      </div>}
    </article>)}
    <button type="button" className="button ghost" onClick={()=>void refresh().catch(e=>setError(String(e)))} disabled={busy}>Refresh pilot records</button>
  </section>;
}
