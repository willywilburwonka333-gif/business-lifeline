# Business Lifeline — paid MRI and recovery-plan pilot runbook

Updated: 8 October 2026. This document is an operator checklist, not legal approval or professional certification.

## The offer to test
**Small-business operations review and recovery action plan** (proposed introductory service fee A$199, subject to validation and approval). It is a manually reviewed service assisted by Business Lifeline software, not a self-running audit, tax/BAS advisory engagement, credit-product recommendation or legally recognised insolvency assessment.

**Deliverables:** one guided intake; a source-and-confidence-labelled Business MRI screening; a three-priority operational action plan for the next 7, 30 and 90 days; a 20–30 minute owner walkthrough; one follow-up check. The customer retains final decisions and must seek qualified advice for regulated matters.

## Release stages
1. **Demonstration now**: fictional Riverbend Cafe and other synthetic demos; never ask for confidential uploads. Record usability feedback.
2. **Permission-based pilot**: only after scoped terms and a suitable privacy/security assessment; use minimum necessary de-identified and owner-authorised figures. Do not process TFNs, banking passwords, card data, medical details, identifiable payroll or third-party customer data.
3. **Confidential-data commercial service**: requires production tenant-isolation verification, authenticated role controls, file access/backups/delete tests, client contract/privacy review and insurance decision.
4. **SaaS/public product**: additionally verify live subscriptions, cancellations, refunds, incident response, professional financial validation and ongoing support.

## Operator go/no-go for client data
- [ ] Verify ABN, trading name, GST status and contact details.
- [ ] Written scope/price/consent, customer identity and authority to provide data.
- [ ] Legal review of scope and tax/BAS/AFSL/insolvency advice boundaries.
- [ ] Privacy policy accurately reflects current infrastructure, AI and third-party data flows.
- [ ] Verify authenticated data isolation and production Firebase/Storage rules; test two separate business owners.
- [ ] Verify safe file upload, access, export, deletion and backup/restore.
- [ ] Registered accountant tests MRI sample calculations, working-capital definitions and escalation logic.
- [ ] Insurance broker advises on professional indemnity and cyber exposure.
- [ ] Test actual current live deployment on phone and desktop.
- [ ] Agree procedure to delete records, fix errors, refer specialist cases and handle complaints/refunds.

If any critical condition is missing, use the fictional demo only and arrange a later opt-in diagnostic. Do not infer that because GitHub CI passes, the customer data environment and advice scope are approved.

## Ten-minute first conversation
1. Ask permission: 'I built a tool that helps small businesses organise their figures, highlight possible operational pressure and put together a practical action list. Could I show you a ten-minute fictional example?'
2. Ask open-ended questions: 'Which business admin jobs take too long? Do you track margins, unpaid invoices and cash weekly? What would be most useful to fix first?'
3. Show a fictional MRI: evidence, incomplete inputs, score limitations, three prioritised action ideas.
4. Explain the limits: 'It won't replace your accountant, BAS agent, lawyer or insolvency practitioner.'
5. Invite pilot feedback first. Do not imply the business is in trouble and do not promise savings or recovery.

## Collect only the minimum after clearance
Business category, recent agreed-period revenue, main categories of operating costs, usable cash, outstanding customer invoices, scheduled payments and owner-stated concerns. Reconcile totals and dates with the owner. Record what is verified, estimated, missing or contradictory. Never use a score as a diagnosis in itself.

## Delivery review checklist
- [ ] MRI and 13-week cash-flow assumptions match customer-provided period and source.
- [ ] No contradictory data, double counting or missing obligations are concealed.
- [ ] Every number has a source/date and a confidence assessment.
- [ ] Three action priorities have owner, cost, deadline, expected mechanism and measure of success.
- [ ] Tax/BAS, payroll/super, legal notices, severe arrears, suspected insolvency or credit-product questions are referred to the correctly qualified person.
- [ ] Recovery plans are clearly labelled as operational proposals with assumptions, not guaranteed results.
- [ ] Customer checks the findings and may correct them before receiving the report.
- [ ] Customer receives scope, invoice/receipt, privacy contact, refund/complaint route and next review date.

## Stop-and-refer triggers
Unpaid wages or super, suspected inability to meet debts as they fall due, legal demands, tax/BAS compliance, loan/investment/insurance recommendations, allegations of fraud or imminent closure. Do not tell a director to continue incurring debt or make formal insolvency/restructuring determinations.

## Pilot evidence (first three)
Record independently: time spent, source errors, data-confidence grade, false alarms, missed material risks, usability rating, and actual business changes after 30 days. Obtain written consent for any testimonial and do not claim an accuracy rate until independent professional evidence supports it.

## Current technical position
At 8 October 2026 the `main` branch has a green automated quality/security/beta-E2E history at `aa82f922`; **production deployment, Firebase credentials, tenant isolation on production, external provider availability, legal/commercial and professional reviews remain separately unverified**. Open historical PR #51 is stale and failing checks; do not merge it into main without rebasing and repairing actual issues.

## References for review (Australia)
- Tax Practitioners Board: https://www.tpb.gov.au/bas-services
- Tax Practitioners Board: https://www.tpb.gov.au/tax-agent-services
- ASIC insolvency and restructuring: https://www.asic.gov.au/regulatory-resources/insolvency/insolvency-for-directors/small-business-restructuring-and-the-restructuring-plan
- Australian Consumer Law: https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees
