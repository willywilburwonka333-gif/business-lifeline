"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "@/lib/firebase-client";

const ACTIVE_KEY = "business-lifeline-active-business-v1";
const OPS_KEY = "business-lifeline-operating-platform-v1";
const META_KEY = "business-lifeline-record-sync-meta-v1";
const RECORD_TYPES = ["customers", "products", "sales", "quotes"] as const;

type RecordType = (typeof RECORD_TYPES)[number];
type BusinessRecord = { id: string; name?: string; customerName?: string; [key: string]: unknown };
type Store = {
  customers: BusinessRecord[];
  products: BusinessRecord[];
  sales: BusinessRecord[];
  quotes: BusinessRecord[];
  [key: string]: unknown;
};
type SyncMeta = Record<string, string>;
type CloudRecord = {
  type?: string;
  recordId?: string;
  payload?: BusinessRecord;
};

function isRecordType(value: string | undefined): value is RecordType {
  return value !== undefined && (RECORD_TYPES as readonly string[]).includes(value);
}

function readStore(): Store | null {
  try {
    const raw = localStorage.getItem(OPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...parsed,
      customers: Array.isArray(parsed.customers) ? (parsed.customers as BusinessRecord[]) : [],
      products: Array.isArray(parsed.products) ? (parsed.products as BusinessRecord[]) : [],
      sales: Array.isArray(parsed.sales) ? (parsed.sales as BusinessRecord[]) : [],
      quotes: Array.isArray(parsed.quotes) ? (parsed.quotes as BusinessRecord[]) : [],
    };
  } catch {
    return null;
  }
}

function saveStore(store: Store) {
  localStorage.setItem(OPS_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("business-lifeline-operating-updated"));
}

function readMeta(): SyncMeta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}") as SyncMeta;
  } catch {
    return {};
  }
}

function recordLabel(record: BusinessRecord): string {
  if (typeof record.name === "string" && record.name.trim()) return record.name;
  if (typeof record.customerName === "string" && record.customerName.trim()) return record.customerName;
  return record.id;
}

export function StructuredCoreRecordSync() {
  const [user, setUser] = useState<User | null>(null);
  const [businessId, setBusinessId] = useState("");
  const [status, setStatus] = useState("Waiting for a signed-in business");
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [latestRecords, setLatestRecords] = useState<BusinessRecord[]>([]);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, setUser);
  }, []);

  useEffect(() => {
    const refresh = () => setBusinessId(localStorage.getItem(ACTIVE_KEY) || "");
    refresh();
    window.addEventListener("business-lifeline-business-switched", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("business-lifeline-business-switched", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const db = firebaseDb;
    if (!db || !user || !businessId) return;
    const activeBusinessId = businessId;

    return onSnapshot(
      collection(db, "businesses", activeBusinessId, "records"),
      (snapshot) => {
        const store = readStore();
        if (!store) return;

        const changed: BusinessRecord[] = [];
        snapshot.docs.forEach((snapshotDoc) => {
          const data = snapshotDoc.data() as CloudRecord;
          if (!isRecordType(data.type) || !data.recordId || !data.payload) return;

          const records = store[data.type];
          const index = records.findIndex((record) => record.id === data.recordId);
          if (index >= 0) records[index] = data.payload;
          else records.unshift(data.payload);
          changed.push(data.payload);
        });

        if (changed.length) saveStore(store);
        setLatestRecords(changed.slice(0, 5));
        setCount(snapshot.size);
        setStatus("Core records are live across devices");
      },
      (error) => setStatus(error.message),
    );
  }, [businessId, user]);

  useEffect(() => {
    const db = firebaseDb;
    if (!db || !user || !businessId) return;
    const activeBusinessId = businessId;
    const currentUser = user;

    const push = async () => {
      const store = readStore();
      if (!store) return;
      const meta = readMeta();
      let uploaded = 0;

      try {
        for (const type of RECORD_TYPES) {
          for (const record of store[type]) {
            if (!record.id) continue;
            const key = `${type}:${record.id}`;
            const serialised = JSON.stringify(record);
            if (meta[key] === serialised) continue;

            await setDoc(
              doc(db, "businesses", activeBusinessId, "records", `${type}_${record.id}`),
              {
                type,
                recordId: record.id,
                payload: record,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid,
                updatedByEmail: currentUser.email || "",
              },
              { merge: true },
            );

            meta[key] = serialised;
            uploaded += 1;
          }
        }

        localStorage.setItem(META_KEY, JSON.stringify(meta));
        if (uploaded > 0) {
          setStatus(`${uploaded} changed record${uploaded === 1 ? "" : "s"} synced`);
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Record sync failed");
      }
    };

    void push();
    const timer = window.setInterval(() => void push(), 4000);
    return () => window.clearInterval(timer);
  }, [businessId, user]);

  const label = useMemo(() => `${count} cloud record${count === 1 ? "" : "s"}`, [count]);

  if (!user || !businessId) return null;

  return (
    <>
      <button className="record-sync-launcher" onClick={() => setOpen(true)}>
        <span>Live records</span>
        <strong>{label}</strong>
      </button>

      {open && (
        <div className="record-sync-backdrop" role="dialog" aria-modal="true" aria-label="Live record sync">
          <section className="record-sync-panel">
            <header>
              <div>
                <small>STRUCTURED CLOUD RECORDS</small>
                <h2>Customers, products, sales and quotes</h2>
                <p>Core records now sync independently between signed-in devices.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close">×</button>
            </header>

            <div className="record-sync-kpis">
              <article><small>Cloud records</small><strong>{count}</strong></article>
              <article><small>Status</small><strong>{status}</strong></article>
              <article><small>Business</small><strong>Connected</strong></article>
            </div>

            <section className="record-sync-ok">
              <strong>Latest cloud updates</strong>
              {latestRecords.length ? (
                latestRecords.map((record) => <p key={record.id}>{recordLabel(record)}</p>)
              ) : (
                <p>No cloud record updates yet.</p>
              )}
            </section>

            <footer>Whole-module backup remains active while structured records become the primary data layer.</footer>
          </section>
        </div>
      )}
    </>
  );
}
