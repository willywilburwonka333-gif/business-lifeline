"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { WorkspaceTab } from "@/lib/workspace";

const DEMO_GUIDE_KEY = "business-lifeline-demo-guide-v1";

type MainArea = "mri" | "lifeline" | "operating";
type ToolId = "diagnosis" | "evidence" | "recovery" | "coach" | "brain" | "cashflow" | "resources" | "command" | "run" | "documents";

type ToolDefinition = { id: ToolId; label: string; detail: string };
type AreaDefinition = { id: MainArea; label: string; verb: string; detail: string; tools: ToolDefinition[] };

const areas: AreaDefinition[] = [
  {
    id: "mri",
    label: "Business MRI",
    verb: "Diagnose",
    detail: "Understand the business, verify the facts and identify what needs attention.",
    tools: [
      { id: "diagnosis", label: "Diagnosis", detail: "Health score, findings, risks and priorities" },
      { id: "evidence", label: "Records & Evidence", detail: "Uploaded reports, sources and verification" },
    ],
  },
  {
    id: "lifeline",
    label: "Business Lifeline",
    verb: "Recover",
    detail: "Stabilise cash, execute the recovery plan and track the turnaround.",
    tools: [
      { id: "recovery", label: "Recovery Plan", detail: "Timeline, playbooks and priority actions" },
      { id: "coach", label: "Recovery Coach", detail: "Weekly follow-through and progress" },
      { id: "brain", label: "Business Brain", detail: "Grounded decision support" },
      { id: "cashflow", label: "Cashflow Simulator", detail: "Test recovery decisions before acting" },
      { id: "resources", label: "Resources", detail: "Action sheets and difficult-conversation templates" },
    ],
  },
  {
    id: "operating",
    label: "Operating System",
    verb: "Run",
    detail: "Operate customers, work, money, stock, sales, people and obligations in one place.",
    tools: [
      { id: "command", label: "Command Centre", detail: "Responsibilities, controls and operating documents" },
      { id: "run", label: "Run My Business", detail: "CRM, jobs, sales, stock, suppliers, expenses and staff" },
      { id: "documents", label: "Business Records", detail: "Permanent document and evidence register" },
    ],
  },
];

const areaForTool = (tool: ToolId): MainArea => areas.find((area) => area.tools.some((item) => item.id === tool))?.id ?? "mri";

export function SavedScenarioPlanner({ saved, onReset }: { saved: SavedReport; onReset: () => void }) {
  const [activeArea, setActiveArea] = useState<MainArea>("mri");
  const [activeTool, setActiveTool] = useState<ToolId>("diagnosis");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);

  useEffect(() => {
    setGuideOpen(window.localStorage.getItem(DEMO_GUIDE_KEY) === "1");
  }, []);

  const currentArea = useMemo(() => areas.find((area) => area.id === activeArea) ?? areas[0], [activeArea]);
  const currentTool = currentArea.tools.find((tool) => tool.id === activeTool) ?? currentArea.tools[0];

  const openArea = (area: MainArea) => {
    const definition = areas.find((item) => item.id === area) ?? areas[0];
    setActiveArea(area);
    setActiveTool(definition.tools[0].id);
    window.requestAnimationFrame(() => document.querySelector(".product-architecture")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openTool = (tool: ToolId) => {
    setActiveArea(areaForTool(tool));
    setActiveTool(tool);
    window.requestAnimationFrame(() => document.querySelector(".workspace-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const closeGuide = () => {
    window.localStorage.removeItem(DEMO_GUIDE_KEY);
    setGuideOpen(false);
  };

  const advanceGuide = () => {
    const next = guideIndex + 1;
    if (next >= areas.length) return closeGuide();
    setGuideIndex(next);
    openArea(areas[next].id);
  };

  const dashboardOpenTab = (tab: WorkspaceTab) => {
    const map: Partial<Record<WorkspaceTab, ToolId>> = {
      dashboard: "diagnosis", recovery: "recovery", coach: "coach", brain: "brain", cashflow: "cashflow",
      operations: "command", run: "run", records: "evidence", resources: "resources",
    };
    openTool(map[tab] ?? "diagnosis");
  };

  return (
    <div className="workspace-shell product-architecture">
      <header className="product-header no-print">
        <div className="product-brand">
          <span>BUSINESS LIFELINE</span>
          <strong>{saved.data.businessName}</strong>
          <small>MRI complete · Choose what the business needs now</small>
        </div>
        <button className="workspace-reset" type="button" onClick={onReset}>Start a new MRI</button>
      </header>

      <nav className="main-area-nav no-print" aria-label="Business Lifeline main areas">
        {areas.map((area) => (
          <button key={area.id} type="button" className={activeArea === area.id ? "active" : ""} onClick={() => openArea(area.id)}>
            <small>{area.verb}</small>
            <strong>{area.label}</strong>
            <span>{area.detail}</span>
          </button>
        ))}
      </nav>

      <section className="area-toolbar no-print" aria-label={`${currentArea.label} tools`}>
        <div className="area-heading">
          <small>{currentArea.verb.toUpperCase()}</small>
          <strong>{currentArea.label}</strong>
          <span>{currentArea.detail}</span>
        </div>
        <div className="area-tool-list" role="tablist">
          {currentArea.tools.map((tool) => (
            <button key={tool.id} type="button" role="tab" aria-selected={activeTool === tool.id} className={activeTool === tool.id ? "active" : ""} onClick={() => setActiveTool(tool.id)}>
              <strong>{tool.label}</strong><small>{tool.detail}</small>
            </button>
          ))}
        </div>
      </section>

      {guideOpen && (
        <aside className="architecture-guide no-print" aria-live="polite">
          <div><small>QUICK TOUR · {guideIndex + 1} OF 3</small><strong>{areas[guideIndex].verb}: {areas[guideIndex].label}</strong><p>{areas[guideIndex].detail}</p></div>
          <div className="architecture-guide-actions"><button type="button" className="button ghost" onClick={closeGuide}>Close tour</button><button type="button" className="button primary" onClick={advanceGuide}>{guideIndex === 2 ? "Finish" : "Next"} <span>→</span></button></div>
        </aside>
      )}

      <main className="workspace-panel" role="tabpanel" aria-label={currentTool.label}>
        <div className="current-tool-title"><small>{currentArea.label}</small><h1>{currentTool.label}</h1><p>{currentTool.detail}</p></div>

        {activeTool === "diagnosis" && <WorkspaceDashboard saved={saved} openTab={dashboardOpenTab} />}
        {(activeTool === "evidence" || activeTool === "documents") && <BusinessRecords />}
        {activeTool === "recovery" && <div className="workspace-section-stack"><RecoveryTimeline saved={saved} /><RecoveryPlaybooks saved={saved} /><ActionCentre report={saved.report} /></div>}
        {activeTool === "coach" && <RecoveryCoach data={saved.data} report={saved.report} />}
        {activeTool === "brain" && <BusinessBrain saved={saved} />}
        {activeTool === "cashflow" && <ScenarioPlanner data={saved.data} report={saved.report} />}
        {activeTool === "resources" && <div className="workspace-section-stack resources-stage"><TodayActionSheet data={saved.data} report={saved.report} /><BusinessTemplates data={saved.data} /></div>}
        {activeTool === "command" && <BusinessOperatingSystem saved={saved} />}
        {activeTool === "run" && <div className="workspace-section-stack"><RunModeFoundation saved={saved} /><OperatingAutomationHub /></div>}
      </main>
    </div>
  );
}
