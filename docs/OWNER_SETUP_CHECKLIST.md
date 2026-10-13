# Business Lifeline — Owner Setup Checklist

This file lists only the external setup that cannot be completed from repository code.

## 1. Vercel

Set the production application URL:

- `NEXT_PUBLIC_APP_URL=https://business-lifeline.vercel.app`

Keep Preview and Production secrets separate where possible.

## 2. Firebase web app

Required public web configuration:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

Enable:
- Email/password authentication
- Google authentication if you want the Google sign-in button enabled
- Firestore
- Firebase Storage

Publish the repository's `firestore.rules` and `storage.rules`.

## 3. Firebase Admin

Create a server-side Firebase service account and add:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `FIREBASE_ADMIN_STORAGE_BUCKET` (recommended; normally the same bucket as `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`)

Never expose these as `NEXT_PUBLIC_` variables.

## 4. AI providers

At least one provider is required for AI-enhanced analysis and document reading:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional override)

The deterministic MRI still works without an AI provider.

## 5. Native Business Lifeline suite

No QuickBooks, Xero, MYOB or Sage account is required for normal operation.

Before launch, configure and test the native suite:
- Lifeline Books
- Lifeline Bank
- Lifeline Pay
- Lifeline People
- Lifeline Spend
- Lifeline Tax
- Lifeline Assets
- Lifeline Plan
- Lifeline FX
- Lifeline Sales / Jobs / Stock
- Lifeline Vault
- Lifeline Move

The existing accounting token encryption variable and QuickBooks/Xero credentials are only required if you choose to offer those legacy migration connectors:

- `ACCOUNTING_TOKEN_ENCRYPTION_KEY`
- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_REDIRECT_URI`
- `XERO_CLIENT_ID`
- `XERO_CLIENT_SECRET`
- `XERO_REDIRECT_URI`
- `XERO_SCOPES`

They are optional for the target product architecture.

## 6. External rails only when you enable them

Business Lifeline owns the workflow and accounting. Some final network/regulatory actions still require an external rail:
- live bank feeds / Open Banking / CDR
- card acquiring or direct debit
- email/SMS delivery
- STP submission
- BAS/ATO lodgement
- SuperStream / super clearing
- direct bank bill payment
- automatic market FX rates

Do not add these until you choose the provider/approval path. CSV/manual workflows keep the native suite usable without them.

## 7. Stripe

Create Stripe products/prices for the plans you decide to launch, then add:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_RESCUE_PRICE_ID`

The five fixed-price diagnostic offers have already been created in the connected live Stripe account (one-time AUD prices). Their price IDs and hosted payment links are kept in `src/lib/service-payments.ts`. They are deliberately separate from the existing Pro subscription and Rescue package.

For the five authenticated service checkouts, also configure and verify:
- `STRIPE_WEBHOOK_SECRET` from **the Business Lifeline webhook endpoint**, not another app's webhook.
- `STRIPE_SERVICE_CHECKOUT_ENABLED=true` **only after** the endpoint is connected, delivery tested, and authenticated purchase records are verified. Without this flag, app account-linked checkouts remain disabled to prevent customers paying without reliable fulfilment.
- `STRIPE_SECRET_KEY` must belong to the same live Stripe account as these five price IDs.

A different Stripe webhook currently targets a Cloud Run address for another service; it does **not** deliver these payments to Business Lifeline. Create an independent endpoint at `https://business-lifeline.vercel.app/api/billing/webhook` and store that endpoint's unique signing secret in production Vercel. Never put signing secrets in client code.

Direct existing Stripe payment links can be shared manually without the app integration, but they do not automatically grant a Firebase account entitlement and must be manually reconciled with the paying customer. Cash and PayID still use the separately saved owner invoice workflow; they must not automatically mark a customer paid.

Create a webhook endpoint:

`https://business-lifeline.vercel.app/api/billing/webhook`

Subscribe it to at least:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

The repository contains checkout, customer portal, entitlement status and webhook lifecycle code. The exact price amounts remain an owner decision.

## 7A. Creator-controlled pilot registration

The real pilot workflow is implemented in `src/components/pilot-centre.tsx` and server routes `/api/pilots` and `/api/pilots/join`. Creator-only privileges are checked using the Firebase signed-in user's **verified email** against a **server-side production** environment variable:

- `BUSINESS_LIFELINE_CREATOR_EMAIL` — the Firebase-verified login email belonging to the sole-trader owner (never a `NEXT_PUBLIC_` variable).
- `BUSINESS_LIFELINE_CREATOR_UID` — optional but strongly recommended, pins creator rights to the exact Firebase Authentication account UID. Configure before sharing real client data.

If no creator email is configured, the app intentionally denies creator privileges. A customer cannot make themselves an administrator by editing Firestore. The `pilotProjects` and `pilotPaymentEvents` collections are accessible **only via verified server routes**, not through direct client Firestore writes. Existing Firestore rules deny both collections.

On the account screen, a configured creator can: create a pilot with the customer's exact email, name, business, service and payment method; share a one-time unique join link; rotate an unclaimed invitation; track invitations, claimed/active pilots, payments and opt-in shared summaries; mark paid manual transactions with a confirmed receipt reference; verify and reconcile a Stripe Checkout Session directly against Stripe; close a pilot.

Client flow: open unique link → sign in/create Firebase account and verify the invited email → explicitly accept pilot terms/privacy → join → select payment preference → pay via app once Stripe is activated (or arrange/manual payments) → complete MRI → explicitly share the summary.

Self-service flow (no owner present): sign in/create and verify a Firebase account → open **Create / join pilot** → choose service, business name and preferred payment method → accept terms/privacy → create a pending paid pilot → pay via authenticated Stripe checkout once it is activated, or arrange PayID/cash/transfer for creator approval. Complimentary access is invitation-only. Creator dashboard automatically lists these self-service registrations. Direct shareable Stripe links still require creator-side `cs_live_...` reconciliation, not merely a receipt screenshot.

No paid pilot is automatically granted service access for pending/unpaid transactions. Cash, PayID and bank transfers require actual funds and a creator's explicit verified acknowledgement. Free pilot access is intentionally marked `waived`, not paid.

**Before a first customer**:
- Test creator and guest identities in separate browsers; an unrelated email and an unverified email must not claim an invitation.
- Test zero-cost trial, Stripe account-linked purchase, direct Stripe payment reconciliation and cash/PayID receipt confirmation separately.
- Check pilot service scope/consent, customer report-sharing, and closing/revoking a pilot.
- Configure and test Stripe live endpoint events and the `STRIPE_SERVICE_CHECKOUT_ENABLED` switch; do **not** enable until Vercel environment access and webhook verification work.
- Do not upload client-identifiable payroll, bank credentials, card data, TFNs or identity documents without clearance.
- Obtain a privacy/security and appropriate professional review before inviting real businesses to upload confidential data.

## 8. Production checks you must personally verify

Before a paid public launch:

1. Create a fresh customer account and verify email/password reset and Google sign-in.
2. Create two businesses and confirm switching does not leak records between them.
3. Invite a manager, staff member and accountant; verify their permissions.
4. Upload a document, restore it on another device, then delete it.
5. Run a complete native business cycle: customer → quote → job → invoice → payment → bank reconciliation → Books.
6. Test Lifeline Spend purchase orders/claims, Lifeline People pay run, Lifeline Tax workpaper, Lifeline Assets depreciation, Lifeline Plan variance and Lifeline FX settlement.
7. Compare Lifeline Books P&L, Balance Sheet, Trial Balance, AR/AP aging and GST against an accountant-reviewed sample file.
8. Complete Stripe test-mode checkout, cancellation, billing-portal and failed-payment flows for Business Lifeline subscription billing. Verify all five diagnostic services (correct AUD price, invoice, signature, duplicate webhook idempotency, private Firebase entitlement, unpaid/delayed payment refusal, and a direct-link purchase needing manual reconciliation).
9. Run one healthy, one distressed, one overdue-tax and one payroll-risk MRI.
10. Test the full app on iPhone-width and desktop layouts.
11. Confirm the production Vercel deployment and all GitHub checks are green.

## 9. External assurance before relying on it commercially

Code alone cannot complete these:

- Australian legal/privacy review
- accounting/tax wording review
- security/penetration test
- professional validation of the Business Pressure Indicator and escalation logic
- real-business pilot testing
- business insurance/GST/accounting decisions
- refund/support operating process

Do not publish a claimed diagnostic accuracy percentage until professional comparison data supports it.
