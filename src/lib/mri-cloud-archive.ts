import { addDoc, collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "./firebase-client";
import type { SavedReport } from "./saved-report";

export type ArchivedMri = {
  id: string;
  createdAt: string;
  businessId: string;
  createdBy: string;
  businessName: string;
  saved: SavedReport;
};

export const clientBusinessId = (uid: string) => `business-${uid}`;

export function isArchivedMri(value: unknown): value is ArchivedMri {
  if (!value || typeof value !== "object") return false;
  const x = value as Partial<ArchivedMri>;
  return typeof x.id === "string" && typeof x.createdAt === "string" &&
    typeof x.businessId === "string" && typeof x.createdBy === "string" &&
    typeof x.businessName === "string" &&
    !!x.saved && typeof x.saved.data?.businessName === "string" &&
    typeof x.saved.report?.metrics?.overallScore === "number";
}

export async function archiveMriForSignedInOwner(saved: SavedReport): Promise<"saved" | "local"> {
  const owner = firebaseAuth?.currentUser;
  if (!owner || !firebaseDb) return "local";
  const businessId = clientBusinessId(owner.uid);
  const id = crypto.randomUUID();
  const entry: ArchivedMri = {
    id,
    businessId,
    createdBy: owner.uid,
    createdAt: new Date().toISOString(),
    businessName: saved.data.businessName,
    saved,
  };
  // One immutable historical snapshot per completed MRI. We do not overwrite
  // previous reports when the owner runs another diagnosis.
  await addDoc(collection(firebaseDb, "businesses", businessId, "mriReports"), JSON.parse(JSON.stringify(entry)));
  return "saved";
}

export async function listMriReportsForOwner(businessId?: string): Promise<ArchivedMri[]> {
  const owner = firebaseAuth?.currentUser;
  if (!owner || !firebaseDb) return [];
  // A caller cannot bypass membership by specifying another businessId;
  // deployed Firestore rules authorise every list against its business.
  const ref = collection(firebaseDb, "businesses", businessId || clientBusinessId(owner.uid), "mriReports");
  const page = await getDocs(query(ref, orderBy("createdAt", "desc"), limit(100)));
  return page.docs.map(x => x.data()).filter(isArchivedMri);
}
