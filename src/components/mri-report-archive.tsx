"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { listMriReportsForOwner, type ArchivedMri } from "@/lib/mri-cloud-archive";
import type { SavedReport } from "@/lib/saved-report";

export function MriReportArchive({ onOpen }: { onOpen: (saved: SavedReport) => void }) {
  const [uid, setUid] = useState("");
  const [reports, setReports] = useState<ArchivedMri[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!firebaseAuth?.currentUser) return;
    setBusy(true);
    try {
      setReports(await listMriReportsForOwner());
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load the report archive.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, user => {
      setUid(user?.uid ?? "");
      setReports([]);
    });
  }, []);

  useEffect(() => {
    if (uid && expanded) void load();
  }, [uid, expanded, load]);

  if (!uid) return null;
  return <section className="panel no-print" aria-label="Client-owned MRI archive">
    <div className="section-heading">
      <div><span>ACCOUNT-OWNED REPORTS</span><h3>Previous Business MRI reports</h3></div>
      <button type="button" className="button ghost" onClick={() => setExpanded(v => !v)}>
        {expanded ? "Hide history" : "Open report history"}
      </button>
    </div>
    {expanded && <>
      <p>Historical reports are saved under this signed-in client's business account. They stay available after a new MRI or local device clear. Up to 100 recent reports are listed here.</p>
      <button type="button" className="button ghost" disabled={busy} onClick={() => void load()}>{busy ? "Loading reports…" : "Refresh reports"}</button>
      {status && <p role="alert">{status}</p>}
      {reports.length === 0 && !busy && !status && <p>No cloud-archived MRIs for this account yet. Finish a new MRI while signed in.</p>}
      <div className="action-grid">
        {reports.map(item => <article className="action-card" key={item.id}>
          <div className="action-top">
            <strong>{item.businessName}</strong>
            <span className="tag high">{item.saved.report.metrics.overallScore}/100</span>
          </div>
          <p>{new Date(item.createdAt).toLocaleString("en-AU", {dateStyle:"medium",timeStyle:"short"})}</p>
          <button type="button" className="button ghost" onClick={() => onOpen(item.saved)}>Open saved MRI</button>
        </article>)}
      </div>
    </>}
  </section>;
}
