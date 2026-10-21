import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { enforceRateLimit, privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";
import { requireStudioOwner, studioOwnerUid } from "@/lib/pilot-access-server";

export const runtime = "nodejs";

async function ownerOrDeny(request: Request) {
  if (!studioOwnerUid()) throw new Error("Owner account has not been configured.");
  const user = await requireFirebaseUser(request);
  requireStudioOwner(user.uid);
  return user;
}

export async function GET(request: Request) {
  try {
    await ownerOrDeny(request);
    const { auth, db } = getFirebaseAdmin();
    const users = await auth.listUsers(1000);
    const others = users.users.filter((user) => user.uid !== studioOwnerUid());
    const documents = others.length ? await db.getAll(...others.map((user) => db.collection("pilotAccess").doc(user.uid))) : [];
    const accounts = others.map((user, index) => ({
      uid: user.uid,
      email: user.email || "(no email)",
      verified: user.emailVerified,
      createdAt: user.metadata.creationTime,
      tier: documents[index]?.data()?.tier === "full" ? "full" : documents[index]?.data()?.tier === "pilot" ? "pilot" : "public",
    }));
    return NextResponse.json({ accounts, truncated: Boolean(users.pageToken) }, { headers: privateResponseHeaders() });
  } catch {
    return NextResponse.json({ error: "Not authorised to manage pilot accounts." }, { status: 403, headers: privateResponseHeaders() });
  }
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;
  const limited = enforceRateLimit(request, "pilot-permissions");
  if (limited) return limited;
  try {
    const actor = await ownerOrDeny(request);
    const body = await request.json() as { uid?: unknown; tier?: unknown };
    if (typeof body.uid !== "string" || !body.uid || body.uid === studioOwnerUid() || !["full", "pilot", "public"].includes(String(body.tier))) {
      return NextResponse.json({ error: "Invalid account or access level." }, { status: 400, headers: privateResponseHeaders() });
    }
    const { auth, db } = getFirebaseAdmin();
    const target = await auth.getUser(body.uid);
    if (body.tier === "full" && !target.emailVerified) {
      return NextResponse.json({ error: "Verify the customer's email address before granting full access." }, { status: 400, headers: privateResponseHeaders() });
    }
    const ref = db.collection("pilotAccess").doc(body.uid);
    await ref.set({ tier: body.tier, updatedBy: actor.uid, updatedAt: new Date().toISOString() }, { merge: true });
    await db.collection("pilotAudit").add({
      actorUid: actor.uid, targetUid: body.uid, newTier: body.tier, at: new Date().toISOString(),
    });
    return NextResponse.json({ uid: body.uid, tier: body.tier }, { headers: privateResponseHeaders() });
  } catch {
    return NextResponse.json({ error: "Not authorised to change access, or account not found." }, { status: 403, headers: privateResponseHeaders() });
  }
}
