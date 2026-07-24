import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders } from "@/lib/api-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection("accountingConnections").doc(`${user.uid}_quickbooks`).get();
    if (!snapshot.exists) return NextResponse.json({ connected: false }, { headers: privateResponseHeaders() });
    const data = snapshot.data() || {};
    return NextResponse.json({
      connected: data.status === "connected",
      organisationName: data.organisationName || null,
      lastSyncedAt: data.lastSyncedAt || null,
      connectedAt: data.connectedAt || null,
      sourceRecords: data.sourceRecords || 0,
    }, { headers: privateResponseHeaders() });
  } catch {
    return NextResponse.json({ connected: false, authenticated: false }, { status: 401, headers: privateResponseHeaders() });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const { db } = getFirebaseAdmin();
    await db.collection("accountingConnections").doc(`${user.uid}_quickbooks`).delete();
    return NextResponse.json({ disconnected: true }, { headers: privateResponseHeaders() });
  } catch {
    return NextResponse.json({ error: "Unable to disconnect QuickBooks." }, { status: 401, headers: privateResponseHeaders() });
  }
}
