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

function buildDemoReport(): BusinessReport {
  const base = generateReport(demoBusiness);
  return { ...base, aiStatus: "fallback" };
}

export function BusinessLifelineApp() {
  const [saved, setSaved] = useState<AppState>(undefined);
  const [showAssessment, setShowAssessment] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const lastRaw = useRef<string | null>(null);

  useLayoutEffect(() => {
    const next = readSavedReport();
    lastRaw.current = window.localStorage.getItem(REPORT_STORAGE_KEY);
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
    window.localStorage.setItem(MRI_MODE_KEY, "private");
    const openQuestions = () => {
      const button = document.querySelector<HTMLButtonElement>(".landing .hero-actions .button.primary");
      button?.click();
    };
    const frame = window.requestAnimationFrame(openQuestions);
    const timer = window.setTimeout(openQuestions, 80);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [showAssessment]);

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
    window.localStorage.setItem(MRI_MODE_KEY, "private");
    setShowAssessment(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    window.localStorage.removeItem(REPORT_STORAGE_KEY);
    window.localStorage.removeItem(DEMO_GUIDE_KEY);
    lastRaw.current = null;
    setSaved(null);
    setShowAssessment(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (saved === undefined) return <main className="loading app-loading" aria-label="Loading Business Lifeline"><span>Loading Business Lifeline…</span></main>;
  if (saved) return <SavedScenarioPlanner saved={saved} onReset={reset} />;
  if (showAssessment) return <main className="mri-direct-flow"><BusinessRecords compact /><BusinessLifeline /></main>;
  return <JudgeLanding onStart={beginAssessment} onDemo={openDemo} demoLoading={demoLoading} />;
}
