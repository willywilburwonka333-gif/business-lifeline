"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LIFELINE_BOOKS_KEY,
  readBooksStore,
  type BooksStore,
  type LedgerJournal,
} from "@/lib/lifeline-books-engine";

export const LIFELINE_ASSETS_KEY = "business-lifeline-assets-v1";

type Asset = {
  id: string;
  name: string;
  purchaseDate: string;
  cost: number;
  gstIncluded: boolean;
  residualValue: number;
  method: "straight-line" | "diminishing";
  usefulLifeYears: number;
  diminishingRatePercent: number;
  assetAccount: string;
  accumulatedDepreciation: number;
  acquisitionPosted: boolean;
  status: "active" | "disposed";
  disposalDate?: string;
  disposalProceeds?: number;
};

type AssetStore = { assets: Asset[] };
const empty: AssetStore = { assets: [] };
const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const money = (value: number) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const id = (prefix: string) => prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

function readAssets(): AssetStore {
  try {
    const raw = localStorage.getItem(LIFELINE_ASSETS_KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<AssetStore>) } : empty;
  } catch { return empty; }
}

function postJournal(journal: LedgerJournal) {
  const books = readBooksStore();
  if (books.journals.some((item) => item.source === journal.source)) return false;
  const debit = round(journal.lines.filter((line) => line.side === "debit").reduce((sum, line) => sum + line.amount, 0));
  const credit = round(journal.lines.filter((line) => line.side === "credit").reduce((sum, line) => sum + line.amount, 0));
  if (debit !== credit || debit <= 0 || (books.lockDate && journal.date <= books.lockDate)) return false;
  const next: BooksStore = { ...books, journals: [journal, ...books.journals] };
  localStorage.setItem(LIFELINE_BOOKS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("business-lifeline-ledger-sync", { detail: { changed: true } }));
  return true;
}

function depreciationForMonth(asset: Asset) {
  const carrying = Math.max(asset.residualValue, asset.cost - asset.accumulatedDepreciation);
  if (asset.method === "straight-line") {
    return round(Math.max(0, asset.cost - asset.residualValue) / Math.max(1, asset.usefulLifeYears * 12));
  }
  return round(Math.max(0, carrying - asset.residualValue) * (asset.diminishingRatePercent / 100) / 12);
}

export function LifelineAssets() {
  const [store, setStore] = useState<AssetStore>(empty);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [asset, setAsset] = useState({
    name: "", purchaseDate: today(), cost: 0, gstIncluded: true, residualValue: 0,
    method: "straight-line" as Asset["method"], usefulLifeYears: 5, diminishingRatePercent: 20,
    assetAccount: "Plant & Equipment",
  });

  useEffect(() => { setStore(readAssets()); setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(LIFELINE_ASSETS_KEY, JSON.stringify(store)); }, [store, ready]);

  const activeAssets = store.assets.filter((item) => item.status === "active");
  const totals = useMemo(() => {
    const cost = activeAssets.reduce((sum, item) => sum + item.cost, 0);
    const depreciation = activeAssets.reduce((sum, item) => sum + item.accumulatedDepreciation, 0);
    return { cost, depreciation, carrying: round(cost - depreciation) };
  }, [store.assets]);

  const addAsset = (event: FormEvent) => {
    event.preventDefault();
    if (!asset.name.trim() || asset.cost <= 0) return;
    const next: Asset = {
      id: id("asset"), ...asset, name: asset.name.trim(), accumulatedDepreciation: 0,
      acquisitionPosted: false, status: "active",
    };
    setStore((current) => ({ ...current, assets: [next, ...current.assets] }));
    setAsset({ name: "", purchaseDate: today(), cost: 0, gstIncluded: true, residualValue: 0, method: "straight-line", usefulLifeYears: 5, diminishingRatePercent: 20, assetAccount: "Plant & Equipment" });
  };

  const postAcquisition = (item: Asset, paidFrom: "Bank" | "Accounts Payable" = "Bank") => {
    const gst = item.gstIncluded ? round(item.cost / 11) : 0;
    const base = round(item.cost - gst);
    const journal: LedgerJournal = {
      id: id("journal"), date: item.purchaseDate, memo: "Asset acquisition · " + item.name, source: "ASSET:ACQUIRE:" + item.id,
      lines: [
        { account: item.assetAccount, side: "debit", amount: base },
        ...(gst > 0 ? [{ account: "GST Input Credit", side: "debit" as const, amount: gst }] : []),
        { account: paidFrom, side: "credit", amount: item.cost },
      ],
    };
    if (!postJournal(journal)) { setMessage("Asset acquisition could not be posted. Check the period lock or existing journal."); return; }
    setStore((current) => ({ ...current, assets: current.assets.map((assetItem) => assetItem.id === item.id ? { ...assetItem, acquisitionPosted: true } : assetItem) }));
    setMessage("Asset acquisition posted to Lifeline Books.");
  };

  const postDepreciation = (item: Asset) => {
    const amount = Math.min(depreciationForMonth(item), Math.max(0, item.cost - item.residualValue - item.accumulatedDepreciation));
    if (amount <= 0) { setMessage("No further depreciation remains under the current settings."); return; }
    const journal: LedgerJournal = {
      id: id("journal"), date: today(), memo: "Monthly depreciation · " + item.name, source: "ASSET:DEPR:" + item.id + ":" + (item.accumulatedDepreciation + amount),
      lines: [{ account: "Depreciation", side: "debit", amount }, { account: "Accumulated Depreciation", side: "credit", amount }],
    };
    if (!postJournal(journal)) { setMessage("Depreciation could not be posted."); return; }
    setStore((current) => ({ ...current, assets: current.assets.map((assetItem) => assetItem.id === item.id ? { ...assetItem, accumulatedDepreciation: round(assetItem.accumulatedDepreciation + amount) } : assetItem) }));
    setMessage("One month depreciation posted.");
  };

  const dispose = (item: Asset) => {
    const input = prompt("Sale/disposal proceeds", "0");
    if (input === null) return;
    const proceeds = round(Number(input) || 0);
    const baseCost = item.gstIncluded ? round(item.cost - item.cost / 11) : item.cost;
    const accumulated = round(item.accumulatedDepreciation);
    const carrying = round(Math.max(0, baseCost - accumulated));
    const gainLoss = round(proceeds - carrying);
    const lines: LedgerJournal["lines"] = [];
    if (proceeds > 0) lines.push({ account: "Bank", side: "debit", amount: proceeds });
    if (accumulated > 0) lines.push({ account: "Accumulated Depreciation", side: "debit", amount: accumulated });
    if (gainLoss < 0) lines.push({ account: "Loss on Asset Disposal", side: "debit", amount: Math.abs(gainLoss) });
    lines.push({ account: item.assetAccount, side: "credit", amount: baseCost });
    if (gainLoss > 0) lines.push({ account: "Gain on Asset Disposal", side: "credit", amount: gainLoss });
    const journal: LedgerJournal = { id: id("journal"), date: today(), memo: "Asset disposal · " + item.name, source: "ASSET:DISPOSE:" + item.id, lines };
    if (!postJournal(journal)) { setMessage("Disposal journal could not be posted. Review the carrying value and period lock."); return; }
    setStore((current) => ({ ...current, assets: current.assets.map((assetItem) => assetItem.id === item.id ? { ...assetItem, status: "disposed", disposalDate: today(), disposalProceeds: proceeds } : assetItem) }));
    setMessage("Asset disposal posted to Lifeline Books.");
  };

  return <section className="lifeline-product">
    <header className="lifeline-product-hero"><div><p className="eyebrow">LIFELINE ASSETS</p><h2>Fixed assets and depreciation inside the same ledger.</h2><p>Register assets, post acquisitions, calculate depreciation and record disposals without maintaining a separate fixed-asset system.</p></div><div className="lifeline-integrity good"><strong>{money(totals.carrying)}</strong><span>Active carrying value</span></div></header>
    {message && <div className="os-notice"><span>{message}</span><button onClick={() => setMessage("")}>Dismiss</button></div>}

    <section className="metric-grid">
      <article><span>Active assets</span><strong>{activeAssets.length}</strong></article>
      <article><span>Recorded cost</span><strong>{money(totals.cost)}</strong></article>
      <article><span>Accumulated depreciation</span><strong>{money(totals.depreciation)}</strong></article>
      <article><span>Carrying value</span><strong>{money(totals.carrying)}</strong></article>
    </section>

    <div className="lifeline-report-grid">
      <form className="panel fields" onSubmit={addAsset}><p className="eyebrow">ASSET REGISTER</p><h3>Add fixed asset</h3>
        <label className="field"><span>Name</span><input value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} required /></label>
        <label className="field"><span>Purchase date</span><input type="date" value={asset.purchaseDate} onChange={(e) => setAsset({ ...asset, purchaseDate: e.target.value })} /></label>
        <label className="field"><span>Purchase cost</span><input type="number" min="0" step="0.01" value={asset.cost || ""} onChange={(e) => setAsset({ ...asset, cost: Number(e.target.value) || 0 })} /></label>
        <label><input type="checkbox" checked={asset.gstIncluded} onChange={(e) => setAsset({ ...asset, gstIncluded: e.target.checked })} /> GST included in cost</label>
        <label className="field"><span>Residual value</span><input type="number" min="0" step="0.01" value={asset.residualValue || ""} onChange={(e) => setAsset({ ...asset, residualValue: Number(e.target.value) || 0 })} /></label>
        <label className="field"><span>Asset account</span><input value={asset.assetAccount} onChange={(e) => setAsset({ ...asset, assetAccount: e.target.value })} /></label>
        <label className="field"><span>Depreciation method</span><select value={asset.method} onChange={(e) => setAsset({ ...asset, method: e.target.value as Asset["method"] })}><option value="straight-line">Straight-line</option><option value="diminishing">Diminishing value</option></select></label>
        {asset.method === "straight-line" ? <label className="field"><span>Useful life (years)</span><input type="number" min="1" step="1" value={asset.usefulLifeYears} onChange={(e) => setAsset({ ...asset, usefulLifeYears: Number(e.target.value) || 1 })} /></label> : <label className="field"><span>Diminishing rate % / year</span><input type="number" min="0" max="100" step="0.1" value={asset.diminishingRatePercent} onChange={(e) => setAsset({ ...asset, diminishingRatePercent: Number(e.target.value) || 0 })} /></label>}
        <button className="button primary">Add asset</button>
      </form>

      <section className="panel"><p className="eyebrow">FIXED ASSETS</p><h3>Accounting register</h3><div className="item-list">
        {store.assets.map((item) => {
          const monthly = depreciationForMonth(item);
          const carrying = Math.max(0, item.cost - item.accumulatedDepreciation);
          return <article key={item.id}><div><strong>{item.name}</strong><span>{item.status} · purchased {item.purchaseDate} · {item.method}</span><small>Cost {money(item.cost)} · accumulated depreciation {money(item.accumulatedDepreciation)} · carrying {money(carrying)} · next month {money(monthly)}</small></div><div>{item.status === "active" && !item.acquisitionPosted && <><button type="button" onClick={() => postAcquisition(item, "Bank")}>Post paid acquisition</button><button type="button" onClick={() => postAcquisition(item, "Accounts Payable")}>Post supplier-financed acquisition</button></>}{item.status === "active" && item.acquisitionPosted && <button type="button" onClick={() => postDepreciation(item)}>Post month depreciation</button>}{item.status === "active" && item.acquisitionPosted && <button type="button" onClick={() => dispose(item)}>Dispose asset</button>}</div></article>;
        })}
      </div></section>
    </div>

    <aside className="urgent"><b>Depreciation boundary</b><p>Lifeline Assets records the accounting schedule. Tax depreciation, pooling, instant write-offs and asset-tax treatment vary by circumstances and should be confirmed with the applicable adviser/rules before tax lodgement.</p></aside>
  </section>;
}
