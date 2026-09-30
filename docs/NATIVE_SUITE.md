# Business Lifeline Native Suite

Updated: 30 September 2026

## Product strategy

Business Lifeline is native-first.

The canonical business record lives inside Business Lifeline. External accounting/CRM/job/stock software is not required to run the product.

Core data path:

**Customer → Quote → Job → Invoice → Payment → Bank → Books → MRI → Recover → Run → Grow → Sell**

External services are used only where the outside rail itself is unavoidable, such as a bank feed, card network, email delivery provider or government lodgement gateway.

## Native products

### Lifeline Books
- Double-entry ledger
- Chart of accounts
- Period locks
- Audit/source references
- Quotes, invoices and credits
- Supplier bills
- Partial payments
- Refunds
- Profit & Loss
- Balance Sheet
- Cash-flow statement
- Trial Balance
- General Ledger
- Aged Receivables
- Aged Payables
- GST control accounts
- ledger integrity checks
- inventory/COGS journals
- fixed-asset and FX journals

### Lifeline Bank
- Multiple bank accounts
- CSV statement import
- bank reconciliation
- exact-amount auto-match
- manual matching
- direct coding of unmatched statement lines into Lifeline Books
- card-clearing settlement
- statement-vs-ledger balance checks

A direct live bank feed can be added later as an optional banking/CDR rail. It is not required for bookkeeping.

### Lifeline Pay
- recurring invoicing
- deposits and instalment plans
- payment recording
- customer statements
- overdue invoice detection
- collections/reminder queue
- refund accounting

Card/direct-debit processing still requires a regulated payment/acquiring rail. Business Lifeline should own the invoice, receivable and collection workflow even when an external network moves the money.

### Lifeline Tax
- GST workpapers
- GST collected/input-credit tracking
- PAYG liability visibility
- super liability visibility
- tax-period workflow
- review/lodged/paid status
- tax payment journals
- exportable workpapers

Direct ATO/BAS lodgement remains an optional regulated government rail.

### Lifeline People
- employee register
- employment type
- pay rates
- timesheet import from Lifeline Jobs/People Time
- pay-run preparation
- gross, PAYG, super and net calculations using configured inputs
- payroll journals
- payroll clearing/payments
- leave-balance register

Production STP, award interpretation and statutory withholding engines require validated rules and approved lodgement rails before they can be represented as compliant payroll submission.

### Lifeline Spend
- purchase orders
- approval/order/receive/bill workflow
- supplier bill creation
- employee expense claims
- GST expense accounting
- reimbursements
- receipt references to Lifeline Vault
- mileage claims using a user/adviser-approved rate

### Lifeline Assets
- fixed-asset register
- purchase/acquisition posting
- GST treatment
- straight-line depreciation
- diminishing-value depreciation
- accumulated depreciation
- asset disposal
- gain/loss on disposal

Tax depreciation remains subject to the applicable tax rules and professional review.

### Lifeline Plan
- financial-year budget
- account-level monthly budgets
- actual-vs-budget variance
- revenue/cost/profit tracking against Lifeline Books

Business Lifeline's separate recovery cash-flow forecast and Grow scenario engine continue to handle liquidity and strategic what-if modelling.

### Lifeline FX
- base reporting currency
- foreign receivables/payables
- issue exchange rate
- settlement exchange rate
- exchange gain/loss
- base-currency ledger posting

Automatic market FX rates can be an optional data rail; manual/approved rates keep the accounting engine independent.

### Lifeline Sales
- CRM
- customer history
- quotes
- sales pipeline
- counter/market/POS-style sales
- customer statements through Lifeline Pay

### Lifeline Jobs
- quote → job → invoice
- job status
- linked expenses
- linked timesheets
- direct labour cost
- job margin and margin percentage
- overdue invoice follow-up

### Lifeline Stock
- product/SKU/barcode
- on-hand quantity
- cost/sell price
- stocktake
- reorder thresholds
- supplier reorder drafts
- opening inventory posting
- sale-driven COGS/inventory accounting
- stocktake variance accounting

### Lifeline Vault
- local encrypted-browser/device record storage model
- Firebase Storage backup for signed-in accounts
- duplicate detection
- record categories
- download/restore
- manifest export
- links to archived/external source records

### Lifeline Move
- CSV/JSON migration into Lifeline Books
- journals
- invoices
- supplier bills
- optional QuickBooks/Xero migration connectors
- migration review workflow
- opening-balance / Trial Balance validation

QuickBooks and Xero connectors are retained as optional migration bridges. MYOB/Sage direct connectors are no longer required for the target architecture; exported data can move through Lifeline Move.

## Still requires an external rail, not an external business app

Some functions cannot genuinely be made purely local because another regulated/network participant must perform the final action:

- live Open Banking/CDR bank feeds
- card acquiring / direct debit settlement
- email/SMS delivery
- STP submission
- BAS/ATO lodgement
- SuperStream / super clearing
- bank bill-payment initiation
- live FX-market data
- identity/verification services when legally required

The design rule is:

**Business Lifeline owns the workflow, records, accounting and decision logic. The external rail only transports money/data/lodgements.**

## Migration policy

Existing businesses should be able to:

1. export their old software;
2. import through Lifeline Move;
3. reconcile Trial Balance, debtors, creditors, GST, cash and opening balances;
4. lock the migration date;
5. continue operating natively in Business Lifeline.

No customer should be forced to maintain a Xero/QuickBooks/MYOB/Sage subscription after migration just so Business Lifeline works.
