"use client";

import { useEffect } from "react";

const BRIDGE_KEY = "business-lifeline-run-operating-core-v2";
const SOURCES = ["business-lifeline-operating-platform-v1", "business-lifeline-live-control-v1", "business-lifeline-native-finance-v1", "business-lifeline-advanced-accounting-v1"] as const;

type BridgeEnvelope = { __businessLifelineCommercialBridge?: true; legacy?: unknown; commercial?: Record<string, string | null> };

export function CommercialCloudBridge() {
  useEffect(() => {
    const restore = () => {
      try {
        const raw = localStorage.getItem(BRIDGE_KEY);
        if (!raw) return;
        const envelope = JSON.parse(raw) as BridgeEnvelope;
        if (!envelope.__businessLifelineCommercialBridge || !envelope.commercial) return;
        SOURCES.forEach((key) => {
          const value = envelope.commercial?.[key];
          if (typeof value === "string" && !localStorage.getItem(key)) localStorage.setItem(key, value);
        });
      } catch {}
    };
    const pack = () => {
      try {
        const existingRaw = localStorage.getItem(BRIDGE_KEY);
        let legacy: unknown = null;
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw) as BridgeEnvelope;
          legacy = parsed.__businessLifelineCommercialBridge ? parsed.legacy : parsed;
        }
        const commercial = Object.fromEntries(SOURCES.map((key) => [key, localStorage.getItem(key)]));
        localStorage.setItem(BRIDGE_KEY, JSON.stringify({ __businessLifelineCommercialBridge: true, legacy, commercial }));
      } catch {}
    };
    restore();
    pack();
    const timer = window.setInterval(pack, 2500);
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === BRIDGE_KEY) restore(); };
    window.addEventListener("storage", onStorage);
    return () => { window.clearInterval(timer); window.removeEventListener("storage", onStorage); };
  }, []);
  return null;
}
