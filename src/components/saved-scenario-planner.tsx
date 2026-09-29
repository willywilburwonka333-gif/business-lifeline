"use client";

import { useMemo, useState } from "react";
import { AccuracyBoost } from "@/components/accuracy-boost";
import { ActionCentre } from "@/components/action-centre";
import { BusinessBrain } from "@/components/business-brain";
import { BusinessOperatingSystem } from "@/components/business-operating-system";
import { BusinessOperatingPlatform } from "@/components/business-operating-platform";
import { BusinessRecords } from "@/components/business-records";
import { BusinessTemplates } from "@/components/business-templates";
import { LiveBusinessControl } from "@/components/live-business-control";
import { GrowthCentre } from "@/components/growth-centre";
import { ExitCentre } from "@/components/exit-centre";
import { ProfessionalValidationWorkspace } from "@/components/professional-validation-workspace";
import { RecoveryProgress } from "@/components/recovery-progress";
import { MriAccuracyProfilePanel } from "@/components/mri-accuracy-profile";
import { NativeFinanceHub } from "@/components/native-finance-hub";
import { ProductTutorial, tutorialStorageKey, type TutorialStep } from "@/components/product-tutorial";
import { RecoveryCoach } from "@/components/recovery-coach";
import { RecoveryPlaybooks } from "@/components/recovery-playbooks";
import { RecoveryTimeline } from "@/components/recovery-timeline";
import { ScenarioPlanner } from "@/components/scenario-planner";
import { TodayActionSheet } from "@/components/today-action-sheet";
import { WorkspaceDashboard } from "@/components/workspace-dashboard";
import type { SavedReport } from "@/lib/saved-report";
import type { WorkspaceTab } from "@/lib/workspace";

type MainArea = "mri" | "lifeline" | "operating" | "grow" | "sell";
type ToolId = "diagnosis" | "accuracy" | "evidence" | "validation" | "recovery" | "progress" | "coach" | "brain" | "cashflow" | "resources" | "health" | "command" | "run" | "finance" | "documents" | "growth" | "exit";
type ToolDefinition = { id: ToolId; label: string; detail: string };
type AreaDefinition = { id: MainArea; label: string; verb: string; detail: string; tools: ToolDefinition[] };
type TutorialId = "overview" | MainArea;

const areas: AreaDefinition[] = [
  { id: "mri", label: "Business MRI", verb: "Diagnose", detail: "Understand the business, verify the facts and identify what needs attention.", tools: [
    { id: "diagnosis", label: "Diagnosis", detail: "Pressure indicator, confidence, findings, risks and priorities" },
    { id: "accuracy", label: "Accuracy Inputs", detail: "Add payroll, tax, creditor, debt, facility and concentration details" },
    { id: "evidence", label: "Records & Evidence", detail: "Uploaded reports, sources and verification" },
    { id: "validation", label: "Professional Validation", detail: "Compare Lifeline findings with qualified adviser findings" },
  ] },
  { id: "lifeline", label: "Business Lifeline", verb: "Recover", detail: "Stabilise cash, execute the recovery plan and track the turnaround.", tools: [
    { id: "recovery", label: "Recovery Plan", detail: "Timeline, playbooks and priority actions" },
    { id: "progress", label: "Recovery Outcomes", detail: "Track whether cash, pressure and obligations actually improve" },
    { id: "coach", label: "Recovery Coach", detail: "Weekly follow-through and progress" },
    { id: "brain", label: "Business Brain", detail: "Grounded decision support" },
    { id: "cashflow", label: "Cashflow & Accuracy Boost", detail: "Build a 13-week forecast and test recovery decisions" },
    { id: "resources", label: "Resources", detail: "Action sheets and difficult-conversation templates" },
  ] },
  { id: "operating", label: "Operating System", verb: "Run", detail: "Operate customers, work, money, stock, sales, people and obligations in one place.", tools: [
    { id: "health", label: "Live Business Health", detail: "Continuous pressure, cash runway, exceptions, obligations, appointments and purchasing" },
    { id: "command", label: "Command Centre", detail: "Responsibilities, controls and operating documents" },
    { id: "run", label: "Run My Business", detail: "Complete CRM, sales, POS, market, jobs, invoices, stock, suppliers, money, people and reports" },
    { id: "finance", label: "Finance & Providers", detail: "Native ledger, business documents, payments and replaceable provider connections" },
    { id: "documents", label: "Business Records", detail: "Permanent document and evidence register" },
  ] },
  { id: "grow", label: "Growth Engine", verb: "Grow", detail: "Set targets, identify constraints, test economics and scale proven growth experiments.", tools: [
    { id: "growth", label: "Growth Centre", detail: "Targets, constraints, scenarios, initiatives and measurable experiments" },
    { id: "brain", label: "Growth Decisions", detail: "Ask Business Brain about pricing, hiring, capacity and investment decisions" },
    { id: "finance", label: "Growth Finance", detail: "Use live financial records to fund growth without losing control" },
  ] },
  { id: "sell", label: "Exit & Succession", verb: "Sell", detail: "Improve transferability, prepare due diligence and plan sale or succession.", tools: [
    { id: "exit", label: "Exit Readiness", detail: "Transferability, de-risking, data room, succession and valuation scenarios" },
    { id: "documents", label: "Data Room Records", detail: "Keep sale and due-diligence evidence organised" },
    { id: "validation", label: "Professional Review", detail: "Record accountant, adviser and specialist findings" },
  ] },
];

const tutorialSteps: Record<TutorialId, TutorialStep[]> = {
  overview: [
    { title: "Diagnose with Business MRI", body: "Start here to understand the Business Pressure Indicator, data confidence, risks, evidence and the most urgent priorities.", target: '.main-area-nav button:nth-child(1)' },
    { title: "Recover with Business Lifeline", body: "Turn the diagnosis into a recovery plan, weekly coaching, a 13-week cash forecast and practical actions.", target: '.main-area-nav button:nth-child(2)' },
    { title: "Run with the Operating System", body: "Manage the everyday business through live monitoring, CRM, sales, jobs, invoices, stock, suppliers, money and team workflow.", target: '.main-area-nav button:nth-child(3)' },
    { title: "Grow deliberately", body: "Set growth targets, expose constraints, model the economics and run measurable experiments before scaling spend or headcount.", target: '.main-area-nav button:nth-child(4)' },
    { title: "Prepare to sell or succeed", body: "Improve transferability, organise due diligence and plan a sale, management buyout, family succession, partner buyout or orderly closure.", target: '.main-area-nav button:nth-child(5)' },
  ],
  mri: [
    { title: "Diagnosis", body: "Review the pressure indicator, data confidence, escalation triggers, financial pressure and recommended priorities.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Accuracy Inputs", body: "Add optional payroll, super, PAYG, creditors, facilities, debt, guarantees, seasonality and customer concentration details to expose risks the fast MRI may miss.", target: '.area-tool-list button:nth-child(2)' },
    { title: "Records and Evidence", body: "Keep uploaded files, source information and verification records connected to the MRI.", target: '.area-tool-list button:nth-child(3)' },
    { title: "Professional validation", body: "Compare Lifeline findings with qualified adviser findings and record agreement, false alarms or possible missed risks.", target: '.area-tool-list button:nth-child(4)' },
    { title: "Recheck progress later", body: "Run another MRI after recovery work to measure whether the business is improving.", target: '.workspace-reset' },
  ],
  lifeline: [
    { title: "Recovery Plan", body: "Follow the timeline, playbooks and priority actions generated from the MRI.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Recovery outcomes", body: "Track whether pressure, monthly result, cash and overdue obligations actually improve over time.", target: '.area-tool-list button:nth-child(2)' },
    { title: "Recovery Coach", body: "Use the coach to keep weekly commitments visible and maintain momentum.", target: '.area-tool-list button:nth-child(3)' },
    { title: "Business Brain", body: "Ask grounded questions using the business information already in the system.", target: '.area-tool-list button:nth-child(4)' },
    { title: "Cashflow and Accuracy Boost", body: "Complete the optional 13-week forecast to find the first likely cash shortfall, then test recovery changes before acting.", target: '.area-tool-list button:nth-child(5)' },
    { title: "Resources", body: "Use action sheets, templates and scripts for difficult business conversations.", target: '.area-tool-list button:nth-child(6)' },
  ],
  operating: [
    { title: "Live Business Health", body: "Watch pressure change as sales, invoices, stock, tasks, cash and obligations change.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Command Centre", body: "Set responsibilities, operating controls and the documents needed to run the business properly.", target: '.area-tool-list button:nth-child(2)' },
    { title: "Run My Business", body: "Open the full operating platform for CRM, sales, POS, markets, jobs, invoices, stock, suppliers, money, team and reports.", target: '.area-tool-list button:nth-child(3)' },
    { title: "Lifeline Business Suite", body: "Run Books, Bank, Pay, Tax and People natively. Old accounting systems are optional migration sources under Lifeline Move.", target: '.area-tool-list button:nth-child(4)' },
    { title: "Business Records", body: "Maintain the permanent record of important documents and supporting evidence.", target: '.area-tool-list button:nth-child(5)' },
  ],
  grow: [
    { title: "Set a destination", body: "Define revenue, margin, owner-income and cash-buffer targets before spending to grow.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Find the constraint", body: "Use current MRI and Run data to identify what would break first if demand increased.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Run experiments", body: "Treat pricing, marketing, hiring and channel expansion as measurable experiments with cost, expected result and review dates.", target: '.area-tool-list button:nth-child(1)' },
  ],
  sell: [
    { title: "Improve transferability", body: "Reduce owner dependence, concentration risk and undocumented operations before entering a sale process.", target: '.area-tool-list button:nth-child(1)' },
    { title: "Build the data room", body: "Organise the financial, legal, staff, asset, customer, supplier and operating evidence a buyer or successor will need.", target: '.area-tool-list button:nth-child(2)' },
    { title: "Use valuation scenarios carefully", body: "Indicative earnings multiples are planning scenarios only and must not be presented as a professional valuation.", target: '.area-tool-list button:nth-child(1)' },
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
    <main className="workspace-panel" role="tabpanel" aria-label={currentTool.label}><div className="current-tool-title"><small>{currentArea.label}</small><h1>{currentTool.label}</h1><p>{currentTool.detail}</p></div>{activeTool === "diagnosis" && <WorkspaceDashboard saved={saved} openTab={dashboardOpenTab} />}{activeTool === "accuracy" && <MriAccuracyProfilePanel data={saved.data} />}{activeTool === "validation" && <ProfessionalValidationWorkspace saved={saved} />}{(activeTool === "evidence" || activeTool === "documents") && <BusinessRecords />}{activeTool === "recovery" && <div className="workspace-section-stack"><RecoveryTimeline saved={saved} /><RecoveryPlaybooks saved={saved} /><ActionCentre report={saved.report} data={saved.data} /></div>}{activeTool === "progress" && <RecoveryProgress saved={saved} />}{activeTool === "coach" && <RecoveryCoach data={saved.data} report={saved.report} />}{activeTool === "brain" && <BusinessBrain saved={saved} />}{activeTool === "cashflow" && <div className="workspace-section-stack"><AccuracyBoost data={saved.data} /><ScenarioPlanner data={saved.data} report={saved.report} /></div>}{activeTool === "resources" && <div className="workspace-section-stack resources-stage"><TodayActionSheet data={saved.data} report={saved.report} /><BusinessTemplates data={saved.data} /></div>}{activeTool === "health" && <LiveBusinessControl saved={saved} />}{activeTool === "command" && <BusinessOperatingSystem saved={saved} />}{activeTool === "run" && <BusinessOperatingPlatform />}{activeTool === "finance" && <NativeFinanceHub country={saved.data.country} />}{activeTool === "growth" && <GrowthCentre saved={saved} />}{activeTool === "exit" && <ExitCentre saved={saved} />}</main>
    <button type="button" className="product-help-button no-print" onClick={() => setTutorial(activeArea)}>Help &amp; tutorial</button><ProductTutorial tutorialId={tutorial ?? "overview"} title={tutorial === "overview" ? "Business Lifeline overview" : `${currentArea.label} tutorial`} steps={tutorialSteps[tutorial ?? "overview"]} open={Boolean(tutorial)} onClose={() => setTutorial(null)} onStep={onTutorialStep} />
  </div>;
}
