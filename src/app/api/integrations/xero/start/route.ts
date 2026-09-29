import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSecret, randomState } from "@/lib/accounting-token-vault";
import { requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const crossSite = rejectCrossSiteRequest(request);
    if (crossSite) return crossSite;
    const user = await requireFirebaseUser(request);
    const clientId = process.env.XERO_CLIENT_ID;
    const redirectUri = process.env.XERO_REDIRECT_URI;
    if (!clientId || !redirectUri || !process.env.XERO_CLIENT_SECRET || !process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY) {
      return NextResponse.json({ error: "Xero connection is not configured." }, { status: 503, headers: privateResponseHeaders() });
    }

    const state = randomState();
    const cookieStore = await cookies();
    cookieStore.set("bl_xero_oauth", encryptSecret({ state, uid: user.uid, createdAt: Date.now() }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    const url = new URL("https://login.xero.com/identity/connect/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", process.env.XERO_SCOPES || "openid profile email offline_access accounting.settings accounting.reports.read");
    url.searchParams.set("state", state);

    return NextResponse.json({ url: url.toString() }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start Xero connection." }, { status: 401, headers: privateResponseHeaders() });
  }
}
