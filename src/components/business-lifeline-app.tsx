"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BusinessLifeline } from "@/components/business-lifeline";
import { SavedScenarioPlanner } from "@/components/saved-scenario-planner";
import { readSavedReport, REPORT_STORAGE_KEY, type SavedReport } from "@/lib/saved-report";

type AppState = SavedReport | null | undefined;

export function BusinessLifelineApp() {
  const [saved, setSaved] = useState<AppState>(undefined);
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

    // Storage events do not fire in the same tab. This lightweight check only
    // reparses the report when the stored value has actually changed.
    const timer = window.setInterval(sync, 100);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, []);

  const reset = () => {
    window.localStorage.removeItem(REPORT_STORAGE_KEY);
    lastRaw.current = null;
    setSaved(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (saved === undefined) {
    return (
      <main className="loading app-loading" aria-label="Loading Business Lifeline">
        <span>Loading Business Lifeline…</span>
      </main>
    );
  }

  return saved ? <SavedScenarioPlanner saved={saved} onReset={reset} /> : <BusinessLifeline />;
}
