"use client";

import { useLayoutEffect } from "react";
import { readSavedReport, REPORT_STORAGE_KEY } from "@/lib/saved-report";

export function SavedReportGuard() {
  useLayoutEffect(() => {
    const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
    if (raw) readSavedReport();
  }, []);

  return null;
}
