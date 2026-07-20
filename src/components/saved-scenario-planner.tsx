"use client";

import { useEffect, useState } from "react";
import { ActionCentre } from "@/components/action-centre";
import { BusinessBrain } from "@/components/business-brain";
import { BusinessOperatingSystem } from "@/components/business-operating-system";
import { BusinessRecords } from "@/components/business-records";
import { BusinessTemplates } from "@/components/business-templates";
import { OperatingAutomationHub } from "@/components/operating-automation-hub";
import { RecoveryCoach } from "@/components/recovery-coach";
import { RecoveryPlaybooks } from "@/components/recovery-playbooks";
import { RecoveryTimeline } from "@/components/recovery-timeline";
import { RunModeFoundation } from "@/components/run-mode-foundation";
import { ScenarioPlanner } from "@/components/scenario-planner";
import { TodayActionSheet } from "@/components/today-action-sheet";
import { WorkspaceDashboard } from "@/components/workspace-dashboard";
import type { SavedReport } from "@/lib/saved-report";
import { workspaceTabs, type WorkspaceTab } from "@/lib/workspace";

const DEMO_GUIDE_KEY = "business-lifeline-demo-guide-v1";
const guideSteps: Array<{ tab: WorkspaceTab; title: string; copy: string }> = [
  { tab: "dashboard", title: "Understand the crisis", copy: "See health, cash pressure, risks and the first priorities." },
  { tab: "recovery", title: "Open the recovery plan", copy: "Use the timeline, recommended playbook and action centre." },
  { tab: "coach", title: "Create weekly follow-through", copy: "Track completed actions, cash recovered and savings found." },
  { tab: "brain", title: "Ask Business Brain", copy: "Review grounded AI interpretation and professional judgement points." },
  { tab: "cashflow", title: "Test a recovery", copy: "Change price, costs, collections and funding to compare outcomes." },
  { tab: "operations", title: "Run the turnaround", copy: "Move the plan into tasks, contacts, responsibilities and controls." },
  { tab: "run", title: "Keep operating", copy: "Use the connected operating system for customers, work, stock, sales, quotes, suppliers, expenses and staff." },
  { tab: "records", title: "Bring records together", copy: "Upload existing reports and exports, categorise them and confirm what is verified." },
  { tab: "resources", title: "Execute difficult conversations", copy: "Use the one-page rescue sheet and pre-filled templates." },
];

export function SavedScenarioPlanner({ saved, onReset }: { saved: SavedReport; onReset: () => void }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);

  useEffect(() => {
    setGuideOpen(window.localStorage.getItem(DEMO_GUIDE_KEY) === "1");
  }, []);

  const openTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.querySelector(".workspace-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const closeGuide = () => {
    window.localStorage.removeItem(DEMO_GUIDE_KEY);
    setGuideOpen(false);
  };

  const advanceGuide = () => {
    const nextIndex = guideIndex + 1;
    if (nextIndex >= guideSteps.length) {
      closeGuide();
      return;
    }
    setGuideIndex(nextIndex);
    openTab(guideSteps[nextIndex].tab);
  };

  const activeDefinition = workspaceTabs.find((tab) => tab.id === activeTab) ?? workspaceTabs[0];
  const guide = guideSteps[guideIndex];

  return (
    <div className="workspace-shell">
      <nav className="workspace-tabs no-print" aria-label="Business Lifeline stages">
        <div className="workspace-tabs-brand">
          <span>Business Lifeline</span>
          <strong>{saved.data.businessName}</strong>
          <small className="workspace-foundation">Foundation complete · Business MRI</small>
          <button className="workspace-reset" type="button" onClick={onReset}>Start a new MRI</button>
        </div>
        <div className="workspace-tab-list" role="tablist" aria-label="Nine-stage business recovery and operating workspace">
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
              <small>Stage {tab.stage}</small>
              <strong>{tab.label}</strong>
              <span>{tab.detail}</span>
            </button>
          ))}
        </div>
      </nav>

      {guideOpen && (
        <aside className="demo-guide no-print" aria-live="polite">
          <div className="demo-guide-progress"><span style={{ width: `${((guideIndex + 1) / guideSteps.length) * 100}%` }} /></div>
          <div className="demo-guide-copy">
            <small>GUIDED DEMO · STAGE {guideIndex + 1} OF {guideSteps.length}</small>
            <strong>{guide.title}</strong>
            <p>{guide.copy}</p>
          </div>
          <div className="demo-guide-actions">
            <button type="button" className="button ghost" onClick={closeGuide}>Exit guide</button>
            <button type="button" className="button primary" onClick={advanceGuide}>{guideIndex === guideSteps.length - 1 ? "Finish demo" : "Next stage"} <span>→</span></button>
          </div>
        </aside>
      )}

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
        {activeTab === "run" && <div className="workspace-section-stack"><RunModeFoundation saved={saved} /><OperatingAutomationHub /></div>}
        {activeTab === "records" && <BusinessRecords />}
        {activeTab === "resources" && (
          <div className="workspace-section-stack resources-stage">
            <TodayActionSheet data={saved.data} report={saved.report} />
            <BusinessTemplates data={saved.data} />
          </div>
        )}
      </main>
    </div>
  );
}
