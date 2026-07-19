import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BUSINESS, LEGAL_DOCUMENTS, LEGAL_LINKS } from "@/lib/legal-content";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = LEGAL_DOCUMENTS[slug];
  if (!document) return {};
  return { title: document.title, description: document.summary };
}

export default async function LegalPage({ params }: PageProps) {
  const { slug } = await params;
  const document = LEGAL_DOCUMENTS[slug];
  if (!document) notFound();

  return (
    <main id="main-content" className="legal-page" tabIndex={-1}>
      <header className="legal-page__header">
        <Link className="legal-page__back" href="/">← Back to Business Lifeline</Link>
        <div className="legal-page__eyebrow">{BUSINESS.release} commercial information</div>
        <h1>{document.title}</h1>
        <p className="legal-page__summary">{document.summary}</p>
        <p className="legal-page__date">Effective {BUSINESS.effectiveDate}</p>
      </header>

      <div className="legal-page__layout">
        <nav className="legal-page__nav" aria-label="Legal documents">
          {LEGAL_LINKS.map(([itemSlug, label]) => (
            <Link key={itemSlug} className={itemSlug === slug ? "is-active" : ""} href={`/legal/${itemSlug}`}>
              {label}
            </Link>
          ))}
        </nav>

        <article className="legal-page__content">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && (
                <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
              )}
            </section>
          ))}
          <aside className="legal-page__contact">
            <strong>Need help or clarification?</strong>
            <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>
          </aside>
        </article>
      </div>
    </main>
  );
}
