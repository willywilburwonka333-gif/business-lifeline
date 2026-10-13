"use client";

import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";
import { paymentMethodLabel, type PilotPaymentMethod } from "@/lib/pilot-service-payments";

type ServiceRequest = {
  id: string;
  email: string;
  offerName: string;
  amountAud: number;
  paymentMethod: PilotPaymentMethod;
  paymentStatus: "pending_arrangement" | "paid_verified" | "cancelled";
  createdAt: string;
};

export function PilotServiceRequestAdmin() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState("");
  const [truncated, setTruncated] = useState(false);

  const api = async (method: "GET" | "POST", body?: { id: string; action: "verify_payment" | "cancel" }) => {
    const user = firebaseAuth?.currentUser;
    if (!user) throw new Error("Creator sign-in is required.");
    const response = await fetch("/api/pilot/service-requests/manage", {
      method, cache: "no-store",
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not access service requests.");
    return result;
  };

  const refresh = async () => {
    try {
      setError("");
      const result = await api("GET") as { requests: ServiceRequest[]; truncated: boolean };
      setRequests(result.requests);
      setTruncated(result.truncated);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load service requests."); }
  };

  useEffect(() => {
    if (!open) return;
    // Refresh on opening; never poll or change orders without the Creator's action.
    void (async () => {
      try {
        setError("");
        const result = await api("GET") as { requests: ServiceRequest[]; truncated: boolean };
        setRequests(result.requests); setTruncated(result.truncated);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load service requests."); }
    })();
  }, [open]);

  const review = async (request: ServiceRequest, action: "verify_payment" | "cancel") => {
    const prompt = action === "verify_payment"
      ? `Have you independently confirmed that A$${request.amountAud} was received for ${request.offerName} from ${request.email}? Mark paid only after verifying the bank transfer, cash receipt or card processor settlement.`
      : `Cancel ${request.offerName} for ${request.email}?`;
    if (!window.confirm(prompt)) return;
    setWorking(request.id);
    try { await api("POST", { id: request.id, action }); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the request."); }
    finally { setWorking(""); }
  };

  return <section className="pilot-administration no-print">
    <button className="button ghost" type="button" onClick={() => setOpen(value => !value)}>
      {open ? "Close" : "Open"} service requests and payments
    </button>
    {open && <div>
      <h2>Incoming guided-service requests</h2>
      <p>Requests are not payments. Check your actual cash receipt, PayID bank receipt or card terminal before marking any order paid. No Stripe or card details are used here.</p>
      <button className="button ghost" type="button" onClick={() => void refresh()}>Refresh requests</button>
      {error && <p role="alert">{error}</p>}
      {truncated && <p>Showing the newest 100 requests. Older requests require pagination.</p>}
      {requests.length === 0 && <p>No guided-service requests yet.</p>}
      {requests.map(request => <article key={request.id} className="pilot-account-row">
        <strong>{request.offerName} · A$${request.amountAud}</strong>
        <span>{request.email} · {paymentMethodLabel(request.paymentMethod)} · {request.paymentStatus.replaceAll("_", " ")}</span>
        <small>{new Date(request.createdAt).toLocaleString("en-AU")} · {request.id}</small>
        {request.paymentStatus === "pending_arrangement" && <div className="pilot-request-actions">
          <button type="button" className="button ghost" disabled={Boolean(working)} onClick={() => void review(request,"verify_payment")}>Mark payment verified</button>
          <button type="button" className="button ghost" disabled={Boolean(working)} onClick={() => void review(request,"cancel")}>Cancel request</button>
        </div>}
      </article>)}
    </div>}
  </section>;
}
