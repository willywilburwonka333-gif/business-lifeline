# Business Lifeline — Current Product Status

Updated: 20 July 2026

## Product architecture

Business Lifeline is now organised around three main product areas:

1. **Business MRI — Diagnose**
   - Privacy and document intake
   - Business details, financials, pressures and priorities
   - Deterministic health score and findings
   - Evidence and record review

2. **Business Lifeline — Recover**
   - Recovery plan and timeline
   - Recovery playbooks
   - Action centre
   - Recovery Coach
   - Business Brain with OpenAI → Gemini → calculation fallback
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

## Current branch and pull request

- Branch: `feature/operating-automation-engine`
- Pull request: #19
- Latest architecture-polish commit: `acc5bddbfd4e24bc643a769d9e0a5def945b6310`
- PR #18 was merged into `main` at `02a9b29d5d4b9972912f6d7b371cd823a7bf6c8d`.

## What has just changed

- Replaced the confusing nine-stage navigation with three main areas: Diagnose, Recover and Run.
- Removed the conceptual duplication between Operations and Run by placing both inside the Operating System.
- Added area-specific internal tool navigation.
- Rebuilt the guided demo as a compact three-part tour.
- Added responsive mobile navigation and reduced top-of-screen clutter.
- Preserved the existing saved MRI, recovery and operating data keys.

## Immediate validation required

1. Wait for PR #19 GitHub and Vercel checks.
2. Test the new three-area navigation on iPhone.
3. Confirm dashboard buttons open the correct new area/tool.
4. Confirm the guided demo no longer covers most of the mobile screen.
5. Confirm all Operating System modules still load and save correctly.
6. Confirm Business Brain returns Gemini when OpenAI is unavailable.
7. Fix any TypeScript, lint, build or mobile layout failures before merging.

## Next build after navigation polish

### Connected Operations V2

- Stocktake sessions with expected-versus-counted variance
- Customer communication and purchase history
- Quote accepted → job/order creation
- Invoice due dates and overdue follow-up automation
- Supplier catalogue and automatic reorder drafts
- Receipt image attachment and recurring expenses
- Recurring tasks and reminders
- Staff timesheets and payroll-preparation export
- Market-day fast-sale mode
- End-of-day sales, cash and stock reconciliation
- Configurable automation rules

## Commercial backend still required

- Secure accounts and authentication
- Encrypted cloud database and file storage
- Multi-business support
- Team roles and permissions
- Real-time sync and backups
- Accounting, bank, payment and ecommerce integrations
- Notifications and scheduled automation
- Audit logs, export and deletion controls
- Subscription billing and usage limits
- Security, privacy and legal review

## Product promise

**Diagnose the business → Recover the business → Run the business.**

Long-term lifecycle:

**Start → Diagnose → Recover → Run → Grow → Sell.**
