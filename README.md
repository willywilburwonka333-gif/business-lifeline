# Business Lifeline

> **The small-business lifecycle operating system: Diagnose → Recover → Run → Grow → Sell.**

Business Lifeline helps a small-business owner understand what is wrong, recover control, run the business, grow deliberately, and prepare for succession or sale from one connected evidence base.

It combines deterministic financial calculations with GPT-5.6 interpretation. Core figures never depend on a language model; AI is used to explain context, resolve priorities, identify missing information, and make the recovery plan easier to act on.

## The problem

Small-business owners often know something is wrong before they know why. Their information is scattered across bank accounts, invoices, debts, tax obligations, staff commitments, and instinct. Professional help can arrive too late, and the wrong first decision can make the situation worse.

Business Lifeline creates an ordered path:

**Diagnose → Recover → Run → Grow → Sell**

## Product journey

1. **Business MRI** — captures the business, financial position, current pressures, and urgent concerns.
2. **Command Dashboard** — shows health, runway, primary pressure, overdue obligations, and the top three actions.
3. **GPT-5.6 interpretation** — explains likely root causes, trade-offs, unknowns, and professional judgement points.
4. **Recovery playbook** — selects the most relevant pathway, including cashflow crisis, tax debt, sales collapse, staffing pressure, rapid growth, sale preparation, succession, or a 90-day turnaround.
5. **Cashflow Simulator** — tests price, volume, costs, drawings, repayments, invoice collection, and additional cash.
6. **Recovery outcome** — distinguishes recurring operating repair from one-off cash relief and produces a reviewable action summary.
7. **Business Operating System** — converts advice into owned tasks, contacts, targets, controls, and weekly execution.
   - **Lifeline Sales** — CRM, quotes, pipeline and sales.
   - **Lifeline Jobs** — quote → job → invoice, job costs and margin.
   - **Lifeline Stock** — inventory, stocktake, reordering and COGS.
   - **Lifeline Books** — native double-entry accounting and financial reports.
   - **Lifeline Bank / Pay** — reconciliation, collections, recurring billing and instalments.
   - **Lifeline People / Spend / Tax** — payroll preparation, purchasing, claims, mileage and tax workpapers.
   - **Lifeline Assets / Plan / FX** — fixed assets, budgets and multi-currency accounting.
   - **Lifeline Vault / Move** — records and migration from old systems.
8. **Growth Engine** — sets revenue/margin/cash targets, detects constraints, models hiring/pricing/marketing economics, segments customers and tracks measurable growth experiments.
9. **Exit & Succession** — scores transferability, prepares a living due-diligence data room, tracks owner/customer/key-person risk, supports sale/succession paths and produces clearly labelled indicative earnings-multiple planning scenarios.

## What makes the AI use different

### Deterministic engine

The application calculates:

- monthly operating result
- operating margin
- expense ratio
- cash runway
- debt pressure
- receivables pressure
- Business Pressure Indicator and component scores
- urgent-risk flags
- rules-based actions and fallback guidance

### GPT-5.6

GPT-5.6 is used for:

- contextual diagnosis
- root-cause interpretation
- prioritising competing actions
- explaining trade-offs in plain language
- identifying missing information
- structured professional-escalation reasoning
- grounded Business Brain answers

AI responses use strict JSON schemas and are grounded in the supplied business data and deterministic metrics.

## Safety and trust

Business Lifeline is decision support, not accounting, legal, tax, financial, valuation, or insolvency advice.

The product:

- does not declare insolvency
- does not invent figures or laws
- does not guarantee recovery
- preserves a fully functional rules-based report when AI is unavailable
- highlights tax, payroll, legal, debt, and closure warning signs
- directs serious cases toward appropriately qualified professionals
- stores prototype reports in the user’s browser
- sends OpenAI requests with `store: false`

## Riverbend Café demo

The one-click demo shows a café with:

- declining revenue
- a monthly operating loss
- A$14,000 available cash
- A$8,500 in overdue customer invoices
- A$18,000 in overdue tax and supplier obligations
- tax and debt warning signs

The guided walkthrough moves through Diagnose, Recover and Run; completed businesses can then use Grow and Sell without re-entering their core operating evidence.

## Technology

- Next.js 16
- React 19
- TypeScript
- OpenAI Responses API
- GPT-5.6 default model with environment override
- strict structured output
- browser persistence for the prototype
- Node test runner
- ESLint
- GitHub Actions quality gate
- Vercel deployment

## How Codex was used

Codex assisted throughout the complete development cycle:

- repository inspection and architecture planning
- deterministic calculation and planning modules
- strict validation and safety fallbacks
- OpenAI API routes and structured-output schemas
- recovery timeline, coach, playbooks, simulator, Business Brain, and Business OS
- refactoring from a long report into a tabbed application shell
- responsive interface and accessibility improvements
- automated tests, linting, production build checks, and documentation
- iterative fixes based on real screenshots and user testing

The product was built through repeated inspect → implement → test → review cycles rather than a single generated prototype.

## Run locally

```bash
npm install
npm run dev
```

Open port 3000. In GitHub Codespaces, use the forwarded port URL.

### Environment

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6
```

`OPENAI_MODEL` is optional. Without an API key, the deterministic Business MRI and recovery workspace remain usable.

## Final validation

```bash
npm run check
```

This runs the full automated test suite, ESLint, and a production Next.js build. The same checks run in GitHub Actions on pushes to `main`.

## Submission package

- [`docs/SUBMISSION.md`](docs/SUBMISSION.md) — ready-to-paste project submission
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — two-to-three-minute demo script and shot list
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — technical architecture and AI boundaries
- [`docs/NATIVE_SUITE.md`](docs/NATIVE_SUITE.md) — native Business Lifeline software suite and external-rail boundaries
- [`docs/USER_TESTING.md`](docs/USER_TESTING.md) — honest tester questionnaire and evidence template
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) — final deployment and submission checklist

## Current product status

Business Lifeline is a submission-ready innovation prototype and public-beta candidate. It is not yet a production financial-advice platform. The current codebase includes Firebase authentication, Firestore workspace sync, document-assisted MRI intake and a native Business Lifeline accounting/operations suite. QuickBooks and Xero are optional migration bridges rather than runtime dependencies. Commercial launch still requires live tenant-isolation verification, monitoring, broader user validation, independent privacy/legal/security/accounting review and production testing of the native Books/Bank/Pay/People/Tax flows.

Built for OpenAI Build Week.