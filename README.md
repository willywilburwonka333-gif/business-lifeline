# Business Lifeline

> **The AI recovery operating system for small business.**

Business Lifeline helps an overwhelmed small-business owner understand what is wrong, decide what to do first, test recovery options, and run the turnaround from one place.

It combines deterministic financial calculations with GPT-5.6 interpretation. Core figures never depend on a language model; AI is used to explain context, resolve priorities, identify missing information, and make the recovery plan easier to act on.

## The problem

Small-business owners often know something is wrong before they know why. Their information is scattered across bank accounts, invoices, debts, tax obligations, staff commitments, and instinct. Professional help can arrive too late, and the wrong first decision can make the situation worse.

Business Lifeline creates an ordered path:

**Diagnose → Prioritise → Simulate → Execute**

## Product journey

1. **Business MRI** — captures the business, financial position, current pressures, and urgent concerns.
2. **Command Dashboard** — shows health, runway, primary pressure, overdue obligations, and the top three actions.
3. **GPT-5.6 interpretation** — explains likely root causes, trade-offs, unknowns, and professional judgement points.
4. **Recovery playbook** — selects the most relevant pathway, including cashflow crisis, tax debt, sales collapse, staffing pressure, rapid growth, sale preparation, succession, or a 90-day turnaround.
5. **Cashflow Simulator** — tests price, volume, costs, drawings, repayments, invoice collection, and additional cash.
6. **Recovery outcome** — distinguishes recurring operating repair from one-off cash relief and produces a reviewable action summary.
7. **Business Operating System** — converts advice into owned tasks, contacts, targets, controls, and weekly execution.

## What makes the AI use different

### Deterministic engine

The application calculates:

- monthly operating result
- operating margin
- expense ratio
- cash runway
- debt pressure
- receivables pressure
- business health score
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

The guided walkthrough moves through the Dashboard, Business Brain, Cashflow Simulator, Recovery Playbook, and Business OS.

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
- [`docs/USER_TESTING.md`](docs/USER_TESTING.md) — honest tester questionnaire and evidence template
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) — final deployment and submission checklist

## Current product status

Business Lifeline is a submission-ready innovation prototype and public-beta candidate. It is not yet a production financial-advice platform. Commercial development would require authentication, encrypted cloud storage, formal privacy and legal review, monitoring, broader user validation, and accounting integrations.

Built for OpenAI Build Week.