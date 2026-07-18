"use client";

import { useEffect, useState } from "react";
import { ActionCentre } from "@/components/action-centre";
import { BusinessBrain } from "@/components/business-brain";
import { BusinessTemplates } from "@/components/business-templates";
import { ExecutiveSnapshot } from "@/components/executive-snapshot";
import { RecoveryCoach } from "@/components/recovery-coach";
import { RecoveryTimeline } from "@/components/recovery-timeline";
import { ReportToolNav } from "@/components/report-tool-nav";
import { ScenarioPlanner } from "@/components/scenario-planner";
import { TodayActionSheet } from "@/components/today-action-sheet";
import { readSavedReport, type SavedReport } from "@/lib/saved-report";

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
      <div id="timeline" className="report-tool-anchor"><RecoveryTimeline saved={saved} /></div>
      <div id="coach" className="report-tool-anchor"><RecoveryCoach data={saved.data} report={saved.report} /></div>
      <div id="brain" className="report-tool-anchor"><BusinessBrain saved={saved} /></div>
      <div id="today-sheet" className="report-tool-anchor"><TodayActionSheet data={saved.data} report={saved.report} /></div>
      <div id="actions" className="report-tool-anchor"><ActionCentre report={saved.report} /></div>
      <div id="scenarios" className="report-tool-anchor"><ScenarioPlanner data={saved.data} report={saved.report} /></div>
      <div id="templates" className="report-tool-anchor"><BusinessTemplates data={saved.data} /></div>
    </div>
  );
}
