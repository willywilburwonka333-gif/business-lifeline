# Business Lifeline — Current Product Status

Updated: 30 September 2026

## Product architecture

Business Lifeline is organised around three connected product areas:

1. **Business MRI — Diagnose**
   - Fast guided financial and operating assessment
   - Privacy and document intake
   - Deterministic calculations rather than AI arithmetic
   - Business Pressure Indicator, component scores and data-confidence rating
   - Hard escalation triggers for serious payroll, tax, legal, supplier and cash-runway risks
   - Evidence and record review

2. **Business Lifeline — Recover**
   - Recovery plan and timeline
   - Recovery playbooks
   - Action centre
   - Recovery Coach
   - Business Brain with model and calculation fallbacks
   - Cashflow simulator
   - Recovery resources and templates

3. **Business Operating System — Run**
   - Command centre and responsibilities
   - Customers, jobs, tasks, money and compliance
   - Stock, barcode capture and quick sales
   - CRM pipeline
   - Quotes and invoice-status workflow
   - Suppliers and purchase orders
   - Expense capture
   - Staff roster
   - Operating automation activity feed

## September 2026 final-plan completion pass

Implemented on `final-plan-completion` / PR #41:
- Fixed invisible inactive Commercial OS navigation labels on mobile.
- Expanded cloud backup to cover the current MRI, recovery, forecast, operating, finance and document metadata state.
- Added authenticated permanent account deletion including owned cloud data, accounting tokens and owner-scoped vault files.
- Added production-code Xero OAuth, tenant discovery, token refresh, Profit and Loss / Balance Sheet sync and MRI fact ingestion.
- Added Stripe Checkout, billing portal, webhook verification, subscription lifecycle and Rescue purchase foundation.
- QuickBooks now also calculates overdue open invoices and bills and feeds them into the MRI.
- New evidence now preserves the existing business context and automatically recalculates the deterministic MRI instead of wiping the assessment.
- Added Xero and Stripe validation tests and an exact external owner setup checklist.

## Earlier September 2026 completion pass

Implemented on `lifeline-completion-pass` / PR #40:
- MRI evidence is conflict-aware: materially different sources no longer silently overwrite each other.
- Evidence states distinguish confirmed, review, conflict and missing facts.
- High-confidence imported financial facts remove redundant MRI questions; uncertain/conflicting facts remain owner-confirmation questions.
- QuickBooks sync now reads the previous complete-month Profit and Loss and current Balance Sheet, normalises supported facts and feeds revenue, cash, receivables and debt into MRI evidence.
- Automated tests cover conflict handling and QuickBooks report normalisation.

Still externally blocked or intentionally incomplete:
- Xero production credential/scope validation and MYOB/Sage direct connections.
- Stripe production account, price IDs, webhook secret, test purchases and final entitlement/pricing approval.
- Production credential/configuration verification for Firebase, QuickBooks and AI providers.
- Independent legal/privacy/security review, penetration testing and professional validation of diagnostic accuracy.
- Full transaction-level provider normalisation and automated bank-feed reconciliation beyond the current native finance controls.
- Mature Grow/Sell lifecycle modules beyond existing recovery/succession foundations.

## Current source of truth

- Repository: `willywilburwonka333-gif/business-lifeline`
- Branch: `main`
- Latest accuracy-integration commit: `f57b3e2570ffc80d747a265bbf23c00c107e2698`
- Open automated-testing pull request: #36
- Product direction: keep the initial MRI extremely easy, then offer an optional **Accuracy Boost** for businesses needing a deeper assessment.

## Accuracy system completed so far

- Replaced the presentation of a generic health score with a **Business Pressure Indicator**.
- Added separate scores for cash flow, runway, liquidity, overdue obligations, debt and revenue stability.
- Added a data-confidence percentage so incomplete or inconsistent inputs do not appear falsely precise.
- Added hard score caps and escalation triggers so good revenue or cash cannot hide serious overdue obligations.
- Added plain-English explanations showing what drove the result.
- Updated saved-report validation to require the new score structure and reject corrupt or incomplete saved metrics.
- Expanded automated tests for healthy businesses, distressed businesses, uncovered arrears, low-confidence data and urgent payroll/legal concerns.
- Preserved AI as an interpretation layer; deterministic code remains responsible for arithmetic and core risk indicators.

## Important product boundary

The Business Pressure Indicator is decision support and risk screening. It must not be presented as:

- a legal solvency determination
- accounting, tax, legal, valuation or insolvency advice
- a guarantee that a business can recover
- a scientifically validated probability of failure

The exact scoring model still requires structured comparison against qualified accountants, advisers and restructuring professionals before any public accuracy percentage is claimed.

## Immediate validation required

1. Run `npm run check` against current `main`.
2. Confirm TypeScript, unit tests, lint and production build all pass.
3. Open the Riverbend Café demo and confirm the Business Pressure Indicator, confidence score and escalation reasons render correctly.
4. Refresh and confirm the expanded metrics survive saved-report validation.
5. Test a healthy business, a loss-making business, overdue-tax case and urgent-payroll case.
6. Test the score cards and explanations on iPhone-width layouts.
7. Rebase or replace PR #36 because its original base predates the latest accuracy commits.

## Accuracy Boost V1

The optional guided **13-week cash-flow forecast** is implemented after the fast MRI.

The user should only enter or confirm:

- opening cash
- expected weekly customer receipts
- wages and super
- tax payments
- rent and leases
- suppliers
- loan repayments
- other unavoidable payments
- known one-off receipts or expenses

The system should then calculate:

- weekly opening and closing cash
- first forecast cash shortfall
- lowest projected cash balance
- total funding gap
- weeks of usable runway
- obligations that cannot be met when due
- confidence level based on completed weeks and supplied evidence

The Accuracy Boost must remain optional so an overwhelmed owner can complete the fast MRI first.

## Build order after the 13-week forecast

1. Add expanded but progressive MRI inputs for business structure, GST basis, payroll, super, PAYG, creditor due dates, facilities, secured debt, guarantees, seasonality and customer concentration.
2. Connect forecast results to recovery actions, dashboard warnings, playbooks and Business Brain context.
3. Add industry modules, beginning with general retail/service, construction/trades, hospitality and petrol stations.
4. Add a professional-validation workspace for comparing app findings against adviser findings without exposing confidential data unnecessarily.
5. Measure agreement, false alarms, missed risks and priority-order accuracy before publishing any accuracy claim.

## Product promise

**Diagnose the business → Recover the business → Run the business.**

Long-term lifecycle:

**Start → Diagnose → Recover → Run → Grow → Sell.**
