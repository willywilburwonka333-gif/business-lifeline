"use client";

import "@/app/workspace-shell.css";
import "@/app/workspace-fix.css";
import { useEffect, useState } from "react";
import { ActionCentre } from "@/components/action-centre";
import { BusinessBrain } from "@/components/business-brain";
import { BusinessOperatingSystem } from "@/components/business-operating-system";
import { BusinessTemplates } from "@/components/business-templates";
import { RecoveryCoach } from "@/components/recovery-coach";
import { RecoveryPlaybooks } from "@/components/recovery-playbooks";
import { RecoveryTimeline } from "@/components/recovery-timeline";
import { ScenarioPlanner } from "@/components/scenario-planner";
import { TodayActionSheet } from "@/components/today-action-sheet";
import { WorkspaceDashboard } from "@/components/workspace-dashboard";
import { readSavedReport, type SavedReport } from "@/lib/saved-report";

type WorkspaceTab = "dashboard" | "recovery" | "coach" | "brain" | "cashflow" | "operations" | "resources";

const tabs: Array<{ id: WorkspaceTab; label: string; detail: string }> = [
  { id: "dashboard", label: "Dashboard", detail: "Overview" },
  { id: "recovery", label: "Recovery", detail: "Plan and timeline" },
  { id: "coach", label: "Coach", detail: "Weekly follow-through" },
  { id: "brain", label: "Business Brain", detail: "Grounded advice" },
  { id: "cashflow", label: "Cashflow", detail: "Simulator" },
  { id: "operations", label: "Operations", detail: "Business OS" },
  { id: "resources", label: "Resources", detail: "Sheets and templates" },
];

export function SavedScenarioPlanner() {
  const [saved, setSaved] = useState<SavedReport | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");

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

  useEffect(() => {
    document.body.classList.toggle("workspace-ready", Boolean(saved));
    return () => document.body.classList.remove("workspace-ready");
  }, [saved]);

  const openTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.querySelector(".workspace-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  if (!saved) return null;

  return (
    <div className="workspace-shell">
      <nav className="workspace-tabs no-print" aria-label="Business Lifeline workspaces">
        <div className="workspace-tabs-brand">
          <span>Business Lifeline</span>
          <strong>{saved.data.businessName}</strong>
        </div>
        <div className="workspace-tab-list" role="tablist" aria-label="Workspace tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => openTab(tab.id)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.detail}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="workspace-panel" role="tabpanel" aria-label={tabs.find((tab) => tab.id === activeTab)?.label}>
        {activeTab === "dashboard" && <WorkspaceDashboard saved={saved} openTab={openTab} />}
        {activeTab === "recovery" && (
          <div className="workspace-section-stack">
            <RecoveryTimeline saved={saved} />
            <RecoveryPlaybooks saved={saved} />
            <ActionCentre report={saved.report} />
          </div>
        )}
        {activeTab === "coach" && <RecoveryCoach data={saved.data} report={saved.report} />}
        {activeTab === "brain" && <BusinessBrain saved={saved} />}
        {activeTab === "cashflow" && <ScenarioPlanner data={saved.data} report={saved.report} />}
        {activeTab === "operations" && <BusinessOperatingSystem saved={saved} />}
        {activeTab === "resources" && (
          <div className="workspace-section-stack">
            <TodayActionSheet data={saved.data} report={saved.report} />
            <BusinessTemplates data={saved.data} />
          </div>
        )}
      </main>
    </div>
  );
}
