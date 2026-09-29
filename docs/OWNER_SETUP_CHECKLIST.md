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

## 5. Shared accounting token vault

Generate one long random secret and add:

- `ACCOUNTING_TOKEN_ENCRYPTION_KEY`

Changing this key after customers connect accounting software will make previously stored OAuth tokens unreadable, so back it up securely.

## 6. QuickBooks Online

Create/configure the Intuit application and add:

- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_REDIRECT_URI=https://business-lifeline.vercel.app/api/integrations/quickbooks/callback`

Register that exact callback URI with Intuit.

Current code supports authenticated read-only accounting OAuth, company verification, token refresh, the previous complete-month Profit and Loss, current Balance Sheet, and MRI fact ingestion.

## 7. Xero

Create/configure the Xero OAuth application and add:

- `XERO_CLIENT_ID`
- `XERO_CLIENT_SECRET`
- `XERO_REDIRECT_URI=https://business-lifeline.vercel.app/api/integrations/xero/callback`
- `XERO_SCOPES`

Register the exact callback URI with Xero.

Use the scopes approved for the Xero app that permit offline access, organisation/settings access and the financial reports used by Business Lifeline. Xero's scope model can change, so the repository deliberately allows the approved scope string to be supplied through `XERO_SCOPES` rather than permanently baking provider policy into the application.

Current code supports OAuth, rotating refresh tokens, tenant selection, organisation retrieval, previous complete-month Profit and Loss, current Balance Sheet and MRI fact ingestion.

## 8. Stripe

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

## 9. Production checks you must personally verify

Before a paid public launch:

1. Create a fresh customer account and verify email/password reset and Google sign-in.
2. Create two businesses and confirm switching does not leak records between them.
3. Invite a manager, staff member and accountant; verify their permissions.
4. Upload a document, restore it on another device, then delete it.
5. Connect QuickBooks to a test company and compare imported figures against the source reports.
6. Connect Xero to a test organisation and compare imported figures against the source reports.
7. Complete Stripe test-mode checkout, cancellation, billing-portal and failed-payment flows.
8. Run one healthy, one distressed, one overdue-tax and one payroll-risk MRI.
9. Test the full app on iPhone-width and desktop layouts.
10. Confirm the production Vercel deployment and all GitHub checks are green.

## 10. External assurance before relying on it commercially

Code alone cannot complete these:

- Australian legal/privacy review
- accounting/tax wording review
- security/penetration test
- professional validation of the Business Pressure Indicator and escalation logic
- real-business pilot testing
- business insurance/GST/accounting decisions
- refund/support operating process

Do not publish a claimed diagnostic accuracy percentage until professional comparison data supports it.
