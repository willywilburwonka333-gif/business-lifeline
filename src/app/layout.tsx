import type { Metadata, Viewport } from "next";
import { BusinessOsScrollAssist } from "@/components/business-os-scroll-assist";
import { CommercialCloudBridge } from "@/components/commercial-cloud-bridge";
import { ConnectionStatus } from "@/components/connection-status";
import { OperatingLedgerSync } from "@/components/operating-ledger-sync";
import { StructuredCoreRecordSync } from "@/components/structured-core-record-sync";
import { TeamWorkspaceManager } from "@/components/team-workspace-manager";
import "./globals.css";
import "./tools.css";
import "./print.css";
import "./status.css";
import "./accessibility.css";
import "./mobile.css";
import "./submission-polish.css";
import "./executive-dashboard.css";
import "./recovery-coach.css";
import "./business-brain.css";
import "./cashflow-simulator.css";
import "./recovery-playbooks.css";
import "./business-os.css";
import "./workspace-shell.css";
import "./run-mode.css";
import "./run-operating-core.css";
import "./operating-automation.css";
import "./connected-operations-v2.css";
import "./business-operating-platform.css";
import "./commercial-operating.css";
import "./document-vault.css";
import "./live-business-control.css";
import "./native-finance.css";
import "./advanced-accounting.css";
import "./operating-ledger-sync.css";
import "./commercial-finance-controls.css";
import "./team-workspace.css";
import "./structured-record-sync.css";
import "./product-architecture.css";
import "./business-records.css";
import "./stage7-reliability.css";
import "./judge-onboarding.css";
import "./stage8-guide.css";
import "./stage9-polish.css";
import "./stage10-transparency.css";
import "./recovery-mobile-fix.css";
import "./final-submission-polish.css";
import "./final-submission-details.css";
import "./legal.css";
import "./mri-ai-consent.css";
import "./reliability.css";
import "./service-status.css";
import "./firebase-workspace.css";
import "./product-tutorial.css";

export const metadata: Metadata = {
  title: { default: "Business Lifeline", template: "%s | Business Lifeline" },
  description: "Run a Business MRI, diagnose financial pressure, and turn the result into a practical recovery plan and operating system.",
  applicationName: "Business Lifeline",
  keywords: ["business recovery", "cashflow", "small business", "business MRI", "turnaround planning"],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#071b2d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to main content</a><ConnectionStatus /><CommercialCloudBridge /><OperatingLedgerSync /><TeamWorkspaceManager /><StructuredCoreRecordSync /><BusinessOsScrollAssist />{children}</body></html>;
}
