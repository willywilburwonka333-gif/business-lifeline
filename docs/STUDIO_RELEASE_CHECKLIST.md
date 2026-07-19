# Business Lifeline Studio Release Checklist

No production merge is complete until every required item below is confirmed or explicitly documented as not applicable.

## 1. Build and deployment

- [ ] Pull request is limited to the intended release scope.
- [ ] Vercel preview deployment succeeds.
- [ ] Repository tests, lint and production build pass.
- [ ] No secrets, credentials or private business records are committed.
- [ ] Preview and production environment variables are correctly separated.
- [ ] A known-good production deployment is identified for rollback.

## 2. Core customer journey

- [ ] Fresh-browser Business MRI completes on mobile.
- [ ] Returning user can reopen the saved report.
- [ ] Calculation-only report completes without AI.
- [ ] AI-enhanced report requires explicit consent.
- [ ] AI failure produces a calm calculation-based fallback.
- [ ] Business OS tabs, Add task and Add contact move the selected module into view.
- [ ] Mobile keyboard, scrolling and primary buttons remain usable.

## 3. Privacy and customer control

- [ ] Privacy Policy, Terms, AI Notice, Refunds, Early Access, Acceptable Use, Security and Support links work.
- [ ] AI payload remains minimised and excludes unnecessary names, notes and history.
- [ ] Export local data produces a readable backup.
- [ ] Delete local data requires confirmation and resets the app.
- [ ] No customer-facing screen requests passwords, banking credentials, tax file numbers or identity documents.
- [ ] Customer-facing wording does not claim perfect security, privacy, availability or business outcomes.

## 4. Reliability and recovery

- [ ] Offline banner appears and disappears correctly.
- [ ] Missing-page recovery returns the user safely to the app.
- [ ] Application error screen offers Retry and Return Home.
- [ ] `/api/health` returns only safe operational metadata.
- [ ] Public `/status` page loads on iPhone and desktop.
- [ ] Local browser records remain intact during ordinary retry and navigation recovery.

## 5. Support and commercial operations

- [ ] `businesslifeline.au@gmail.com` is monitored.
- [ ] Support, refund, complaint and security-report wording is current.
- [ ] Release notes explain meaningful customer changes.
- [ ] Known limitations are recorded before launch.
- [ ] OpenAI and Vercel cost exposure is reviewed.
- [ ] A production smoke test is completed after deployment.

## 6. Production approval

- [ ] Implementation partner confirms technical checks.
- [ ] Studio owner confirms live mobile experience.
- [ ] Studio owner authorises production merge.
- [ ] Production deployment succeeds.
- [ ] Production URL is checked after deployment.
- [ ] Rollback is initiated immediately if a critical customer journey fails.

## Rollback trigger

Rollback to the last known-good production deployment when any of the following occurs:

- users cannot complete or reopen the MRI;
- saved browser records are unexpectedly deleted or corrupted;
- AI receives information without explicit consent;
- a critical security or privacy exposure is confirmed;
- production repeatedly crashes or cannot load;
- payment or authentication failures later create incorrect customer access.

Record the incident, preserve relevant non-sensitive diagnostics, notify affected users where appropriate, and do not redeploy until the root cause is understood.
