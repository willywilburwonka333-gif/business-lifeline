# Business Lifeline — MRI commercial-validation gate
Updated 8 October 2026

## What has actually been code-tested
- Operating surplus is revenue less supplied operating expenses; it is **not** a certified accounting profit.
- Cash surplus/deficit and runway use actual monthly cash receipts/payments only when **both** are explicitly entered. Otherwise they are **provisional revenue-based screening estimates**, not bank-reconciled cash flow.
- Data-completeness signals and automatically extracted records are **not** independent proof of accuracy.
- The recovery engine creates candidate explanations and actions; these are not established root causes.
- High-risk tax, payroll, legal and debt signals should trigger a referral to appropriately qualified professionals.

## Before any paid confidential-data MRI
- [ ] Confirm production Vercel build and that the exact merged commit is deployed.
- [ ] Verify Firestore and Storage rules in the **actual production project**, including owner A cannot read/write/delete owner B's business or files.
- [ ] Test authenticated invitation roles, revoked access, document upload/download, export, backups and deletion.
- [ ] Confirm encryption, data retention, legal privacy notice, subprocessors, consent, client confidentiality and breach procedure.
- [ ] Have a qualified Australian accountant independently reconcile a controlled sample: cash receipts/payments vs invoiced revenue, working capital, overdue obligations, 13-week forecast, and recovery action priority.
- [ ] Have a Queensland commercial lawyer review the exact paid service and customer contract, including BAS/tax/financial-product/insolvency advice boundaries, confidentiality, payment terms, remedies and complaints.
- [ ] Confirm appropriate insurance with a broker before offering professional consulting services.

These are external human/production checks; green GitHub builds cannot complete them.

## Validation cases — record actual results
1. Healthy profitable business, positive cash collections, no arrears.
2. Profitable **accrual** revenue but materially delayed customer receipts and negative **actual cash** movements.
3. Negative operating surplus with healthy timing of cash receipts (different profit/cash picture).
4. Large overdue wages, super, tax or legal notice, regardless of apparent health score.
5. Unpaid invoices exceeding stated total receivables (reject).
6. Partial cash inputs and negative/non-finite figures (reject).
7. Conflicting receipts / statements from different periods (do not assert a final source).
8. Two tenant accounts attempting cross-access in the deployed database.
9. Healthy and distressed businesses; verify no inappropriate blanket cuts, debt advice or guarantees.
10. Industry-specific cases for hospitality, trades and services using independently checked source records.

For each case record input sources, assumptions, expected and actual metrics, discrepancies, possible false alarms/missed warnings, reviewer name and date. Do not advertise a diagnostic accuracy percentage until enough professional evidence exists.

## First-customer service — narrow, human-reviewed
- Offer a **free demonstration using synthetic data** while external gates are pending.
- Recruit local owners to opt in to future controlled pilots; do not presume any target business is distressed.
- Once cleared, use a signed scope and obtain authority for the minimum necessary records.
- Deliver a source-labelled MRI with **three evidence-based findings**, actual confidence limitations, a 7/30/90-day operations plan, owner review and specialist referrals for regulated matters.
- $99 or $199 are **price hypotheses**, not validated prices.
- Never claim that the app independently verifies tax compliance, diagnoses insolvency, guarantees recovery or supplies a certified financial audit.
