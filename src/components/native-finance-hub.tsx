"use client";

import { useEffect, useState } from "react";
import { AccountingConnections } from "@/components/accounting-connections";
import { AdvancedAccountingHub } from "@/components/advanced-accounting-hub";
import { CommercialFinanceControls } from "@/components/commercial-finance-controls";
import { OperatingLedgerStatus } from "@/components/operating-ledger-status";

export function NativeFinanceHub() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ changed?: boolean }>).detail;
      if (detail?.changed) setRevision((value) => value + 1);
    };
    window.addEventListener("business-lifeline-ledger-sync", refresh);
    return () => window.removeEventListener("business-lifeline-ledger-sync", refresh);
  }, []);
  return <div className="native-finance-connected workspace-section-stack">
    <AccountingConnections />
    <OperatingLedgerStatus />
    <CommercialFinanceControls />
    <AdvancedAccountingHub key={revision} />
  </div>;
}
