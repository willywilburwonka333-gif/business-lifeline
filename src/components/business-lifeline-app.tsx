"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BusinessLifeline } from "@/components/business-lifeline";
import { BusinessRecords } from "@/components/business-records";
import { JudgeLanding } from "@/components/judge-landing";
import { SavedScenarioPlanner } from "@/components/saved-scenario-planner";
import { demoBusiness } from "@/lib/demo";
import { generateReport } from "@/lib/planner";
import { readSavedReport, REPORT_STORAGE_KEY, writeSavedReport, type SavedReport } from "@/lib/saved-report";
import type { BusinessReport } from "@/lib/types";

export const DEMO_GUIDE_KEY = "business-lifeline-demo-guide-v1";
const MRI_MODE_KEY = "business-lifeline-mri-mode-v1";
type AppState = SavedReport | null | undefined;
type ReportMode = "private" | "ai";

function buildDemoReport(): BusinessReport {
  const base = generateReport(demoBusiness);
  return { ...base, aiStatus: "fallback" };
}

export function BusinessLifelineApp() {
  const [saved, setSaved] = useState<AppState>(undefined);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [reportMode, setReportMode] = useState<ReportMode>("private");
  const [aiConsent, setAiConsent] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const lastRaw = useRef<string | null>(null);

  useLayoutEffect(() => {
    const next = readSavedReport();
    lastRaw.current = window.localStorage.getItem(REPORT_STORAGE_KEY);
    const storedMode = window.localStorage.getItem(MRI_MODE_KEY);
    if (storedMode === "private" || storedMode === "ai") setReportMode(storedMode);
    setSaved(next);
  }, []);

  useEffect(() => {
    const sync = () => {
      const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
      if (raw === lastRaw.current) return;
      const next = readSavedReport();
      lastRaw.current = window.localStorage.getItem(REPORT_STORAGE_KEY);
      setSaved(next);
    };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === REPORT_STORAGE_KEY) sync(); };
    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(sync, 250);
    return () => { window.removeEventListener("storage", onStorage); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!showQuestions) return;
    const openQuestions = () => document.querySelector<HTMLButtonElement>(".landing .hero-actions .button.primary")?.click();
    const frame = window.requestAnimationFrame(openQuestions);
    const timer = window.setTimeout(openQuestions, 80);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [showQuestions]);

  useEffect(() => {
    if (!showQuestions) return;
    const timer = window.setInterval(() => {
      const label = document.querySelector<HTMLElement>(".form-header small");
      const progress = document.querySelector<HTMLElement>(".form-shell .progress i");
      if (!label) return;
      const match = label.textContent?.match(/Step\s+(\d+)\s+of\s+3/i);
      if (!match) return;
      const overallStep = Number(match[1]) + 1;
      label.textContent = `Business MRI · Step ${overallStep} of 4`;
      if (progress) progress.style.width = `${overallStep * 25}%`;
    }, 120);
    return () => window.clearInterval(timer);
  }, [showQuestions]);

  useEffect(() => {
    if (!showQuestions) return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.endsWith("/api/analyse")) return originalFetch(input, init);
      if (reportMode !== "ai" || !aiConsent) {
        return new Response(JSON.stringify({ error: "Calculation-only report selected." }), { status: 403, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }
      let body: Record<string, unknown> = {};
      if (typeof init?.body === "string") { try { body = JSON.parse(init.body) as Record<string, unknown>; } catch { body = {}; } }
      const headers = new Headers(init?.headers);
      headers.set("Content-Type", "application/json");
      headers.set("x-business-lifeline-ai-consent", "true");
      return originalFetch(input, { ...init, headers, body: JSON.stringify({ ...body, consent: true }) });
    };
    return () => { window.fetch = originalFetch; };
  }, [showQuestions, reportMode, aiConsent]);

  const openDemo = () => {
    if (demoLoading) return;
    setDemoLoading(true);
    const next: SavedReport = { data: demoBusiness, report: buildDemoReport() };
    writeSavedReport(next);
    window.localStorage.setItem(DEMO_GUIDE_KEY, "1");
    window.localStorage.setItem(MRI_MODE_KEY, "private");
    lastRaw.current = window.localStorage.getItem(REPORT_STORAGE_KEY);
    setSaved(next);
    setDemoLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const beginAssessment = () => {
    setShowAssessment(true);
    setShowQuestions(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueToQuestions = () => {
    if (reportMode === "ai" && !aiConsent) return;
    window.localStorage.setItem(MRI_MODE_KEY, reportMode);
    setShowQuestions(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    window.localStorage.removeItem(REPORT_STORAGE_KEY);
    window.localStorage.removeItem(DEMO_GUIDE_KEY);
    lastRaw.current = null;
    setSaved(null);
    setShowAssessment(false);
    setShowQuestions(false);
    setAiConsent(false);
    setReportMode("private");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (saved === undefined) return <main className="loading app-loading" aria-label="Loading Business Lifeline"><span>Loading Business Lifeline…</span></main>;
  if (saved) return <SavedScenarioPlanner saved={saved} onReset={reset} />;
  if (showAssessment && showQuestions) return <BusinessLifeline />;
  if (showAssessment) return (
    <main id="main-content" className="mri-mode-shell">
      <header className="mri-mode-header"><button className="brand button-reset" onClick={() => setShowAssessment(false)}><span>BL</span> Business Lifeline</button><small>Business MRI · Step 1 of 4</small></header>
      <div className="progress"><i style={{ width: "25%" }} /></div>
      <section className="mri-mode-panel" aria-labelledby="mri-setup-title">
        <p className="eyebrow">PRIVACY &amp; DOCUMENTS</p>
        <h1 id="mri-setup-title">Choose how your MRI is prepared.</h1>
        <p className="mri-mode-lead">You can keep the MRI calculation-only in this browser or allow optional AI prioritisation and document reading. Uploading records is optional and helps pre-fill the numbers you will check in Step 3.</p>
        <div className="mri-mode-options" role="radiogroup" aria-label="Report preparation choice">
          <label className={`mri-mode-card ${reportMode === "private" ? "selected" : ""}`}>
            <input type="radio" name="report-mode" checked={reportMode === "private"} onChange={() => { setReportMode("private"); setAiConsent(false); }} />
            <span className="mri-mode-check" aria-hidden="true">{reportMode === "private" ? "✓" : ""}</span>
            <span><strong>Private calculation-only report</strong><small>Recommended default</small><p>Your figures stay in this browser. CSV and text can be read locally. Other files are registered but are not sent to an AI model.</p></span>
          </label>
          <label className={`mri-mode-card ${reportMode === "ai" ? "selected" : ""}`}>
            <input type="radio" name="report-mode" checked={reportMode === "ai"} onChange={() => setReportMode("ai")} />
            <span className="mri-mode-check" aria-hidden="true">{reportMode === "ai" ? "✓" : ""}</span>
            <span><strong>AI-enhanced report and document reading</strong><small>Optional deeper extraction and prioritisation</small><p>The same tested calculations are used. Selected files, business details and written answers are sent to the AI provider to read PDFs, spreadsheets, documents and images and add supported diagnostic signals.</p></span>
          </label>
        </div>
        {reportMode === "ai" && <div className="mri-ai-consent"><label><input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} /><span>I understand and agree that selected files and MRI information will be sent to the AI provider for document reading and this report.</span></label><p>Do not upload passwords, banking credentials, tax file numbers, identity documents, payment-card details, customer personal information or privileged legal material.</p><a href="/legal/ai">Read the AI Data and Privacy Notice →</a></div>}
        <BusinessRecords compact aiEnabled={reportMode === "ai" && aiConsent} />
        <div className="mri-mode-actions"><button type="button" className="button ghost" onClick={() => setShowAssessment(false)}>← Back to home</button><button type="button" className="button primary" onClick={continueToQuestions} disabled={reportMode === "ai" && !aiConsent}>Continue to Your Business <span>→</span></button></div>
        {reportMode === "ai" && !aiConsent && <p className="mri-consent-hint" role="status">Tick the consent box before uploading files or continuing with AI-enhanced analysis.</p>}
      </section>
    </main>
  );
  return <JudgeLanding onStart={beginAssessment} onDemo={openDemo} demoLoading={demoLoading} />;
}
