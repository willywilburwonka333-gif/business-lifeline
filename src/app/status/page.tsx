import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Service Status",
  description: "Business Lifeline Early Access service status, support and recovery guidance.",
};

export default function StatusPage() {
  return (
    <main id="main-content" className="service-status-shell">
      <section className="service-status-hero">
        <Link href="/" className="service-status-back">← Back to Business Lifeline</Link>
        <p className="eyebrow">Early Access service information</p>
        <h1>Business Lifeline service status</h1>
        <p>Clear operational information and practical recovery guidance if something is not working as expected.</p>
      </section>

      <section className="service-status-content" aria-label="Current service information">
        <article className="service-status-card service-status-current">
          <div>
            <span className="service-status-dot" aria-hidden="true" />
            <div>
              <p className="service-status-label">Current published status</p>
              <h2>Operational</h2>
            </div>
          </div>
          <p>This page shows the studio’s current published status. It does not guarantee uninterrupted availability. The live health endpoint is available at <code>/api/health</code>.</p>
        </article>

        <article className="service-status-card">
          <h2>What still works during an AI interruption</h2>
          <p>The calculation-based Business MRI, saved browser records and local operating tools do not depend on an AI response. AI-enhanced analysis and Business Brain may temporarily fall back to calculation-based guidance.</p>
        </article>

        <article className="service-status-card">
          <h2>What to do if a page will not load</h2>
          <ol>
            <li>Check that your internet connection has returned.</li>
            <li>Refresh the page once.</li>
            <li>Return to the Business Lifeline home page and reopen the saved report.</li>
            <li>Do not clear browser data unless you have exported a backup or intentionally want to reset the app.</li>
          </ol>
        </article>

        <article className="service-status-card">
          <h2>Support and incident reports</h2>
          <p>Email <a href="mailto:businesslifeline.au@gmail.com">businesslifeline.au@gmail.com</a> with the page you were using, what you expected, what happened and the device/browser involved.</p>
          <p>Do not email passwords, banking credentials, tax file numbers, identity documents, customer records or confidential contracts.</p>
        </article>

        <article className="service-status-card">
          <h2>Security reports</h2>
          <p>Good-faith security reports are welcome. Include reproducible steps and the potential impact without accessing, changing or publishing another person’s information. See the repository security policy for the full reporting process.</p>
        </article>

        <div className="service-status-actions">
          <Link href="/" className="button primary">Return to Business Lifeline</Link>
          <Link href="/legal/support" className="button ghost">Support and complaints</Link>
        </div>
      </section>
    </main>
  );
}
