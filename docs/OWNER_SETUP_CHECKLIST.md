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

Create a webhook endpoint:

`https://business-lifeline.vercel.app/api/billing/webhook`

Subscribe it to at least:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

The repository contains checkout, customer portal, entitlement status and webhook lifecycle code. The exact price amounts remain an owner decision.

## 8. Production checks you must personally verify

Before a paid public launch:

1. Create a fresh customer account and verify email/password reset and Google sign-in.
2. Create two businesses and confirm switching does not leak records between them.
3. Invite a manager, staff member and accountant; verify their permissions.
4. Upload a document, restore it on another device, then delete it.
5. Run a complete native business cycle: customer → quote → job → invoice → payment → bank reconciliation → Books.
6. Test Lifeline Spend purchase orders/claims, Lifeline People pay run, Lifeline Tax workpaper, Lifeline Assets depreciation, Lifeline Plan variance and Lifeline FX settlement.
7. Compare Lifeline Books P&L, Balance Sheet, Trial Balance, AR/AP aging and GST against an accountant-reviewed sample file.
8. Complete Stripe test-mode checkout, cancellation, billing-portal and failed-payment flows for Business Lifeline subscription billing.
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
