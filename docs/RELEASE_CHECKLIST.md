# Business Lifeline Final Release Checklist

## 1. Repository validation

From a clean Codespaces terminal:

```bash
git pull
npm ci
npm run check
```

Confirm:

- every automated test passes
- ESLint completes without errors
- the production Next.js build completes
- no uncommitted files remain

Useful commands:

```bash
git status
git log -1 --oneline
```

## 2. Environment

Confirm the deployment has:

```text
OPENAI_API_KEY
OPENAI_MODEL=gpt-5.6
```

`OPENAI_MODEL` is optional because the code defaults to GPT-5.6.

Never commit the API key.

## 3. Fresh-browser test

Use a private/incognito browser window.

Confirm:

- judge landing page loads
- no saved business appears
- **Run My Business MRI** opens the assessment
- **Open Riverbend Café Demo** opens the real workspace
- no old long report appears underneath
- no unstyled tab text appears

## 4. Riverbend guided demo

Confirm:

- Dashboard opens first
- guided tour appears
- each next-step button opens the correct tab
- Dashboard figures are visible
- recommended playbook appears
- Business Brain accepts a suggested question
- AI source or fallback source is visible
- Cashflow changes update immediately
- recovery outcome appears after changing assumptions
- Recovery playbook opens
- Operations workspace opens
- Resources contains the action sheet and templates

## 5. Reset and persistence

Confirm:

- refreshing preserves the saved workspace
- only one workspace tab renders at a time
- **Start a new MRI** clears the saved report
- landing page returns after reset
- corrupt local data does not crash the product

## 6. Mobile test

Test in Safari on iPhone and Chrome responsive mode.

Confirm:

- no page-level sideways scrolling
- tabs scroll horizontally when required
- active tab is obvious
- buttons are large enough to tap
- guided-tour controls fit the screen
- Dashboard cards stack correctly
- Business Brain form is usable
- Cashflow inputs and outcome cards fit
- Resources and templates remain reachable

## 7. AI and fallback test

With the API key configured:

- generate Riverbend demo
- ask Business Brain a question
- confirm GPT-5.6 source labels appear

Then temporarily test without the API key locally:

- deterministic MRI still completes
- fallback label appears
- Business Brain returns calculation-based guidance
- no blank or permanently loading state occurs

## 8. Safety review

Confirm the UI does not claim:

- guaranteed recovery
- legal advice
- tax advice
- financial advice
- valuation
- solvency or insolvency determination

Confirm professional escalation is shown for Riverbend’s tax and debt pressure.

## 9. Deployment

Deploy only after `npm run check` passes.

Confirm the live deployment corresponds to the final commit.

Test the production URL again in a private browser. Do not submit a preview URL containing an older build.

## 10. Demo recording

Use `docs/DEMO_SCRIPT.md`.

Before recording:

- clear saved report
- close notifications
- use normal browser zoom
- rehearse once
- confirm GPT-5.6 is responding
- keep the recording between 2:30 and 3:00

Watch the exported video from beginning to end before submission.

## 11. Submission form

Use `docs/SUBMISSION.md` as the source text.

Before pressing Submit, confirm:

- project title is correct
- live URL works without login
- repository link is correct and accessible
- demo video opens
- description matches the actual product
- GPT-5.6 and Codex use are explained
- no fabricated users, quotes, or outcomes are claimed
- limitations are described honestly

## 12. Final freeze

Once the final live deployment passes:

- avoid adding new features
- fix only release-blocking defects
- record the final commit SHA
- record the final deployment URL
- preserve the final video and submission text

## Release decision

Submit only when all release-blocking checks are green:

- [ ] automated tests
- [ ] lint
- [ ] production build
- [ ] fresh-browser journey
- [ ] Riverbend demo
- [ ] GPT-5.6 response
- [ ] fallback response
- [ ] iPhone test
- [ ] desktop test
- [ ] final deployment
- [ ] final video
- [ ] submission links