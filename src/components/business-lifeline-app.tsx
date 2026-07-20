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

function ReportModeChoice({ mode, consent, onModeChange, onConsentChange, onContinue, onBack }: {
  mode: ReportMode;
  consent: boolean;
  onModeChange: (mode: ReportMode) => void;
  onConsentChange: (consent: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const aiAllowed = mode === "private" || consent;

  return (
    <main id="main-content" className="mri-mode-shell">
      <header className="mri-mode-header">
        <button className="brand button-reset" onClick={onBack}><span>BL</span> Business Lifeline</button>
        <small>Business MRI · Setup</small>
      </header>

      <section className="mri-mode-panel" aria-labelledby="mri-mode-title">
        <p className="eyebrow">BUSINESS MRI SETUP</p>
        <h1 id="mri-mode-title">Upload records or continue without them.</h1>
        <p className="mri-mode-lead">Uploading records takes you straight to the first MRI question after the files are processed. You will not need to start the MRI again.</p>

        <BusinessRecords compact onUploadComplete={() => { if (aiAllowed) onContinue(); }} />

        <div className="mri-mode-options" role="radiogroup" aria-label="Report preparation choice">
          <label className={`mri-mode-card ${mode === "private" ? "selected" : ""}`}>
            <input type="radio" name="report-mode" value="private" checked={mode === "private"} onChange={() => { onModeChange("private"); onConsentChange(false); }} />
            <span className="mri-mode-check" aria-hidden="true">{mode === "private" ? "✓" : ""}</span>
            <span><strong>Private calculation-only report</strong><small>Recommended default</small><p>Your figures stay in this browser. Tested calculations and business rules build the complete report without sending the MRI to an AI model.</p></span>
          </label>

          <label className={`mri-mode-card ${mode === "ai" ? "selected" : ""}`}>
            <input type="radio" name="report-mode" value="ai" checked={mode === "ai"} onChange={() => onModeChange("ai")} />
            <span className="mri-mode-check" aria-hidden="true">{mode === "ai" ? "✓" : ""}</span>
            <span><strong>AI-enhanced report</strong><small>Optional personalised prioritisation</small><p>Your MRI uses the same tested calculations. Selected business details and written answers are also sent to the AI provider for additional prioritisation.</p></span>
          </label>
        </div>

        {mode === "ai" && (
          <div className="mri-ai-consent">
            <label><input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} /><span>I understand and agree that selected MRI information will be sent to the AI provider for this report.</span></label>
            <p>Do not enter passwords, banking credentials, tax file numbers, identity documents, payment-card details, customer personal information or privileged legal material.</p>
            <a href="/legal/ai">Read the AI Data and Privacy Notice →</a>
          </div>
        )}

        <div className="mri-mode-actions">
          <button type="button" className="button ghost" onClick={onBack}>← Back to home</button>
          <button type="button" className="button primary" onClick={onContinue} disabled={!aiAllowed}>Continue without uploading <span>→</span></button>
        </div>
        {mode === "ai" && !consent && <p className="mri-consent-hint" role="status">Tick the consent box before continuing or uploading with AI-enhanced analysis selected.</p>}
      </section>
    </main>
  );
}

export function BusinessLifelineApp() {
  const [saved, setSaved] = useState<AppState>(undefined);
  const [showModeChoice, setShowModeChoice] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [reportMode, setReportMode] = useState<ReportMode>("private");
  const [aiConsent, setAiConsent] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const lastRaw = useRef<string | null>(null);

  useLayoutEffect(() => {
    const next = readSavedReport();
    lastRaw.current = window.localStorage.getItem(REPORT_STORAGE_KEY);
    const storedMode = window.localStorage.getItem(MRI_MODE_KEY);
    if (storedMode === "ai" || storedMode === "private") setReportMode(storedMode);
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
    if (!showAssessment) return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.endsWith("/api/analyse")) return originalFetch(input, init);
      if (reportMode !== "ai" || !aiConsent) return new Response(JSON.stringify({ error: "Calculation-only report selected." }), { status: 403, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      let body: Record<string, unknown> = {};
      if (typeof init?.body === "string") { try { body = JSON.parse(init.body) as Record<string, unknown>; } catch { body = {}; } }
      const headers = new Headers(init?.headers);
      headers.set("Content-Type", "application/json");
      headers.set("x-business-lifeline-ai-consent", "true");
      return originalFetch(input, { ...init, headers, body: JSON.stringify({ ...body, consent: true }) });
    };
    return () => { window.fetch = originalFetch; };
  }, [showAssessment, reportMode, aiConsent]);

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
    window.localStorage.setItem(MRI_MODE_KEY, reportMode);
    setShowModeChoice(false);
    setShowAssessment(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    window.localStorage.removeItem(REPORT_STORAGE_KEY);
    window.localStorage.removeItem(DEMO_GUIDE_KEY);
    lastRaw.current = null;
    setSaved(null);
    setShowAssessment(false);
    setShowModeChoice(false);
    setAiConsent(false);
    setReportMode("private");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (saved === undefined) return <main className="loading app-loading" aria-label="Loading Business Lifeline"><span>Loading Business Lifeline…</span></main>;
  if (saved) return <SavedScenarioPlanner saved={saved} onReset={reset} />;
  if (showAssessment) return <BusinessLifeline />;
  if (showModeChoice) return <ReportModeChoice mode={reportMode} consent={aiConsent} onModeChange={setReportMode} onConsentChange={setAiConsent} onContinue={beginAssessment} onBack={() => { setShowModeChoice(false); setAiConsent(false); }} />;
  return <JudgeLanding onStart={() => setShowModeChoice(true)} onDemo={openDemo} demoLoading={demoLoading} />;
}
