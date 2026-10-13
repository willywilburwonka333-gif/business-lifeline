import { NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/firebase-admin";
import { isStudioOwner, registeredTier, studioOwnerUid } from "@/lib/pilot-access-server";
import { privateResponseHeaders } from "@/lib/api-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!studioOwnerUid()) return NextResponse.json({ error: "Pilot operator identity not configured." }, { status: 503, headers: privateResponseHeaders() });
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
