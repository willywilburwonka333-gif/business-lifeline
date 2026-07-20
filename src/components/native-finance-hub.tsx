"use client";

import { AdvancedAccountingHub } from "@/components/advanced-accounting-hub";
import { OperatingLedgerStatus } from "@/components/operating-ledger-status";

export function NativeFinanceHub() {
  return <div className="native-finance-connected"><OperatingLedgerStatus /><AdvancedAccountingHub /></div>;
}
