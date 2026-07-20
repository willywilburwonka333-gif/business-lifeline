"use client";

import { useEffect, useState } from "react";
import { AdvancedAccountingHub } from "@/components/advanced-accounting-hub";
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
  return <div className="native-finance-connected"><OperatingLedgerStatus /><AdvancedAccountingHub key={revision} /></div>;
}
