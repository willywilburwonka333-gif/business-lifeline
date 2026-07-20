"use client";

import { useMemo, useState } from "react";
import { ActionCentre } from "@/components/action-centre";
import { BusinessBrain } from "@/components/business-brain";
import { BusinessOperatingSystem } from "@/components/business-operating-system";
import { BusinessOperatingPlatform } from "@/components/business-operating-platform";
import { BusinessRecords } from "@/components/business-records";
import { BusinessTemplates } from "@/components/business-templates";
import { ProductTutorial, tutorialStorageKey, type TutorialStep } from "@/components/product-tutorial";
import { RecoveryCoach } from "@/components/recovery-coach";
import { RecoveryPlaybooks } from "@/components/recovery-playbooks";
import { RecoveryTimeline } from "@/components/recovery-timeline";
import { ScenarioPlanner } from "@/components/scenario-planner";
import { TodayActionSheet } from "@/components/today-action-sheet";
import { WorkspaceDashboard } from "@/components/workspace-dashboard";
import type { SavedReport } from "@/lib/saved-report";
import type { WorkspaceTab } from "@/lib/workspace";

type MainArea = "mri" | "lifeline" | "operating";
type ToolId = "diagnosis" | "evidence" | "recovery" | "coach" | "brain" | "cashflow" | "resources" | "command" | "run" | "documents";
type ToolDefinition = { id: ToolId; label: string; detail: string };
type AreaDefinition = { id: MainArea; label: string; verb: string; detail: string; tools: ToolDefinition[] };
type TutorialId = "overview" | MainArea;

const areas: AreaDefinition[] = [
  { id: "mri", label: "Business MRI", verb: "Diagnose", detail: "Understand the business, verify the facts and identify what needs attention.", tools: [
    { id: "diagnosis", label: "Diagnosis", detail: "Health score, findings, risks and priorities" },
    { id: "evidence", label: "Records & Evidence", detail: "Uploaded reports, sources and verification" },
  ] },
  { id: "lifeline", label: "Business Lifeline", verb: "Recover", detail: "Stabilise cash, execute the recovery plan and track the turnaround.", tools: [
    { id: "recovery", label: "Recovery Plan", detail: "Timeline, playbooks and priority actions" },
    { id: "coach", label: "Recovery Coach", detail: "Weekly follow-through and progress" },
    { id: "brain", label: "Business Brain", detail: "Grounded decision support" },
    { id: "cashflow", label: "Cashflow Simulator", detail: "Test recovery decisions before acting" },
    { id: "resources", label: "Resources", detail: "Action sheets and difficult-conversation templates" },
  ] },
  { id: "operating", label: "Operating System", verb: "Run", detail: "Operate customers, work, money, stock, sales, people and obligations in one place.", tools: [
    { id: "command", label: "Command Centre", detail: "Responsibilities, controls and operating documents" },
    { id: "run", label: "Run My Business", detail: "Complete CRM, sales, POS, market, jobs, invoices, stock, suppliers, money, people and reports" },
    { id: "documents", label: "Business Records", detail: "Permanent document and evidence register" },
  ] },
];

const tutorialSteps: Record<TutorialId, TutorialStep[]> = {
  overview: [
    { title: "Diagnose with Business MRI", body: "Start here to understand the business health score, risks, evidence and the most urgent priorities.", target: '.main-area-nav button:nth-child(1)' },
    { title: "Recover with Business Lifeline", body: "Turn the diagnosis into a recovery plan, weekly coaching, cashflow decisions and practical actions.", target: '.main-area-nav button:nth-child(2)' },
    { title: "Run with the Operating System", body: "Manage the everyday business through a connected CRM, sales, market, jobs, invoices, stock, suppliers, money and team workflow.", target: '.main-area-nav button:nth-child(3)' },
  ],
  mri: [
    { title: "Diagnosis", body: "Review the health score, findings, financial pressure, key risks and recommended priorities.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Records and Evidence", body: "Keep uploaded files, source information and verification records connected to the MRI.", target: '.area-tool-list button:nth-child(2)' },
    { title: "Recheck progress later", body: "Run another MRI after recovery work to measure whether the business is improving.", target: '.workspace-reset' },
  ],
  lifeline: [
    { title: "Recovery Plan", body: "Follow the timeline, playbooks and priority actions generated from the MRI.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Recovery Coach", body: "Use the coach to keep weekly commitments visible and maintain momentum.", target: '.area-tool-list button:nth-child(2)' },
    { title: "Business Brain", body: "Ask grounded questions using the business information already in the system.", target: '.area-tool-list button:nth-child(3)' },
    { title: "Cashflow Simulator", body: "Test decisions before acting and see how they affect the recovery outlook.", target: '.area-tool-list button:nth-child(4)' },
    { title: "Resources", body: "Use action sheets, templates and scripts for difficult business conversations.", target: '.area-tool-list button:nth-child(5)' },
  ],
  operating: [
    { title: "Command Centre", body: "Set responsibilities, operating controls and the documents needed to run the business properly.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Run My Business", body: "Open the full operating platform for CRM, sales, POS, markets, jobs, invoices, stock, suppliers, money, team and reports.", target: '.area-tool-list button:nth-child(2)' },
    { title: "Business Records", body: "Maintain the permanent record of important documents and supporting evidence.", target: '.area-tool-list button:nth-child(3)' },
  ],
};

const areaForTool = (tool: ToolId): MainArea => areas.find((area) => area.tools.some((item) => item.id === tool))?.id ?? "mri";

export function SavedScenarioPlanner({ saved, onReset }: { saved: SavedReport; onReset: () => void }) {
  const [activeArea, setActiveArea] = useState<MainArea>("mri");
  const [activeTool, setActiveTool] = useState<ToolId>("diagnosis");
  const [tutorial, setTutorial] = useState<TutorialId | null>(() => typeof window !== "undefined" && window.localStorage.getItem(tutorialStorageKey("overview")) !== "complete" ? "overview" : null);
  const currentArea = useMemo(() => areas.find((area) => area.id === activeArea) ?? areas[0], [activeArea]);
  const currentTool = currentArea.tools.find((tool) => tool.id === activeTool) ?? currentArea.tools[0];
  const openArea = (area: MainArea, offerTutorial = true) => { const definition = areas.find((item) => item.id === area) ?? areas[0]; setActiveArea(area); setActiveTool(definition.tools[0].id); if (offerTutorial && window.localStorage.getItem(tutorialStorageKey(area)) !== "complete") setTutorial(area); window.requestAnimationFrame(() => document.querySelector(".product-architecture")?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const openTool = (tool: ToolId) => { setActiveArea(areaForTool(tool)); setActiveTool(tool); window.requestAnimationFrame(() => document.querySelector(".workspace-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const dashboardOpenTab = (tab: WorkspaceTab) => { const map: Partial<Record<WorkspaceTab, ToolId>> = { dashboard: "diagnosis", recovery: "recovery", coach: "coach", brain: "brain", cashflow: "cashflow", operations: "command", run: "run", records: "evidence", resources: "resources" }; openTool(map[tab] ?? "diagnosis"); };
  const onTutorialStep = (_step: TutorialStep, index: number) => { if (tutorial === "overview") openArea(areas[index]?.id ?? "mri", false); else if (tutorial) setActiveTool(areas.find((area) => area.id === tutorial)?.tools[index]?.id ?? currentTool.id); };
  return <div className="workspace-shell product-architecture">
    <header className="product-header no-print"><div className="product-brand"><span>BUSINESS LIFELINE</span><strong>{saved.data.businessName}</strong><small>MRI complete · Choose what the business needs now</small></div><button className="workspace-reset" type="button" onClick={onReset}>Start a new MRI</button></header>
    <nav className="main-area-nav no-print" aria-label="Business Lifeline main areas">{areas.map((area) => <button key={area.id} type="button" className={activeArea === area.id ? "active" : ""} onClick={() => openArea(area.id)}><small>{area.verb}</small><strong>{area.label}</strong><span>{area.detail}</span></button>)}</nav>
    <section className="area-toolbar no-print" aria-label={`${currentArea.label} tools`}><div className="area-heading"><small>{currentArea.verb.toUpperCase()}</small><strong>{currentArea.label}</strong><span>{currentArea.detail}</span></div><div className="area-tool-list" role="tablist">{currentArea.tools.map((tool) => <button key={tool.id} type="button" role="tab" aria-selected={activeTool === tool.id} className={activeTool === tool.id ? "active" : ""} onClick={() => setActiveTool(tool.id)}><strong>{tool.label}</strong><small>{tool.detail}</small></button>)}</div></section>
    <main className="workspace-panel" role="tabpanel" aria-label={currentTool.label}><div className="current-tool-title"><small>{currentArea.label}</small><h1>{currentTool.label}</h1><p>{currentTool.detail}</p></div>{activeTool === "diagnosis" && <WorkspaceDashboard saved={saved} openTab={dashboardOpenTab} />}{(activeTool === "evidence" || activeTool === "documents") && <BusinessRecords />}{activeTool === "recovery" && <div className="workspace-section-stack"><RecoveryTimeline saved={saved} /><RecoveryPlaybooks saved={saved} /><ActionCentre report={saved.report} /></div>}{activeTool === "coach" && <RecoveryCoach data={saved.data} report={saved.report} />}{activeTool === "brain" && <BusinessBrain saved={saved} />}{activeTool === "cashflow" && <ScenarioPlanner data={saved.data} report={saved.report} />}{activeTool === "resources" && <div className="workspace-section-stack resources-stage"><TodayActionSheet data={saved.data} report={saved.report} /><BusinessTemplates data={saved.data} /></div>}{activeTool === "command" && <BusinessOperatingSystem saved={saved} />}{activeTool === "run" && <BusinessOperatingPlatform />}</main>
    <button type="button" className="product-help-button no-print" onClick={() => setTutorial(activeArea)}>Help &amp; tutorial</button><ProductTutorial tutorialId={tutorial ?? "overview"} title={tutorial === "overview" ? "Business Lifeline overview" : `${currentArea.label} tutorial`} steps={tutorialSteps[tutorial ?? "overview"]} open={Boolean(tutorial)} onClose={() => setTutorial(null)} onStep={onTutorialStep} />
  </div>;
}
