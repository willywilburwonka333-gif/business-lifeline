"use client";

import { useEffect, useState } from "react";
import { CommercialFinanceControls } from "@/components/commercial-finance-controls";
import { LifelineBooks } from "@/components/lifeline-books";
import { LifelineMove } from "@/components/lifeline-move";
import { LifelinePeople } from "@/components/lifeline-people";
import { LifelineTax } from "@/components/lifeline-tax";
import { OperatingLedgerStatus } from "@/components/operating-ledger-status";
import { lifelineSuite, type LifelineSuiteId } from "@/lib/lifeline-suite";

type FinanceView = "books" | "bank" | "pay" | "tax" | "people" | "move";

export function NativeFinanceHub({ country }: { country?: string }) {
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<FinanceView>("books");

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ changed?: boolean }>).detail;
      if (detail?.changed) setRevision((value) => value + 1);
    };
    window.addEventListener("business-lifeline-ledger-sync", refresh);
    return () => window.removeEventListener("business-lifeline-ledger-sync", refresh);
  }, []);

  const cards = (["books", "bank", "pay", "tax", "people", "move"] as FinanceView[]).map((id) => lifelineSuite.find((item) => item.id === id as LifelineSuiteId)!);

  return <section className="native-finance-connected workspace-section-stack">
    <header className="panel lifeline-suite-hero">
      <p className="eyebrow">BUSINESS LIFELINE NATIVE SUITE</p>
      <h2>Your books and business systems live here now.</h2>
      <p>Lifeline Books is the accounting source of truth. Bank, Pay, Tax and People post into it directly. Other accounting software is optional migration infrastructure under Lifeline Move.</p>
    </header>

    <nav className="lifeline-suite-nav" aria-label="Business Lifeline native finance products">
      {cards.map((item) => <button type="button" key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id as FinanceView)}><strong>{item.name}</strong><small>{item.purpose}</small></button>)}
    </nav>

    <OperatingLedgerStatus />

    {view === "books" && <LifelineBooks key={revision} country={country} />}
    {view === "bank" && <CommercialFinanceControls key="bank" initialTab="banking" />}
    {view === "pay" && <CommercialFinanceControls key="pay" initialTab="recurring" />}
    {view === "tax" && <LifelineTax />}
    {view === "people" && <LifelinePeople />}
    {view === "move" && <LifelineMove />}
  </section>;
}
