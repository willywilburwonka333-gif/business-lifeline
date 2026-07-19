export const BUSINESS = {
  product: "Business Lifeline",
  businessName: "Wilbur Wonka Studio",
  operator: "Dylan Corr",
  abn: "64 932 446 899",
  structure: "Australian sole trader",
  location: "Beenleigh, Queensland, Australia",
  supportEmail: "businesslifeline.au@gmail.com",
  mainEmail: "willywilburwonka333@gmail.com",
  release: "Early Access",
  territory: "Australia",
  effectiveDate: "19 July 2026",
} as const;

type Section = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type LegalDocument = { title: string; summary: string; sections: Section[] };

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  privacy: {
    title: "Privacy Policy",
    summary: "How Business Lifeline handles business information, browser storage, AI requests and support enquiries.",
    sections: [
      { heading: "Who we are", paragraphs: [`Business Lifeline is an ${BUSINESS.release} product operated by ${BUSINESS.businessName}, ${BUSINESS.structure}, ABN ${BUSINESS.abn}. Our public support contact is ${BUSINESS.supportEmail}.`] },
      { heading: "Information you provide", bullets: ["Business profile and industry information", "Financial estimates, debts, expenses and cash-flow information", "Operational concerns, priorities, tasks and recovery notes", "Questions you deliberately submit to Business Brain", "Support messages you send to us"] },
      { heading: "Local browser storage", paragraphs: ["The current Early Access product stores most Business Lifeline records locally in the browser on the device being used. Clearing browser data, changing devices or using private browsing may remove those records.", "Users can export a local backup and delete local Business Lifeline data from the app. Exported files may contain confidential business information and must be stored securely by the user."] },
      { heading: "AI processing", paragraphs: ["Business Lifeline does not need AI to calculate the core Business MRI. When a user actively enables and uses an AI feature, the question and a reduced selection of relevant business context may be transmitted to our AI service provider to generate a response.", "We minimise AI payloads and exclude the business name, full recovery history and unnecessary notes from Business Brain context. Users should not enter passwords, banking credentials, tax file numbers, identity documents, card details, customer personal information or privileged legal material."] },
      { heading: "How we use information", bullets: ["Provide the requested Business MRI, plan and operating tools", "Respond to support, privacy, refund and complaint enquiries", "Protect the service from misuse and excessive automated traffic", "Diagnose technical faults using minimised technical logs", "Comply with applicable Australian law"] },
      { heading: "Service providers and overseas processing", paragraphs: ["The service uses infrastructure and AI providers that may process technical or submitted information outside Australia. We limit the information sent and use provider security controls, but internet transmission cannot be guaranteed risk-free."] },
      { heading: "Retention and deletion", paragraphs: ["Local records remain on the user's device until deleted, browser storage is cleared or the browser removes them. Support correspondence is retained only as reasonably required to resolve the matter, keep business records and meet legal obligations.", `Privacy or deletion enquiries can be sent to ${BUSINESS.supportEmail}.`] },
      { heading: "Your responsibilities", paragraphs: ["You must have authority to enter business information and must not enter another person's sensitive or personal information unless legally authorised and genuinely necessary."] },
      { heading: "Changes", paragraphs: ["We may update this policy as the product develops. Material changes will be identified by a new effective date."] },
    ],
  },
  terms: {
    title: "Terms of Use",
    summary: "The rules governing access to and use of Business Lifeline during Early Access.",
    sections: [
      { heading: "Agreement", paragraphs: [`By using Business Lifeline, you agree to these Terms. The service is supplied by ${BUSINESS.businessName}, operated by ${BUSINESS.operator}, ABN ${BUSINESS.abn}, from ${BUSINESS.location}.`] },
      { heading: "Purpose of the service", paragraphs: ["Business Lifeline is a decision-support and business organisation tool. It converts information supplied by the user into calculations, indicators, warnings, prioritised actions and optional AI-assisted guidance."] },
      { heading: "Not professional advice", paragraphs: ["Business Lifeline is not a substitute for legal, accounting, taxation, financial, credit, employment, restructuring or insolvency advice. Outputs are general decision support and may be incomplete or unsuitable for a particular business.", "Users remain responsible for verifying figures, decisions, filings, contracts and legal obligations with appropriately qualified professionals."] },
      { heading: "Eligibility and authority", paragraphs: ["You must be at least 18 years old and authorised to use the business information you enter. You are responsible for the accuracy and legality of submitted information."] },
      { heading: "Early Access", paragraphs: ["The service is in Early Access. Features, storage methods, pricing and availability may change. We will take reasonable care, but interruptions, defects and data loss may occur. Users should maintain independent records and export important local data."] },
      { heading: "Acceptable use", bullets: ["Do not attempt to breach, disrupt or overload the service", "Do not use the service to falsify records, conceal unlawful conduct or evade legal obligations", "Do not submit malware, stolen data or information you are not authorised to use", "Do not resell, copy or reverse engineer the service except where law permits"] },
      { heading: "Intellectual property", paragraphs: ["Business Lifeline, its design, software, branding, content structure and original materials remain the property of the operator or applicable licensors. Users retain ownership of information they enter."] },
      { heading: "Availability and changes", paragraphs: ["We may modify, suspend or discontinue features where reasonably necessary for security, maintenance, legal compliance or product development."] },
      { heading: "Liability and Australian Consumer Law", paragraphs: ["Nothing in these Terms excludes rights or remedies that cannot lawfully be excluded, including applicable guarantees under the Australian Consumer Law.", "To the maximum extent permitted by law, we are not liable for indirect or consequential loss, lost profit, lost opportunity or decisions made without appropriate professional review."] },
      { heading: "Contact", paragraphs: [`Questions, complaints and support requests can be sent to ${BUSINESS.supportEmail}.`] },
    ],
  },
  ai: {
    title: "AI Data and Privacy Notice",
    summary: "A plain-language explanation of when AI is used and what information may leave the device.",
    sections: [
      { heading: "AI is optional", paragraphs: ["The core Business MRI can operate using calculation-based logic without transmitting the full MRI to an AI model. AI features require an explicit user action and consent signal."] },
      { heading: "What may be sent", bullets: ["The question the user asks", "Industry and country", "Selected totals, ratios and business-pressure indicators", "Relevant warnings, risks, actions and recovery progress"] },
      { heading: "What Business Brain is designed to exclude", bullets: ["Business name", "Full recovery history", "Unnecessary coach notes", "Records unrelated to the question"] },
      { heading: "Do not enter", bullets: ["Passwords, API keys or banking credentials", "Tax file numbers or identity documents", "Payment card details", "Employee medical or identity information", "Customer personal information", "Privileged legal correspondence or complete confidential contracts"] },
      { heading: "AI limitations", paragraphs: ["AI responses may be inaccurate, incomplete or overly confident. They must be checked against source records and reviewed by a qualified professional where legal, tax, accounting, employment, credit, restructuring or insolvency consequences may arise."] },
      { heading: "Safety boundaries", paragraphs: ["The AI is instructed not to help conceal illegal activity, falsify records, evade regulation, launder money or facilitate unlawful trade."] },
    ],
  },
  refunds: {
    title: "Refund and Cancellation Policy",
    summary: "Our Early Access refund approach and the rights that continue to apply under Australian law.",
    sections: [
      { heading: "Australian Consumer Law", paragraphs: ["Nothing in this policy limits rights and remedies that cannot be excluded under the Australian Consumer Law. Where the service has a major failure or another statutory remedy applies, we will provide the remedy required by law."] },
      { heading: "14-day goodwill refund", paragraphs: ["In addition to legal rights, a customer may request a goodwill refund within 14 days of the first purchase where the service has not been materially used. We may ask for enough information to identify the transaction and assess usage."] },
      { heading: "Subscriptions", paragraphs: ["Customers can cancel a subscription to prevent future renewal. Cancellation does not automatically refund a completed billing period unless required by law or approved under the goodwill policy."] },
      { heading: "How to request help", paragraphs: [`Send the purchase email, transaction date and a short explanation to ${BUSINESS.supportEmail}. Do not send passwords or full payment-card details.`] },
      { heading: "GST", paragraphs: ["Customer-facing Australian prices are displayed GST-inclusive unless clearly stated otherwise. Tax invoices or receipts will identify applicable GST."] },
    ],
  },
  "early-access": {
    title: "Early Access Terms",
    summary: "What customers should expect while Business Lifeline is being tested and improved.",
    sections: [
      { heading: "Current status", paragraphs: ["Business Lifeline is an Early Access product. The core recovery workflow is operational, but the product is still being tested with real businesses and may change based on feedback."] },
      { heading: "What may change", bullets: ["Features, layout and workflow", "Local and future cloud storage methods", "AI providers and limits", "Pricing, plans and entitlements", "Supported browsers and devices"] },
      { heading: "Customer responsibilities", bullets: ["Maintain independent copies of important business records", "Export local Business Lifeline data regularly", "Check calculations and generated guidance", "Report defects without including unnecessary confidential information", "Seek qualified advice when professional judgement is required"] },
      { heading: "Feedback", paragraphs: ["Feedback may be used to improve the product. Do not include trade secrets, personal information or confidential third-party material in feedback unless necessary and authorised."] },
      { heading: "Support", paragraphs: [`Early Access support is available through ${BUSINESS.supportEmail}. Response times are not guaranteed, but urgent access, billing and privacy matters will be prioritised.`] },
    ],
  },
  "acceptable-use": {
    title: "Acceptable Use Policy",
    summary: "Activities that are prohibited to protect businesses, the platform and the public.",
    sections: [
      { heading: "You must not", bullets: ["Break the law or encourage unlawful conduct", "Falsify accounting, tax, employment, legal or business records", "Conceal assets, proceeds, debts or regulatory breaches", "Upload malware or attempt unauthorised access", "Probe or bypass security controls or usage limits", "Use stolen, confidential or personal information without authority", "Automate excessive requests or consume resources abusively", "Misrepresent Business Lifeline output as certified professional advice"] },
      { heading: "Enforcement", paragraphs: ["We may restrict or suspend access where reasonably necessary to investigate misuse, protect the service, prevent harm or comply with law."] },
      { heading: "Reporting concerns", paragraphs: [`Report suspected abuse or security concerns to ${BUSINESS.supportEmail}. Do not publicly disclose sensitive exploit details before we have had a reasonable opportunity to investigate.`] },
    ],
  },
  security: {
    title: "Security and Trust",
    summary: "The controls, limitations and responsibilities that currently apply to Business Lifeline.",
    sections: [
      { heading: "Current controls", bullets: ["Server-side protection of AI credentials", "Explicit AI consent enforcement", "Reduced AI payloads", "Same-origin checks and request-size limits", "Rate limiting for early-stage abuse protection", "No-store API responses", "Security headers including CSP and HSTS", "Local export and deletion controls"] },
      { heading: "Local-first storage", paragraphs: ["Most current records remain in the user's browser. This reduces central collection but means the user is responsible for device security, browser access and backups. Local browser storage is not a substitute for an encrypted accounting or document-management system."] },
      { heading: "Not yet designed for", bullets: ["Banking credentials or passwords", "Identity documents and tax file numbers", "Payment-card storage", "Employee medical records", "Large confidential document repositories", "Highly regulated or classified information"] },
      { heading: "Reporting a vulnerability", paragraphs: [`Send a clear description to ${BUSINESS.supportEmail}. Do not access other users' data, disrupt the service or retain unnecessary information while testing.`] },
      { heading: "No absolute guarantee", paragraphs: ["No internet service can truthfully promise perfect security. We use proportionate controls, minimise information and continue improving the product as it moves toward full commercial release."] },
    ],
  },
  support: {
    title: "Support and Complaints",
    summary: "How to obtain product, billing, refund, privacy and security assistance.",
    sections: [
      { heading: "Contact", paragraphs: [`Email ${BUSINESS.supportEmail} for product support, billing questions, refund requests, privacy enquiries, complaints and responsible security reports.`] },
      { heading: "Include", bullets: ["The email used for the service or purchase", "Device and browser", "What you were trying to do", "What happened and when", "A screenshot with confidential information removed"] },
      { heading: "Do not include", bullets: ["Passwords or verification codes", "Full payment-card information", "Banking credentials", "Tax file numbers", "Customer or employee personal information", "Full confidential contracts or legal files"] },
      { heading: "Complaints", paragraphs: ["We will acknowledge and investigate complaints reasonably and in good faith. Privacy complaints should clearly state the information or practice in question and the requested outcome."] },
      { heading: "Business identity", paragraphs: [`${BUSINESS.product} is operated by ${BUSINESS.businessName}, ${BUSINESS.structure}, ABN ${BUSINESS.abn}, located in ${BUSINESS.location}.`] },
    ],
  },
};

export const LEGAL_LINKS = [
  ["privacy", "Privacy"], ["terms", "Terms"], ["ai", "AI Notice"], ["refunds", "Refunds"],
  ["early-access", "Early Access"], ["acceptable-use", "Acceptable Use"], ["security", "Security"], ["support", "Support"],
] as const;
