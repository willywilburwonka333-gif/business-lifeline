"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BusinessLifeline } from "@/components/business-lifeline";
import { JudgeLanding } from "@/components/judge-landing";
import { SavedScenarioPlanner } from "@/components/saved-scenario-planner";
import { demoBusiness } from "@/lib/demo";
import { generateReport } from "@/lib/planner";
import {
  readSavedReport,
  REPORT_STORAGE_KEY,
  writeSavedReport,
  type SavedReport,
} from "@/lib/saved-report";
import type { AiAnalysis, BusinessReport } from "@/lib/types";

export const DEMO_GUIDE_KEY = "business-lifeline-demo-guide-v1";

type AppState = SavedReport | null | undefined;

async function buildDemoReport(): Promise<BusinessReport> {
  const base = generateReport(demoBusiness);
  let report: BusinessReport = { ...base, aiStatus: "fallback" };

  try {
    const response = await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: demoBusiness }),
    });

    if (response.ok) {
      const result = await response.json() as { analysis?: AiAnalysis };
      if (result.analysis) report = { ...base, aiAnalysis: result.analysis, aiStatus: "ready" };
    }
  } catch {
    // The deterministic demo remains fully usable when AI is unavailable.
  }

  return report;
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

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === REPORT_STORAGE_KEY) sync();
    };

    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(sync, 250);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, []);

  const openDemo = async () => {
    if (demoLoading) return;
    setDemoLoading(true);

    const report = await buildDemoReport();
    const next: SavedReport = { data: demoBusiness, report };
    writeSavedReport(next);
    window.localStorage.setItem(DEMO_GUIDE_KEY, "1");
    lastRaw.current = window.localStorage.getItem(REPORT_STORAGE_KEY);
    setSaved(next);
    setDemoLoading(false);
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

  if (saved === undefined) {
    return (
      <main className="loading app-loading" aria-label="Loading Business Lifeline">
        <span>Loading Business Lifeline…</span>
      </main>
    );
  }

  if (saved) return <SavedScenarioPlanner saved={saved} onReset={reset} />;
  if (showAssessment) return <BusinessLifeline />;

  return (
    <JudgeLanding
      onStart={() => setShowAssessment(true)}
      onDemo={openDemo}
      demoLoading={demoLoading}
    />
  );
}
