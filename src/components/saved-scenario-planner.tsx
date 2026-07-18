"use client";

import { useEffect, useState } from "react";
import { ActionCentre } from "@/components/action-centre";
import { BusinessTemplates } from "@/components/business-templates";
import { ScenarioPlanner } from "@/components/scenario-planner";
import type { BusinessData, BusinessReport } from "@/lib/types";

const STORAGE_KEY = "business-lifeline-mri-v2";

type SavedReport = {
  data: BusinessData;
  report: BusinessReport;
};

function readSavedReport(): SavedReport | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedReport>;
    if (!parsed.data || !parsed.report) return null;

    return parsed as SavedReport;
  } catch {
    return null;
  }
}

export function SavedScenarioPlanner() {
  const [saved, setSaved] = useState<SavedReport | null>(null);

  useEffect(() => {
    const sync = () => setSaved(readSavedReport());
    sync();

    const timer = window.setInterval(sync, 500);
    window.addEventListener("storage", sync);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!saved) return null;

  return (
    <div className="scenario-planner-shell">
      <ActionCentre report={saved.report} />
      <ScenarioPlanner data={saved.data} report={saved.report} />
      <BusinessTemplates data={saved.data} />
    </div>
  );
}
