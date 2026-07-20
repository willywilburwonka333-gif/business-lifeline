export type QuoteStatus = "draft" | "sent" | "accepted" | "invoiced" | "paid";
export type JobStatus = "planned" | "active" | "complete";
export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid";

export type ConnectedJob = {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  value: number;
  status: JobStatus;
  createdAt: string;
};

export type ConnectedInvoice = {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt: string;
};

export type FollowUpTask = {
  id: string;
  title: string;
  detail: string;
  dueAt: string;
  priority: "normal" | "urgent";
};

export type StocktakeLine = {
  productId: string;
  productName: string;
  expected: number;
  counted: number;
  costPrice: number;
};

export type StocktakeResult = StocktakeLine & {
  variance: number;
  varianceValue: number;
};

export type ReorderProduct = {
  id: string;
  name: string;
  quantity: number;
  reorderAt: number;
  targetLevel: number;
  supplier: string;
  costPrice: number;
};

export type ReorderDraft = {
  productId: string;
  productName: string;
  supplier: string;
  quantity: number;
  estimatedCost: number;
};

export type DaySale = { total: number; payment: string };
export type DayExpense = { amount: number };

export function nextQuoteStatus(status: QuoteStatus): QuoteStatus {
  const sequence: QuoteStatus[] = ["draft", "sent", "accepted", "invoiced", "paid"];
  return sequence[Math.min(sequence.indexOf(status) + 1, sequence.length - 1)];
}

export function convertAcceptedQuote(input: {
  quoteId: string;
  customerId: string;
  customerName: string;
  description: string;
  amount: number;
  now: string;
}): { job: ConnectedJob; invoice: ConnectedInvoice } {
  const issued = new Date(input.now);
  const due = new Date(issued.getTime() + 14 * 86_400_000);
  return {
    job: {
      id: `job-${input.quoteId}`,
      customerId: input.customerId,
      customerName: input.customerName,
      title: input.description || `Work for ${input.customerName}`,
      value: input.amount,
      status: "planned",
      createdAt: input.now,
    },
    invoice: {
      id: `invoice-${input.quoteId}`,
      customerId: input.customerId,
      customerName: input.customerName,
      amount: input.amount,
      status: "draft",
      issuedAt: input.now,
      dueAt: due.toISOString(),
      paidAt: "",
    },
  };
}

export function invoiceFollowUp(invoice: ConnectedInvoice, now: string): FollowUpTask | null {
  if (invoice.status === "paid") return null;
  const due = new Date(invoice.dueAt).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(due) || current <= due) return null;
  return {
    id: `follow-up-${invoice.id}`,
    title: `Follow up ${invoice.customerName}`,
    detail: `Invoice ${invoice.id} is overdue for ${invoice.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}.`,
    dueAt: now,
    priority: "urgent",
  };
}

export function calculateStocktake(lines: StocktakeLine[]): StocktakeResult[] {
  return lines.map((line) => ({
    ...line,
    variance: line.counted - line.expected,
    varianceValue: (line.counted - line.expected) * line.costPrice,
  }));
}

export function createReorderDrafts(products: ReorderProduct[]): ReorderDraft[] {
  return products
    .filter((product) => product.quantity <= product.reorderAt)
    .map((product) => {
      const quantity = Math.max(0, product.targetLevel - product.quantity);
      return {
        productId: product.id,
        productName: product.name,
        supplier: product.supplier || "Supplier not assigned",
        quantity,
        estimatedCost: quantity * product.costPrice,
      };
    })
    .filter((draft) => draft.quantity > 0);
}

export function endOfDaySummary(input: {
  sales: DaySale[];
  expenses: DayExpense[];
  openingCash: number;
  closingCash: number;
}) {
  const salesTotal = input.sales.reduce((sum, sale) => sum + sale.total, 0);
  const cashSales = input.sales.filter((sale) => sale.payment.toLowerCase() === "cash").reduce((sum, sale) => sum + sale.total, 0);
  const expensesTotal = input.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expectedClosingCash = input.openingCash + cashSales - expensesTotal;
  return {
    salesTotal,
    cashSales,
    expensesTotal,
    expectedClosingCash,
    cashVariance: input.closingCash - expectedClosingCash,
    netTakings: salesTotal - expensesTotal,
  };
}
