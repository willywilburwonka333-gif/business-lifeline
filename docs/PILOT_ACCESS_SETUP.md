# Business Lifeline — guided pilot access rollout

**Status: staged feature. Do not merge/deploy without verified studio owner UID and a Firebase rules rollout.**

## Roles

1. **Public visitor:** informational site, fictional example, five indicative offers, sign-in/registration, legal pages. No production MRI input, repair editing, invoices, advanced modules or live customer data.
2. **Verified registered business:** automatically obtains **pilot** access. Pilot exposes Business MRI, supporting accuracy/evidence inputs, recovery plan, repair projects, progress, coach, cash-flow scenarios and resources. Advanced Run/Grow/Sell/Finance, paid AI, integrations and purchases are restricted. Pilot is *not* a paid subscription entitlement: offer pricing/scope is manually agreed.
3. **Full customer:** studio owner can grant/revoke `full` through the signed-in studio approval panel. Full access is revoked back to pilot without altering the account's own MRI data.
4. **Studio owner:** full access plus list/approve/revoke controls. Studio owner status is pinned to one Firebase Authentication **UID** in a server-only Vercel variable, not the customer's business `owner` role and not a browser setting.

## Required rollout sequence

- Identify the studio operator's **existing Firebase Authentication UID** from Firebase Console → Authentication → Users, under the Business Lifeline Firebase project. Verify this is the account used for signing into the app. Do not create a second owner accidentally.
- Set **`BUSINESS_LIFELINE_OWNER_UID`** as a server-only environment variable in Vercel for Production (and the intended Preview environment), with the exact UID. **Never use a `NEXT_PUBLIC_` prefix.** It is an identity selector, not an API key.
- Ensure Firebase Admin service account variables remain configured. Check Firebase Authentication email/password and verification mail work.
- Deploy reviewed application code with green CI. Sign in with the intended owner and verify `GET /api/pilot/access` yields full access and studio owner; verify it bootstraps `pilotAccess/<ownerUid>` to `tier=full`.
- **Only then** publish the newly reviewed `firestore.rules` in the correct production Firebase project, and run two-account production tests: a fresh verified test account must be pilot, cannot access full-only Firestore collections or API endpoints, cannot change `pilotAccess`; studio owner must still be full and retain all previous data.
- Review account creation, Firebase rules, cloud sync, vault uploads/exports, sign-out, report archive, and business-to-business isolation. Test on two browsers/devices and a real iPhone.
- Confirm early pilots process only fictional or authorised *minimised* financial data until consent, privacy, legal/commercial and professional reviews are complete (see `docs/MRI_COMMERCIAL_VALIDATION.md` and `docs/PAID_MRI_PILOT_RUNBOOK.md`).
- Make **`NEXT_PUBLIC_APP_URL=https://businesslifeline.com.au`** and review any earlier Stripe callback/webhook URLs before taking payments. Do not imply an in-app purchase processes the five guided service prices.

## Security and limitations

- Firebase membership role `owner` means **owner of that single business account**, not owner of the Business Lifeline studio. Studio entitlements live in server-managed `pilotAccess/<uid>`, writable only by the admin SDK.
- Advanced Firestore module/records/finance/payroll/CRM/operations access and integrations are server-enforced; basic local JavaScript and user-owned backups are not a substitute for professional data handling.
- Guest promotional content is view-only. New registered pilots can initiate *their own* assessments; the five offer prices are illustrative and no charge or promise is made by clicking.
- Studio approvals change access to the existing account: they do **not** automatically trigger billing, a professional signoff or permission to access another company's data.
- Existing `businesslifelinesupport@gmail.com` remains the only account currently connected to ChatGPT for outgoing customer correspondence.
- Pilot clients should use their **own** accounts and devices for confidential information; screen sharing/phone guidance avoids putting several clients' records in one device cache. Do not ask a customer to share a password.
