import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decryptSecret, encryptSecret } from "@/lib/accounting-token-vault";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const destination = new URL("/", appUrl());
  destination.searchParams.set("accounting", "xero");

  try {
    if (error) throw new Error("Xero authorisation was cancelled or denied.");
    if (!code || !state) throw new Error("Xero returned an incomplete authorisation response.");

    const cookieStore = await cookies();
    const cookie = cookieStore.get("bl_xero_oauth")?.value;
    if (!cookie) throw new Error("The Xero connection session expired. Start again.");
    const session = decryptSecret<{ state: string; uid: string; createdAt: number }>(cookie);
    if (session.state !== state || Date.now() - session.createdAt > 10 * 60 * 1000) {
      throw new Error("The Xero connection could not be verified.");
    }

    const clientId = process.env.XERO_CLIENT_ID || "";
    const clientSecret = process.env.XERO_CLIENT_SECRET || "";
    const redirectUri = process.env.XERO_REDIRECT_URI || "";
    const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      signal: AbortSignal.timeout(20_000),
    });
    const tokens = await tokenResponse.json() as Record<string, unknown>;
    if (!tokenResponse.ok || typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string") {
      throw new Error("Xero token exchange failed.");
    }

    const connectionsResponse = await fetch("https://api.xero.com/connections", {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    const connections = await connectionsResponse.json() as Array<{ tenantId?: string; tenantName?: string; tenantType?: string }>;
    if (!connectionsResponse.ok || !connections.length || !connections[0]?.tenantId) {
      throw new Error("No Xero organisation was available for this connection.");
    }
    const tenant = connections[0];

    const { db } = getFirebaseAdmin();
    await db.collection("accountingConnections").doc(`${session.uid}_xero`).set({
      uid: session.uid,
      provider: "xero",
      tenantId: tenant.tenantId,
      organisationName: tenant.tenantName || "Xero organisation",
      tenantType: tenant.tenantType || null,
      encryptedTokens: encryptSecret(tokens),
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "connected",
    }, { merge: true });

    cookieStore.delete("bl_xero_oauth");
    destination.searchParams.set("status", "connected");
  } catch (caught) {
    destination.searchParams.set("status", "error");
    destination.searchParams.set("message", caught instanceof Error ? caught.message : "Xero connection failed.");
  }

  return NextResponse.redirect(destination);
}
