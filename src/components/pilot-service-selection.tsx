"use client";

import { useRef, useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";
import { DIAGNOSTIC_OFFERS } from "@/lib/diagnostic-offers";
import { PILOT_PAYMENT_METHODS, paymentMethodLabel, pilotPaymentInstructions, type PilotPaymentMethod } from "@/lib/pilot-service-payments";

type Confirmation = { requestId: string; offerName: string; amountAud: number; method: string; instructions: string; message: string };

export function PilotServiceSelection() {
  const [offerIndex, setOfferIndex] = useState<number | null>(null);
  const [method, setMethod] = useState<PilotPaymentMethod>("payid");
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const selectedOffer = offerIndex === null ? null : DIAGNOSTIC_OFFERS[offerIndex];

  const choose = (index: number) => {
    setOfferIndex(index); setConfirmation(null); setAcknowledge(false); setError("");
    // The service card is always available, including on short phone viewports.
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const submit = async () => {
    setError("");
    if (offerIndex === null || !acknowledge) {
      setError("Choose a service and acknowledge the manual payment arrangement.");
      return;
    }
    const account = firebaseAuth?.currentUser;
    if (!account) { setError("Sign in to your pilot account before requesting a paid service."); return; }
    if (!account.emailVerified) { setError("Verify your email before requesting a paid service."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/pilot/service-requests", {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await account.getIdToken()}` },
        body: JSON.stringify({ offerIndex, method }),
      });
      const payload = await response.json() as Confirmation & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not record your service request.");
      setConfirmation(payload);
      setAcknowledge(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not record your request.");
    } finally { setBusy(false); }
  };

  return <section className="judge-story pilot-service-section" id="pilot-services">
    <div className="judge-story-heading">
      <p>Business Lifeline services</p>
      <h2>Choose your MRI and repair service</h2>
      <span>All prices in Australian dollars. These are guided service requests, not recurring subscriptions or automatic access to advanced app modules. We confirm scope, availability and payment arrangements with you before delivery.</span>
    </div>
    <div className="pilot-services-grid">
      {DIAGNOSTIC_OFFERS.map((offer,index)=><article key={offer.name} className={index===offerIndex?"pilot-service-card selected":"pilot-service-card"}>
        <h3>{offer.name}</h3><strong>A${offer.price}</strong><p>{offer.for}</p>
        <ul>{offer.includes.map(inclusion=><li key={inclusion}>{inclusion}</li>)}</ul>
        <button className="button primary" type="button" onClick={()=>choose(index)} aria-pressed={offerIndex===index}>Choose service</button>
      </article>)}
    </div>
    <div ref={formRef} className="pilot-service-order" aria-label="Arrange pilot service payment">
      {selectedOffer ? <>
        <h3>Request {selectedOffer.name} — A${selectedOffer.price}</h3>
        {confirmation ? <div role="status" className="pilot-service-confirmation">
          <strong>Request recorded — not yet paid</strong>
          <p>{confirmation.message}</p>
          <p>Reference: <code>{confirmation.requestId}</code></p>
          <p>{confirmation.instructions}</p>
          <a href="mailto:support@businesslifeline.com.au">Contact Business Lifeline</a>
        </div> : <>
          <fieldset className="pilot-payment-choice">
            <legend>How would you prefer to pay?</legend>
            {PILOT_PAYMENT_METHODS.map(choice=><label key={choice}>
              <input type="radio" name="pilot-payment-method" value={choice} checked={method===choice} onChange={()=>setMethod(choice)}/>
              <span>{paymentMethodLabel(choice)}</span>
            </label>)}
          </fieldset>
          <p className="pilot-service-disclosure">{pilotPaymentInstructions(method)}</p>
          <label className="pilot-service-ack">
            <input type="checkbox" checked={acknowledge} onChange={event=>setAcknowledge(event.target.checked)}/>
            <span>I understand this is a service request, not an online payment. Business Lifeline will confirm the scope and payment method before delivery.</span>
          </label>
          {error && <p role="alert" className="pilot-service-error">{error}</p>}
          <button type="button" className="button primary large" disabled={!acknowledge||busy} onClick={()=>void submit()}>{busy?"Submitting…":"Submit service request →"}</button>
        </>}
      </>:<p>Select any of the five services above to see payment arrangements. Your free pilot workspace remains available independently.</p>}
    </div>
  </section>;
}
