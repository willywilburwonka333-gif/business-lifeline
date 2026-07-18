"use client";

import "@/app/workspace-shell.css";
import { useState } from "react";
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
import type { SavedReport } from "@/lib/saved-report";
import { workspaceTabs, type WorkspaceTab } from "@/lib/workspace";

export function SavedScenarioPlanner({ saved, onReset }: { saved: SavedReport; onReset: () => void }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");

  const openTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.querySelector(".workspace-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const activeDefinition = workspaceTabs.find((tab) => tab.id === activeTab) ?? workspaceTabs[0];

  return (
    <div className="workspace-shell">
      <nav className="workspace-tabs no-print" aria-label="Business Lifeline workspaces">
        <div className="workspace-tabs-brand">
          <span>Business Lifeline</span>
          <strong>{saved.data.businessName}</strong>
          <button className="workspace-reset" type="button" onClick={onReset}>Start a new MRI</button>
        </div>
        <div className="workspace-tab-list" role="tablist" aria-label="Workspace tabs">
          {workspaceTabs.map((tab) => (
            <button
              id={`workspace-tab-${tab.id}`}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`workspace-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => openTab(tab.id)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.detail}</span>
            </button>
          ))}
        </div>
      </nav>

      <main
        id={`workspace-panel-${activeTab}`}
        className="workspace-panel"
        role="tabpanel"
        aria-labelledby={`workspace-tab-${activeTab}`}
        aria-label={activeDefinition?.label}
      >
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
