import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function adminConfig() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function firebaseAdminConfigured() {
  return Boolean(adminConfig());
}

export function getFirebaseAdmin() {
  const config = adminConfig();
  if (!config) throw new Error("Firebase Admin is not configured.");
  const storageBucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const app = getApps()[0] || initializeApp({ credential: cert(config), projectId: config.projectId, storageBucket });
  return { auth: getAuth(app), db: getFirestore(app), storage: storageBucket ? getStorage(app) : null };
}

export async function requireFirebaseUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Authentication required.");
  const { auth } = getFirebaseAdmin();
  return auth.verifyIdToken(token, true);
}
