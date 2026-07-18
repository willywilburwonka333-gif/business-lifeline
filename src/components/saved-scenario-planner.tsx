"use client";

import { useEffect, useState } from "react";
import { ActionCentre } from "@/components/action-centre";
import { BusinessTemplates } from "@/components/business-templates";
import { ExecutiveSnapshot } from "@/components/executive-snapshot";
import { ReportToolNav } from "@/components/report-tool-nav";
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
      <ReportToolNav />
      <div id="snapshot" className="report-tool-anchor"><ExecutiveSnapshot data={saved.data} report={saved.report} /></div>
      <div id="actions" className="report-tool-anchor"><ActionCentre report={saved.report} /></div>
      <div id="scenarios" className="report-tool-anchor"><ScenarioPlanner data={saved.data} report={saved.report} /></div>
      <div id="templates" className="report-tool-anchor"><BusinessTemplates data={saved.data} /></div>
    </div>
  );
}