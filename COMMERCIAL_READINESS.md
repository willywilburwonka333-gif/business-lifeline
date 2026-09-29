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

### Accounting connections

QuickBooks code includes:
- OAuth connection and encrypted token storage
- token refresh/disconnect
- company validation
- previous complete-month Profit and Loss
- current Balance Sheet
- open overdue invoice/bill detection
- MRI ingestion for revenue, cash, receivables, debt and overdue obligations

Xero code includes:
- OAuth connection and encrypted token storage
- rotating refresh-token handling
- organisation/tenant connection
- previous complete-month Profit and Loss
- current Balance Sheet
- MRI ingestion for supported revenue, cash, receivables and debt facts

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
- QuickBooks production app credentials and redirect approval
- Xero production app credentials, approved scopes and redirect approval
- Stripe account, products/prices, webhook secret and final pricing decisions
- Production AI API key
- Production Vercel environment-variable configuration
- Managed distributed rate-limit provider if required for public scale
- Monitoring/alerting service selection
- Independent security review and penetration test
- Australian legal/privacy review
- accountant/BAS-agent review of tax/accounting wording
- professional validation of diagnostic accuracy
- real-business pilot validation

See `docs/OWNER_SETUP_CHECKLIST.md` for the exact owner-side setup.

## Commercial launch gates

Do not call the product fully production-ready until:

1. The current Vercel deployment succeeds from `main`.
2. GitHub Actions can actually allocate a runner and all quality/security/e2e checks pass.
3. Firebase tenant-isolation and role tests are verified against the production project.
4. QuickBooks and Xero are tested against real sandbox/test organisations.
5. Stripe test-mode purchase, portal, cancellation and failed-payment flows are verified.
6. Mobile and desktop smoke tests pass.
7. Legal/privacy/security/professional reviews are complete.

## Product boundary

Business Lifeline is decision support. It must not be marketed as a legal solvency determination, guaranteed recovery system, substitute for professional accounting/legal/financial advice, or with a diagnostic accuracy percentage that has not been validated.
