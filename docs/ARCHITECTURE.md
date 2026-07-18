# Business Lifeline Architecture

## System overview

Business Lifeline is a client-first Next.js application with server routes for OpenAI analysis. The product is deliberately split into deterministic financial logic, constrained AI interpretation, and browser-based execution tools.

## Main layers

### 1. Assessment layer

The Business MRI captures:

- business identity and operating context
- revenue, expenses, drawings, repayments, cash, receivables, debt, tax, and suppliers
- revenue trend
- business pressure factors
- immediate problem and recovery goal
- urgent payroll, tax, legal, debt, and closure concerns

### 2. Deterministic decision engine

TypeScript modules calculate and generate:

- monthly operating result
- operating margin
- expense ratio
- runway
- debt pressure
- receivables pressure
- revenue stability
- component health scores
- overall business health score
- warnings, strengths, risks, and urgent-help flags
- actions for today, seven days, thirty days, and ninety days

This layer remains available without an OpenAI key.

### 3. AI interpretation layer

Server routes call the OpenAI Responses API with:

- validated business data
- deterministic calculated metrics
- explicit system safety instructions
- strict JSON schemas
- a fixed timeout
- `store: false`

GPT-5.6 is the default model. `OPENAI_MODEL` can override it.

AI is used for interpretation rather than arithmetic. Failed or unavailable AI calls return the deterministic report or a calculation-based Business Brain fallback.

### 4. Recovery workspace

The saved MRI opens into seven workspaces:

- Dashboard
- Recovery
- Coach
- Business Brain
- Cashflow
- Operations
- Resources

Only one workspace is mounted at a time through the application controller and tab shell.

### 5. Execution and persistence

Prototype state is stored in browser local storage, including:

- saved MRI and report
- recovery history
- coach check-ins
- cashflow scenarios
- operating-system records

Saved data is validated before use. Invalid report data is removed rather than trusted.

## Safety boundaries

### The deterministic engine may

- calculate indicators from entered figures
- identify predefined warning conditions
- select rules-based recovery actions
- continue functioning without AI

### GPT-5.6 may

- interpret supplied context
- prioritise actions
- summarise likely root causes
- explain uncertainty
- ask for missing information
- recommend an appropriate category of professional support

### The system must not

- declare a business solvent or insolvent
- provide jurisdiction-specific legal or tax conclusions as fact
- invent figures or obligations
- guarantee an outcome
- conceal whether AI or fallback logic produced an answer

## Reliability controls

- strict request-body size limit
- numeric range validation
- required-string validation
- allowed-enum validation
- strict structured output
- request timeout
- deterministic fallback
- saved-report validation
- corrupt-state cleanup
- automated module tests
- ESLint
- production Next.js build
- GitHub Actions quality workflow

## Privacy model for the prototype

The prototype stores reports locally in the browser. OpenAI requests are sent only when the user generates AI analysis or asks Business Brain a question. Requests use `store: false`.

A commercial version would require authentication, encrypted storage, access controls, retention policies, consent management, monitoring, incident response, and formal privacy review.

## Future architecture

A production platform would add:

- authenticated accounts
- encrypted cloud persistence
- multiple businesses and adviser workspaces
- accounting and banking integrations
- secure document intake
- reminders and notification jobs
- audit history
- role-based permissions
- observability and error reporting
- jurisdiction-aware professional directories
- subscription and billing infrastructure