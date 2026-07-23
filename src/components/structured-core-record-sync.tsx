"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "@/lib/firebase-client";

const ACTIVE_KEY = "business-lifeline-active-business-v1";
const OPS_KEY = "business-lifeline-operating-platform-v1";
const META_KEY = "business-lifeline-record-sync-meta-v1";
const TYPES = ["customers", "products", "sales", "quotes"] as const;
type RecordType = (typeof TYPES)[number];
type GenericRecord = { id: string; [key: string]: unknown };
type OperatingStore = Record<RecordType, GenericRecord[]> & Record<string, unknown>;
type MetaItem = { hash: string; touchedAt: number };
type Meta = Record<string, MetaItem>;
type CloudRecord = { type: RecordType; recordId: string; payload: GenericRecord; updatedAt?: Timestamp; updatedBy: string; updatedByEmail: string };
type Conflict = { key: string; type: RecordType; recordId: string; local: GenericRecord; cloud: GenericRecord; cloudUpdatedAt: number };

const hash = (value: unknown) => JSON.stringify(value);
const recordKey = (type: RecordType, id: string) => `${type}:${id}`;
const readStore = (): OperatingStore | null => {
  try {
    const raw = localStorage.getItem(OPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...parsed,
      customers: Array.isArray(parsed.customers) ? parsed.customers as GenericRecord[] : [],
      products: Array.isArray(parsed.products) ? parsed.products as GenericRecord[] : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales as GenericRecord[] : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes as GenericRecord[] : [],
    } as OperatingStore;
  } catch {
    return null;
  }
};
const readMeta = (): Meta => {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; }
};
const writeStore = (store: OperatingStore) => {
  localStorage.setItem(OPS_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("business-lifeline-operating-updated"));
  window.dispatchEvent(new StorageEvent("storage", { key: OPS_KEY, newValue: JSON.stringify(store) }));
};

export function StructuredCoreRecordSync() {
  const [user, setUser] = useState<User | null>(null);
  const [activeBusinessId, setActiveBusinessId] = useState("");
  const [status, setStatus] = useState("Waiting for a signed-in business");
  const [synced, setSynced] = useState(0);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [open, setOpen] = useState(false);
  const applyingRemote = useRef(false);
  const remoteSeen = useRef<Record<string, number>>({});

  useEffect(() => firebaseAuth ? onAuthStateChanged(firebaseAuth, setUser) : undefined, []);
  useEffect(() => {
    const read = () => setActiveBusinessId(localStorage.getItem(ACTIVE_KEY) || "");
    read();
    window.addEventListener("business-lifeline-business-switched", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("business-lifeline-business-switched", read); window.removeEventListener("storage", read); };
  }, []);

  useEffect(() => {
    if (!firebaseDb || !user || !activeBusinessId) return;
    setStatus("Listening for shared record changes");
    return onSnapshot(collection(firebaseDb, "businesses", activeBusinessId, "records"), (snapshot) => {
      const store = readStore();
      if (!store) return;
      const meta = readMeta();
      let changed = false;
      const nextConflicts: Conflict[] = [];
      snapshot.docs.forEach((item) => {
        const data = item.data() as CloudRecord;
        if (!TYPES.includes(data.type) || !data.payload?.id) return;
        const key = recordKey(data.type, data.recordId);
        const cloudTime = data.updatedAt?.toMillis?.() || 0;
        if (remoteSeen.current[key] === cloudTime) return;
        remoteSeen.current[key] = cloudTime;
        const list = store[data.type];
        const index = list.findIndex((record) => record.id === data.recordId);
        const local = index >= 0 ? list[index] : undefined;
        const localMeta = meta[key];
        if (local && hash(local) !== hash(data.payload) && localMeta?.touchedAt && localMeta.touchedAt > cloudTime) {
          nextConflicts.push({ key, type: data.type, recordId: data.recordId, local, cloud: data.payload, cloudUpdatedAt: cloudTime });
          return;
        }
        if (!local || hash(local) !== hash(data.payload)) {
          applyingRemote.current = true;
          store[data.type] = index >= 0 ? list.map((record, i) => i === index ? data.payload : record) : [data.payload, ...list];
          meta[key] = { hash: hash(data.payload), touchedAt: cloudTime || Date.now() };
          changed = true;
        }
      });
      if (changed) {
        writeStore(store);
        localStorage.setItem(META_KEY, JSON.stringify(meta));
        setTimeout(() => { applyingRemote.current = false; }, 150);
      }
      if (nextConflicts.length) setConflicts((current) => [...current.filter((item) => !nextConflicts.some((next) => next.key === item.key)), ...nextConflicts]);
      setSynced(snapshot.size);
      setStatus("Core records are live across devices");
    }, (error) => setStatus(error.message));
  }, [user, activeBusinessId]);

  useEffect(() => {
    if (!firebaseDb || !user || !activeBusinessId) return;
    const push = async () => {
      if (applyingRemote.current) return;
      const store = readStore();
      if (!store) return;
      const meta = readMeta();
      let uploaded = 0;
      for (const type of TYPES) {
        for (const record of store[type]) {
          if (!record?.id) continue;
          const key = recordKey(type, record.id);
          const valueHash = hash(record);
          if (meta[key]?.hash === valueHash) continue;
          const touchedAt = Date.now();
          meta[key] = { hash: valueHash, touchedAt };
          await setDoc(doc(firebaseDb, "businesses", activeBusinessId, "records", `${type}_${record.id}`), {
            type,
            recordId: record.id,
            payload: record,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            updatedByEmail: user.email || "",
          }, { merge: true });
          uploaded++;
        }
      }
      localStorage.setItem(META_KEY, JSON.stringify(meta));
      if (uploaded) setStatus(`${uploaded} changed record${uploaded === 1 ? "" : "s"} synced`);
    };
    push();
    const timer = window.setInterval(push, 3500);
    return () => window.clearInterval(timer);
  }, [user, activeBusinessId]);

  const resolve = async (conflict: Conflict, choice: "local" | "cloud") => {
    if (!firebaseDb || !user || !activeBusinessId) return;
    const store = readStore();
    if (!store) return;
    const meta = readMeta();
    if (choice === "cloud") {
      store[conflict.type] = store[conflict.type].map((record) => record.id === conflict.recordId ? conflict.cloud : record);
      meta[conflict.key] = { hash: hash(conflict.cloud), touchedAt: conflict.cloudUpdatedAt || Date.now() };
      writeStore(store);
    } else {
      meta[conflict.key] = { hash: hash(conflict.local), touchedAt: Date.now() };
      await setDoc(doc(firebaseDb, "businesses", activeBusinessId, "records", `${conflict.type}_${conflict.recordId}`), {
        type: conflict.type,
        recordId: conflict.recordId,
        payload: conflict.local,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedByEmail: user.email || "",
      }, { merge: true });
    }
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    setConflicts((current) => current.filter((item) => item.key !== conflict.key));
  };

  const label = useMemo(() => conflicts.length ? `${conflicts.length} sync conflict${conflicts.length === 1 ? "" : "s"}` : status, [conflicts, status]);
  if (!user || !activeBusinessId) return null;
  return <>
    <button className={conflicts.length ? "record-sync-launcher warning" : "record-sync-launcher"} onClick={() => setOpen(true)}><span>Live records</span><strong>{label}</strong></button>
    {open && <div className="record-sync-backdrop" role="dialog" aria-modal="true" aria-label="Live record sync"><section className="record-sync-panel"><header><div><small>STRUCTURED CLOUD RECORDS</small><h2>CRM, products, sales and quotes</h2><p>Core records are stored individually so one small change no longer replaces an entire business module.</p></div><button onClick={() => setOpen(false)} aria-label="Close">×</button></header><div className="record-sync-kpis"><article><small>Cloud records</small><strong>{synced}</strong></article><article><small>Conflicts</small><strong>{conflicts.length}</strong></article><article><small>Status</small><strong>{status}</strong></article></div>{conflicts.length ? <section><h3>Resolve changes</h3><p>Both this device and the cloud changed the same record. Choose which version to keep.</p>{conflicts.map((conflict) => <article className="record-conflict" key={conflict.key}><div><strong>{conflict.type} · {String(conflict.local.name || conflict.local.customerName || conflict.recordId)}</strong><span>Device and cloud versions differ</span></div><div><button onClick={() => resolve(conflict, "local")}>Keep this device</button><button onClick={() => resolve(conflict, "cloud")}>Use cloud version</button></div></article>)}</section> : <section className="record-sync-ok"><strong>No unresolved changes</strong><p>Customer, product, sale and quote records are syncing individually.</p></section>}<footer>Whole-module backup remains active as a safety net while structured records become the primary commercial data layer.</footer></section></div>}
  </>;
}
