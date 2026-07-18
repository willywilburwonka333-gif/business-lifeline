"use client";

import { useLayoutEffect } from "react";
import { readSavedReport, REPORT_STORAGE_KEY } from "@/lib/saved-report";

export function SavedReportGuard() {
  useLayoutEffect(() => {
    const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);

    if (!raw) {
      document.body.classList.remove("workspace-ready");
      return;
    }

    const saved = readSavedReport();
    document.body.classList.toggle("workspace-ready", Boolean(saved));
  }, []);

  return null;
}
