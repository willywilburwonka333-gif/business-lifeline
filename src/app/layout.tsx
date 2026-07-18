import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Business Lifeline | Business MRI",
  description: "Diagnose business pressure and build a practical 90-day rescue plan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
