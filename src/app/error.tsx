"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Business Lifeline application error", { digest: error.digest, name: error.name });
  }, [error]);

  return (
    <main id="main-content" className="recovery-screen">
      <section className="recovery-card" role="alert">
        <p className="eyebrow">Business Lifeline recovery</p>
        <h1>Something didn’t load correctly.</h1>
        <p>Your saved browser records have not been deliberately deleted. Try the page again first, or return to the main screen.</p>
        <div className="recovery-actions">
          <button className="button primary" type="button" onClick={reset}>Try again</button>
          <a className="button ghost" href="/">Return to Business Lifeline</a>
        </div>
        <small>Do not refresh repeatedly while entering information. Contact businesslifeline.au@gmail.com if the problem continues.</small>
      </section>
    </main>
  );
}
