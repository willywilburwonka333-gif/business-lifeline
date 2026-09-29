import { NextResponse } from "next/server";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function DELETE(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;

  try {
    const user = await requireFirebaseUser(request);
    const { auth, db, storage } = getFirebaseAdmin();

    const memberships = await db.collection("users").doc(user.uid).collection("businessMemberships").get();

    for (const membership of memberships.docs) {
      const data = membership.data() as { businessId?: string; role?: string };
      const businessId = data.businessId || membership.id;
      if (!businessId) continue;

      const businessRef = db.collection("businesses").doc(businessId);
      if (data.role === "owner") {
        const members = await businessRef.collection("members").where("status", "==", "active").limit(2).get();
        const otherMembers = members.docs.filter((member) => member.id !== user.uid);
        if (otherMembers.length > 0) {
          return NextResponse.json(
            { error: "Transfer ownership or remove other active members before deleting this account." },
            { status: 409, headers: privateResponseHeaders() },
          );
        }
        await db.recursiveDelete(businessRef);
      } else {
        await businessRef.collection("members").doc(user.uid).delete().catch(() => undefined);
      }
      await membership.ref.delete().catch(() => undefined);
    }

    await db.collection("userWorkspaces").doc(user.uid).delete().catch(() => undefined);
    await db.collection("users").doc(user.uid).delete().catch(() => undefined);

    const connectionDocs = await db.collection("accountingConnections").where("uid", "==", user.uid).get().catch(() => null);
    if (connectionDocs) await Promise.all(connectionDocs.docs.map((doc) => doc.ref.delete().catch(() => undefined)));
    await db.collection("accountingConnections").doc(`${user.uid}_quickbooks`).delete().catch(() => undefined);
    await db.collection("accountingConnections").doc(`${user.uid}_xero`).delete().catch(() => undefined);

    if (storage) {
      await storage.bucket().deleteFiles({ prefix: `userVault/${user.uid}/` }).catch(() => undefined);
    }

    await auth.deleteUser(user.uid);

    return NextResponse.json({ deleted: true }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Account deletion failed." },
      { status: 500, headers: privateResponseHeaders() },
    );
  }
}
