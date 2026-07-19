export default function NotFound() {
  return (
    <main id="main-content" className="recovery-screen">
      <section className="recovery-card">
        <p className="eyebrow">Page not found</p>
        <h1>This page is not part of Business Lifeline.</h1>
        <p>Nothing has been changed or deleted. Return to the main product and continue from your saved browser records.</p>
        <div className="recovery-actions">
          <a className="button primary" href="/">Return to Business Lifeline</a>
          <a className="button ghost" href="/legal/support">Contact support</a>
        </div>
      </section>
    </main>
  );
}
