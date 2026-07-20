"use client";

import { useEffect, useState } from "react";

const STATUS_KEY = "business-lifeline-ledger-sync-status-v1";
type Status = { lastRun: string; added: number; totalAutomatic: number; warnings: string[] };

export function OperatingLedgerStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(STATUS_KEY);
        setStatus(raw ? JSON.parse(raw) : null);
      } catch {
        setStatus(null);
      }
    };
    read();
    window.addEventListener("business-lifeline-ledger-sync", read);
    const timer = window.setInterval(read, 2500);
    return () => {
      window.removeEventListener("business-lifeline-ledger-sync", read);
      window.clearInterval(timer);
    };
  }, []);
  return <section className="ledger-sync-status" aria-live="polite">
    <div><small>AUTOMATIC ACCOUNTING</small><strong>{status ? `${status.totalAutomatic} operating transactions posted` : "Waiting for operating data"}</strong><span>{status?.lastRun ? `Last checked ${new Date(status.lastRun).toLocaleTimeString("en-AU")}` : "Run My Business sales, expenses and invoices will post automatically."}</span></div>
    <div>{status?.added ? <b>{status.added} new</b> : <b>Up to date</b>}{status?.warnings?.length ? <span>{status.warnings.length} warning{status.warnings.length === 1 ? "" : "s"}</span> : <span>Balanced and checked</span>}</div>
    {status?.warnings?.length ? <details><summary>Review warnings</summary>{status.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details> : null}
  </section>;
}
