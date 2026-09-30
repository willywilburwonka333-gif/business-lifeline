# Business Lifeline Commercial Readiness

Updated: 30 September 2026

## Implemented in code

### Account, data and workspace controls

- Email/password authentication and optional Google sign-in
- Email verification and password reset
- Local-first guest mode
- Cloud workspace sync and restore
- Full business/recovery workspace backup coverage for current local-storage modules
- Downloadable JSON workspace export
- Clear-local-device control
- Permanent authenticated account deletion flow
- Firebase Storage document backup/restore/delete
- Business creation and workspace switching
- Invite acceptance
- Owner/manager/staff/accountant roles
- Role-aware Firestore rules and tenant isolation
- Live shared-module sync
- Audit events

### Diagnose

- Evidence-first Business MRI
- PDF/CSV/Excel/Word/image record intake
- Source/evidence tracking
- Conflict-aware imported facts
- Confirmed/review/conflict/missing evidence states
- Adaptive MRI questions that skip high-confidence facts already supplied
- Deterministic Business Pressure Indicator and component metrics
- Hard escalation triggers
- Accuracy profile
- 13-week cash-flow forecast

### Recover

- Immediate, 7-day, 30-day and 90-day action planning
- Recovery playbooks
- Recovery Coach
- Business Brain with deterministic fallback
- Scenario planning
- Recovery resources/templates
- Automatic deterministic MRI recalculation when new evidence changes business facts
- Saved 13-week forecast shortfalls feed back into dashboard risks, recovery actions, Recovery Coach and Business Brain
- Longitudinal recovery outcome tracking
- Professional validation comparison workspace
- Industry-specific diagnosis modules for hospitality, construction/trades, petrol/convenience, retail and service businesses

### Run

- CRM/customers
- Products/services
- Sales and counter-sale workflow
- Quotes
- Jobs/tasks
- Invoice/payment workflow
- Expenses
- Suppliers/purchase orders
- Stock, stocktake and barcode capture
- Timesheets/roster
- Compliance obligations
- Appointments
- Native double-entry accounting foundation
- Quotes/invoices/credits with Print/PDF workflow
- GST operating summary
- Document vault
- Operating ledger sync and live business control tower

### Grow

- Revenue, margin, owner-income and cash-buffer targets
- Customer segment economics and repeat/recurring revenue inputs
- Capacity utilisation, owner workload and customer concentration constraints
- Run-data carry-forward for sales, pipeline, open tasks, active jobs and catalogue margins
- Pricing/volume/payroll/fixed-cost/marketing growth scenario model
- Growth experiment portfolio with expected vs actual outcomes
- Capital requirement and funding-readiness indicator

### Sell / succession

- Third-party sale, management buyout, family succession, partner buyout and orderly-closure pathways
- Exit-readiness / transferability scorecard
- Owner-dependence, customer-concentration and recurring-revenue risk inputs
- Living buyer due-diligence data-room checklist
- Maintainable earnings / SDE / EBITDA / EBIT-style planning inputs and normalisations
- User-entered multiple scenarios with explicit non-valuation disclaimer
- Run-data carry-forward into exit preparation
- Downloadable buyer-readiness pack

### Native Business Lifeline suite

- Lifeline Books: double-entry ledger, chart of accounts, locked periods, financial statements, Trial Balance, General Ledger, receivable/payable aging and integrity controls
- Lifeline Bank: multiple accounts, CSV statement import, reconciliation, matching and direct coding to Books
- Lifeline Pay: recurring billing, deposits/instalments, statements, collections and reminder queue
- Lifeline People: employee register, timesheets and payroll preparation with PAYG/super/payroll accounting
- Lifeline Spend: purchase orders, supplier bills, expense claims, mileage and reimbursements
- Lifeline Tax: GST/BAS preparation, tax-period workflow and tax-liability visibility
- Lifeline Assets: acquisition, depreciation and disposal accounting
- Lifeline Plan: budget and actual-vs-budget reporting
- Lifeline FX: foreign receivable/payable and settlement gain/loss accounting
- Lifeline Sales / Jobs / Stock: CRM, quote-to-job-to-invoice, job margin, POS-style sales, inventory and stocktake accounting
- Lifeline Vault: records and evidence
- Lifeline Move: CSV/JSON migration plus optional legacy QuickBooks/Xero bridges

QuickBooks/Xero are not required to operate Business Lifeline. Their existing OAuth code is retained only as an optional migration path.

### Paid-access foundation

- Stripe Checkout route
- recurring Pro checkout support
- one-time Rescue checkout support
- Stripe customer billing portal
- verified webhook signatures
- subscription update/cancellation handling
- failed-payment status handling
- account billing/entitlement state
- signed-in account billing controls

## External setup still required

These cannot be completed in repository code:

- Production Firebase credentials and publishing Firestore/Storage rules
- Stripe account, products/prices, webhook secret and final pricing decisions
- Production AI API key
- Production Vercel environment-variable configuration
- optional external rails only when enabled: live bank feeds/CDR, payment acquiring/direct debit, email/SMS delivery, STP/BAS/SuperStream lodgement and live FX-rate feeds
- Managed distributed rate-limit provider if required for public scale
- Monitoring/alerting service selection
- Independent security review and penetration test
- Australian legal/privacy review
- accountant/BAS-agent review of tax/accounting wording
- professional validation of diagnostic accuracy
- real-business pilot validation
- external valuation/accounting review before any exit scenario is used as a valuation opinion

See `docs/OWNER_SETUP_CHECKLIST.md` for the exact owner-side setup.

## Commercial launch gates

Do not call the product fully production-ready until:

1. The current Vercel deployment succeeds from `main`.
2. GitHub Actions can actually allocate a runner and all quality/security/e2e checks pass.
3. Firebase tenant-isolation and role tests are verified against the production project.
4. Lifeline Books is reconciled against accountant-reviewed sample businesses, including P&L, Balance Sheet, GST, AR/AP aging, payroll journals, inventory and fixed assets.
5. Lifeline Bank CSV reconciliation, Lifeline Pay collections, Lifeline People payroll preparation and Lifeline Tax workpapers are tested end-to-end.
6. Optional QuickBooks/Xero migration paths are tested only if they will be offered at launch.
7. Stripe test-mode purchase, portal, cancellation and failed-payment flows are verified for Business Lifeline subscription billing.
8. Mobile and desktop smoke tests pass.
9. Legal/privacy/security/accounting/payroll/tax/professional reviews are complete.

## Product boundary

Business Lifeline is decision support. It must not be marketed as a legal solvency determination, guaranteed recovery system, substitute for professional accounting/legal/financial advice, or with a diagnostic accuracy percentage that has not been validated.
