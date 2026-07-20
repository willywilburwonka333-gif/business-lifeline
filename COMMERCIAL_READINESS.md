# Business Lifeline Commercial Readiness

## Stage 1 — Account, data and workspace controls

Implemented in the commercial foundation update:

- Email verification for password accounts
- Password reset email flow
- Account/security status in the app
- Downloadable JSON workspace export
- Clear-local-device control with confirmation
- Structured workspace metadata (`businesses/{businessId}` and `members`)
- Owner membership bootstrap
- Audit events for sync, restore, export and local data clearing
- Role-aware Firestore security rules for owner, manager, staff and accountant membership
- Legacy owner-only `userWorkspaces/{uid}` support retained during migration

## Stage 2 — Multi-user business workspaces

Next:

- Business creation and workspace switcher
- Invite acceptance flow
- Owner/manager/staff/accountant role management
- Collection-level data migration from the current payload backup
- Conflict-safe real-time sync
- Per-record audit history

## Stage 3 — Documents and transactions

Next:

- Firebase Storage for receipts, contracts and generated files
- PDF quotes and invoices
- Email delivery and customer acceptance
- GST and Australian tax settings
- Payment links and payment status webhooks
- Accounting platform integrations

## Stage 4 — Production operations

Next:

- Monitoring, alerting and backup verification
- Rate limiting and abuse controls
- Data retention, deletion and privacy workflows
- Support tooling and beta administration
- Security review and penetration testing
- Legal review for privacy, terms and financial disclaimers
