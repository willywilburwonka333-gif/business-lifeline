import Link from "next/link";
import { BUSINESS, LEGAL_LINKS } from "@/lib/legal-content";

export function LegalFooter() {
  return (
    <footer className="legal-footer" aria-label="Business and legal information">
      <div className="legal-footer__inner">
        <div>
          <p className="legal-footer__brand">{BUSINESS.product}</p>
          <p className="legal-footer__identity">
            A {BUSINESS.release} product of {BUSINESS.businessName} · ABN {BUSINESS.abn}
          </p>
        </div>
        <nav className="legal-footer__links" aria-label="Legal and support links">
          {LEGAL_LINKS.map(([slug, label]) => (
            <Link key={slug} href={`/legal/${slug}`}>{label}</Link>
          ))}
        </nav>
        <p className="legal-footer__notice">
          Decision support only — not legal, accounting, tax, financial or insolvency advice.
        </p>
      </div>
    </footer>
  );
}
