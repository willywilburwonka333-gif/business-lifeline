"use client";

import { ChangeEvent, useState } from "react";
import { AccountingConnections } from "@/components/accounting-connections";
import { LIFELINE_BOOKS_KEY, readBooksStore, type BooksStore, type LedgerJournal, type SalesDocument, type SupplierBill } from "@/lib/lifeline-books-engine";

type ImportKind = "journals" | "invoices" | "bills";
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const id = (prefix: string) => prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

function csvRows(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ""));
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function saveBooks(store: BooksStore) {
  localStorage.setItem(LIFELINE_BOOKS_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync", { detail: { changed: true } }));
}

export function LifelineMove() {
  const [kind, setKind] = useState<ImportKind>("journals");
  const [message, setMessage] = useState("");
  const [showConnectors, setShowConnectors] = useState(false);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const store = readBooksStore();
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text) as Partial<BooksStore> | Array<Record<string, unknown>>;
        if (!Array.isArray(parsed) && (parsed.journals || parsed.docs || parsed.bills)) {
          const next: BooksStore = {
            ...store,
            journals: [...(Array.isArray(parsed.journals) ? parsed.journals : []), ...store.journals],
            docs: [...(Array.isArray(parsed.docs) ? parsed.docs : []), ...store.docs],
            bills: [...(Array.isArray(parsed.bills) ? parsed.bills : []), ...store.bills],
          };
          saveBooks(next);
          setMessage("Lifeline Books data imported from JSON. Review the Trial Balance and integrity checks before relying on it.");
          return;
        }
      }

      const rows = csvRows(text);
      if (kind === "journals") {
        const journals: LedgerJournal[] = rows.map((row) => {
          const amount = round(Number(String(row.amount || "0").replace(/[$,]/g, "")));
          return {
            id: id("move-journal"),
            date: String(row.date || new Date().toISOString().slice(0, 10)),
            memo: String(row.memo || row.description || "Imported journal"),
            source: "MOVE:" + String(row.source || id("source")),
            lines: [
              { account: String(row.debitaccount || row.debit || "Operating Expense"), side: "debit" as const, amount },
              { account: String(row.creditaccount || row.credit || "Bank"), side: "credit" as const, amount },
            ],
          };
        }).filter((journal) => journal.lines[0].amount > 0);
        saveBooks({ ...store, journals: [...journals, ...store.journals] });
        setMessage(journals.length + " balanced journal rows imported.");
      }

      if (kind === "invoices") {
        const docs: SalesDocument[] = rows.map((row) => {
          const total = round(Number(String(row.total || row.amount || "0").replace(/[$,]/g, "")));
          const gst = round(Number(String(row.gst || "0").replace(/[$,]/g, "")));
          return {
            id: id("move-invoice"),
            number: String(row.number || row.invoice || id("INV")),
            kind: "invoice",
            customer: String(row.customer || row.name || "Imported customer"),
            date: String(row.date || new Date().toISOString().slice(0, 10)),
            due: String(row.due || row.duedate || ""),
            status: (["draft","sent","part-paid","paid","void"].includes(String(row.status)) ? String(row.status) : "sent") as SalesDocument["status"],
            items: [{ description: String(row.description || "Imported invoice"), qty: 1, rate: total, gst: gst > 0 ? "gst" : "free" }],
            payments: round(Number(String(row.paid || row.payments || "0").replace(/[$,]/g, ""))),
            notes: "Imported through Lifeline Move",
          };
        }).filter((doc) => doc.items[0].rate > 0);
        saveBooks({ ...store, docs: [...docs, ...store.docs] });
        setMessage(docs.length + " invoice records imported. Post opening/control journals if the migration starts mid-period.");
      }

      if (kind === "bills") {
        const bills: SupplierBill[] = rows.map((row) => ({
          id: id("move-bill"),
          number: String(row.number || row.bill || id("BILL")),
          supplier: String(row.supplier || row.name || "Imported supplier"),
          date: String(row.date || new Date().toISOString().slice(0, 10)),
          due: String(row.due || row.duedate || ""),
          amount: round(Number(String(row.total || row.amount || "0").replace(/[$,]/g, ""))),
          gst: round(Number(String(row.gst || "0").replace(/[$,]/g, ""))),
          status: (["draft","approved","part-paid","paid"].includes(String(row.status)) ? String(row.status) : "approved") as SupplierBill["status"],
          paid: round(Number(String(row.paid || "0").replace(/[$,]/g, ""))),
        })).filter((bill) => bill.amount > 0);
        saveBooks({ ...store, bills: [...bills, ...store.bills] });
        setMessage(bills.length + " supplier bills imported.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The migration file could not be read.");
    } finally {
      event.target.value = "";
    }
  };

  return <section className="lifeline-product">
    <header className="lifeline-product-hero"><div><p className="eyebrow">LIFELINE MOVE</p><h2>Move into Business Lifeline without staying dependent on the old system.</h2><p>Import accounting records directly from CSV/JSON. Existing QuickBooks/Xero connections are retained only as optional migration bridges, not as a requirement to run the business.</p></div></header>
    {message && <div className="os-notice"><span>{message}</span><button onClick={() => setMessage("")}>Dismiss</button></div>}

    <div className="lifeline-report-grid">
      <section className="panel fields"><p className="eyebrow">DIRECT MIGRATION</p><h3>Import records without an API</h3>
        <label className="field"><span>What are you importing?</span><select value={kind} onChange={(event) => setKind(event.target.value as ImportKind)}><option value="journals">Balanced journals</option><option value="invoices">Customer invoices</option><option value="bills">Supplier bills</option></select></label>
        <input type="file" accept=".csv,.json,text/csv,application/json" onChange={importFile} />
        {kind === "journals" && <small>CSV columns: date, memo, debitAccount, creditAccount, amount, source.</small>}
        {kind === "invoices" && <small>CSV columns: number, customer, date, due, total, gst, paid, status, description.</small>}
        {kind === "bills" && <small>CSV columns: number, supplier, date, due, total, gst, paid, status.</small>}
      </section>
      <section className="panel"><p className="eyebrow">MIGRATION RULE</p><h3>Import, reconcile, then own the record here</h3><ol><li>Export the old system.</li><li>Import into Lifeline Move.</li><li>Review Trial Balance, aged debtors/creditors and GST.</li><li>Enter/confirm opening balances.</li><li>Lock the migration date.</li><li>Continue bookkeeping in Lifeline Books.</li></ol></section>
    </div>

    <section className="panel">
      <div className="section-heading"><span>OPTIONAL BRIDGE</span><h3>Connect an old accounting system only when migration is easier that way</h3></div>
      <p>These connectors are no longer part of the Business Lifeline operating architecture. They are optional ways to bring historical data across.</p>
      <button type="button" className="button ghost" onClick={() => setShowConnectors((value) => !value)}>{showConnectors ? "Hide migration connectors" : "Show QuickBooks / Xero migration connectors"}</button>
      {showConnectors && <AccountingConnections />}
    </section>
  </section>;
}
