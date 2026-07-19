# Business Lifeline — Commercial Release Master Plan

Status: Active
Owner: Wilbur Wonka studio
Product: Business Lifeline
Working model: One controlled step at a time. No stage advances until both the studio owner and implementation partner have completed and verified their responsibilities.

## Operating Principles

1. Trust and business safety take priority over speed.
2. Security, privacy and legal clarity are product features, not afterthoughts.
3. Every material change must be tested before production release.
4. No stage is marked complete until both technical and owner-side requirements are satisfied.
5. Sensitive secrets are never committed to GitHub or pasted into chat.
6. The product must remain simple for stressed business owners.
7. Commercial claims must be accurate, evidence-based and appropriately qualified.

## Stage 1 — Commercial Foundation

Goal: Controlled beta and paid-early-access readiness.

Technical responsibilities:
- Privacy Policy, Terms of Use, Acceptable Use Policy, AI notice, refund and cancellation policy, early-access terms.
- Legal and privacy links throughout the app.
- Clear AI consent for MRI and Business Brain.
- Support, complaint and feedback pathways.
- Trust and security page.
- Export and deletion controls.
- Release/version information.
- GitHub security, dependency and quality checks.
- Mobile usability, accessibility and end-to-end smoke testing.

Owner responsibilities:
- Confirm legal business name.
- Confirm ABN.
- Confirm business and support contact details.
- Confirm service address or approved contact address.
- Choose launch countries.
- Approve pricing approach, refund approach and release label.
- Arrange eventual Australian legal review.

Exit criteria:
- Legal pages published and linked.
- Consent flows tested.
- Support path operating.
- Production smoke test passed on mobile and desktop.
- Owner details verified.

## Stage 2 — Accounts, Payments and Paid Early Access

Goal: Real customers can register, pay, cancel and manage access safely.

Technical responsibilities:
- Authentication, email verification, password reset or magic link.
- Optional Google and Apple sign-in.
- Account deletion and session controls.
- Stripe Checkout, billing portal and verified webhooks.
- Subscription plans, entitlements, cancellation and failed-payment handling.
- Managed distributed rate limiting.
- AI usage limits and cost controls.
- Commercial onboarding and consent records.

Owner responsibilities:
- Open and verify Stripe account.
- Confirm prices, trials, GST treatment and refund rules.
- Add secrets directly to Vercel environment settings.
- Complete a real test purchase and refund.
- Approve authentication provider and customer plan structure.

Exit criteria:
- Test and live billing flows pass.
- Account lifecycle passes.
- Entitlements cannot be bypassed.
- Refund and cancellation flow is clear.

## Stage 3 — Secure Cloud Product

Goal: Reliable multi-device SaaS with strict business separation.

Technical responsibilities:
- Secure backend and cloud storage.
- Tenant isolation and role-based access.
- Owner, manager, staff and adviser permissions.
- Sync, backups, restore, export and deletion.
- Audit trails and session security.
- Migration from browser storage.
- Retention controls and recovery testing.

Owner responsibilities:
- Decide business/account structure.
- Decide staff and adviser access model.
- Decide whether local-only mode remains.
- Approve retention and deletion rules.
- Approve plan entitlements for cloud sync and teams.

Exit criteria:
- Tenant isolation tests pass.
- Backup and restore tests pass.
- Permission tests pass.
- Migration path is safe and reversible.

## Stage 4 — Full Commercial Launch

Goal: Public launch with mature operations, support and assurance.

Technical responsibilities:
- Release checklist and browser/device matrix.
- Monitoring with sensitive-data redaction.
- Incident response and vulnerability disclosure process.
- Support documentation, onboarding, FAQ and status tooling.
- Usage, cost and AI abuse monitoring.
- Admin and customer-support tools.
- Marketing and pricing page implementation.

Owner responsibilities:
- Final legal review.
- Insurance and accounting decisions.
- GST and business administration.
- Customer support ownership.
- Refund and complaint decisions.
- External penetration test before accepting highly confidential records.

Exit criteria:
- Legal and security reviews completed.
- Support operations active.
- Production monitoring active.
- Launch checklist signed off.

## Current Position

- Security hardening merged into main.
- Controlled beta is available for legitimate businesses using ordinary operational and financial data.
- Public paid launch is not yet approved.
- Current active work: Stage 1 — Commercial Foundation.

## Stage Gate Rule

Each step must record:
- Implementation partner tasks.
- Studio owner tasks.
- Evidence of completion.
- Test result.
- Final approval before progressing.
