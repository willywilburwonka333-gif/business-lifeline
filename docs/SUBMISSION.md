# Business Lifeline — Build Week Submission

## Project title

**Business Lifeline — The AI Recovery Operating System for Small Business**

## One-line description

A Business MRI that combines deterministic financial analysis with GPT-5.6 to diagnose pressure, model recovery options, and turn recommendations into an executable turnaround plan.

## Elevator pitch

Small-business owners often know they are in trouble before they understand why. Business Lifeline converts scattered figures and urgent concerns into a clear diagnosis, top priorities, recovery scenarios, and a practical operating workspace. Core calculations are deterministic; GPT-5.6 interprets the business context, explains trade-offs, identifies missing information, and helps the owner decide what to do next.

## The problem

A struggling owner may be dealing with falling sales, poor margins, overdue invoices, tax debt, supplier pressure, payroll risk, limited cash, and exhaustion at the same time. Existing tools often provide bookkeeping data, generic chatbot advice, or expensive professional services—but not an ordered recovery journey.

The cost of delay is significant: cash can disappear, creditors become harder to negotiate with, jobs are placed at risk, and preventable business closures become more likely.

## The solution

Business Lifeline provides one connected workflow:

1. Run a structured Business MRI.
2. Calculate health, monthly performance, runway, debt pressure, and receivables pressure.
3. Prioritise what must happen today, this week, this month, and over 90 days.
4. Use GPT-5.6 to interpret root causes, trade-offs, unknowns, and escalation points.
5. Test combinations of pricing, sales, costs, drawings, repayments, collections, and funding.
6. Select a specialised recovery playbook.
7. Convert the plan into owned tasks, contacts, targets, controls, and weekly execution.

## Why GPT-5.6 is essential

The numerical foundation is deterministic and testable. GPT-5.6 adds value where rigid rules are insufficient:

- interpreting the owner’s narrative alongside the figures
- recognising likely root causes beneath symptoms
- resolving competing priorities
- explaining uncertainty and trade-offs in plain language
- asking questions that could materially change the plan
- adapting guidance to the specific business
- identifying when professional judgement is required

The model is constrained by structured output, supplied context, safety instructions, and deterministic metrics. The product remains useful when AI is unavailable.

## Technical implementation

- Next.js 16 and React 19
- TypeScript modules for calculations, plans, playbooks, simulation, recovery history, coaching, and operations
- OpenAI Responses API with GPT-5.6
- strict JSON-schema outputs
- request-size, type, range, and enum validation
- 25-second API timeout and deterministic fallback
- `store: false` for OpenAI requests
- browser persistence for the prototype
- responsive tabbed application workspace
- automated Node tests, ESLint, production build checks, and GitHub Actions

## Safety approach

Business Lifeline does not diagnose insolvency, provide tax or legal conclusions, or guarantee survival. It clearly separates calculated facts from AI interpretation, escalates serious warning signs, and directs high-stakes decisions toward qualified accountants, lawyers, tax agents, turnaround advisers, employment advisers, lenders, or insolvency professionals as appropriate.

## Potential impact

Earlier, clearer action can help an owner:

- preserve cash
- collect money owed
- negotiate before missing critical commitments
- protect jobs
- test decisions before implementing them
- arrive at professional meetings better prepared
- convert advice into accountable follow-through

The long-term opportunity is a privacy-conscious recovery platform connected to accounting data, banking, document intake, advisers, reminders, and multi-business workspaces.

## What was built with Codex

Codex was used as a hands-on engineering partner across architecture, implementation, testing, refactoring, safety design, responsive UI, documentation, and debugging. It helped convert the product from a single long report into a structured application with a Dashboard, Recovery, Coach, Business Brain, Cashflow, Operations, and Resources workspaces.

The development process was iterative and evidence-driven: inspect the repository, implement a stage, review real screenshots, identify failures, refactor, add tests, and repeat.

## Demo scenario

Riverbend Café is a six-year-old Australian café with nine employees, declining revenue, a monthly loss, limited cash, A$8,500 in overdue invoices, A$11,000 in overdue tax, and A$7,000 in overdue supplier obligations.

The demo shows how Business Lifeline identifies the crisis, selects a Tax Debt recovery pathway, explains the reasoning, tests a recovery combination, and turns the result into an operating plan.

## Honest limitations

This is an innovation prototype, not a regulated financial-advice service. Data is stored locally in the browser. It does not yet include user accounts, encrypted cloud storage, accounting integrations, subscriptions, team permissions, or formal adviser review across every jurisdiction.

## Closing statement

**Business Lifeline does not just tell an owner that the business is struggling. It shows what is wrong, what to do today, what could change the outcome, and how to run the recovery.**