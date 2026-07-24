export type AccountingProviderId = "quickbooks" | "xero" | "myob" | "sage" | "csv";

export type AccountingProvider = {
  id: AccountingProviderId;
  name: string;
  description: string;
  connection: "oauth" | "import";
  status: "foundation" | "planned" | "available";
  dataScopes: string[];
};

export const accountingProviders: AccountingProvider[] = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    description: "Connect a QuickBooks Online company through Intuit OAuth 2.0. Business Lifeline never receives the user's QuickBooks password.",
    connection: "oauth",
    status: "foundation",
    dataScopes: ["Company profile", "Profit and loss", "Balance sheet", "Invoices and bills", "Customers and suppliers", "Payments", "Accounts", "Items", "Bank transactions"],
  },
  {
    id: "xero",
    name: "Xero",
    description: "Connect one or more Xero organisations through OAuth 2.0 and import only the approved accounting information.",
    connection: "oauth",
    status: "foundation",
    dataScopes: ["Organisation", "Profit and loss", "Balance sheet", "Aged receivables", "Aged payables", "Invoices and bills", "Payments", "Accounts", "Items", "Bank transactions"],
  },
  {
    id: "myob",
    name: "MYOB",
    description: "Direct connection is planned after the QuickBooks and Xero connector pattern is production-tested.",
    connection: "oauth",
    status: "planned",
    dataScopes: ["Accounts", "Sales", "Purchases", "Contacts", "Banking", "Reports"],
  },
  {
    id: "sage",
    name: "Sage Accounting",
    description: "Direct connection is planned after the first two accounting integrations are validated.",
    connection: "oauth",
    status: "planned",
    dataScopes: ["Accounts", "Sales", "Purchases", "Contacts", "Banking", "Reports"],
  },
  {
    id: "csv",
    name: "Accounting export",
    description: "Import recognised CSV, XLSX and PDF accounting exports when a direct provider connection is unavailable.",
    connection: "import",
    status: "available",
    dataScopes: ["Profit and loss", "Balance sheet", "Aged receivables", "Aged payables", "General ledger", "Invoices", "Bills", "Bank transactions"],
  },
];

export type NormalisedAccountingSnapshot = {
  provider: AccountingProviderId;
  organisationName: string;
  importedAt: string;
  periodStart?: string;
  periodEnd?: string;
  revenue?: number;
  expenses?: number;
  cash?: number;
  accountsReceivable?: number;
  accountsPayable?: number;
  overdueReceivables?: number;
  overduePayables?: number;
  taxPayable?: number;
  totalDebt?: number;
  sourceRecords: number;
  warnings: string[];
};
