import { NextResponse } from "next/server";
import { firebaseAdminConfigured, requireFirebaseUser } from "@/lib/firebase-admin";
import { isStudioOwner, registeredTier, studioOwnerUid } from "@/lib/pilot-access-server";
import { privateResponseHeaders } from "@/lib/api-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!studioOwnerUid() || !firebaseAdminConfigured()) return NextResponse.json({ error: "Pilot accounts are not activated yet. The studio operator must finish Firebase server and owner-account setup." }, { status: 503, headers: privateResponseHeaders() });
  try {
    const user = await requireFirebaseUser(request);
    return NextResponse.json({
      tier: await registeredTier(user.uid),
      isStudioOwner: isStudioOwner(user.uid),
      emailVerified: user.email_verified === true,
    }, { headers: privateResponseHeaders() });
  } catch {
    return NextResponse.json({ error: "An authenticated account is required." }, { status: 401, headers: privateResponseHeaders() });
  }
}
