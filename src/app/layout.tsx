import type { Metadata, Viewport } from "next";
import { BusinessOsScrollAssist } from "@/components/business-os-scroll-assist";
import { ConnectionStatus } from "@/components/connection-status";
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

export const metadata: Metadata = {
  title: { default: "Business Lifeline", template: "%s | Business Lifeline" },
  description: "Run a Business MRI, diagnose financial pressure, and turn the result into a practical recovery plan and operating system.",
  applicationName: "Business Lifeline",
  keywords: ["business recovery", "cashflow", "small business", "business MRI", "turnaround planning"],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#071b2d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to main content</a><ConnectionStatus /><BusinessOsScrollAssist />{children}</body></html>;
}
