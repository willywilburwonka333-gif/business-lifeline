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
  const realmId = url.searchParams.get("realmId");
  const error = url.searchParams.get("error");
  const destination = new URL("/", appUrl());
  destination.searchParams.set("accounting", "quickbooks");

  try {
    if (error) throw new Error("QuickBooks authorisation was cancelled or denied.");
    if (!code || !state || !realmId) throw new Error("QuickBooks returned an incomplete authorisation response.");
    const cookieStore = await cookies();
    const cookie = cookieStore.get("bl_qbo_oauth")?.value;
    if (!cookie) throw new Error("The QuickBooks connection session expired. Start again.");
    const session = decryptSecret<{ state: string; uid: string; createdAt: number }>(cookie);
    if (session.state !== state || Date.now() - session.createdAt > 10 * 60 * 1000) throw new Error("The QuickBooks connection could not be verified.");

    const clientId = process.env.QUICKBOOKS_CLIENT_ID || "";
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || "";
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || "";
    const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
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
      throw new Error("QuickBooks token exchange failed.");
    }

    const { db } = getFirebaseAdmin();
    await db.collection("accountingConnections").doc(`${session.uid}_quickbooks`).set({
      uid: session.uid,
      provider: "quickbooks",
      realmId,
      encryptedTokens: encryptSecret(tokens),
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "connected",
    }, { merge: true });

    cookieStore.delete("bl_qbo_oauth");
    destination.searchParams.set("status", "connected");
  } catch (caught) {
    destination.searchParams.set("status", "error");
    destination.searchParams.set("message", caught instanceof Error ? caught.message : "QuickBooks connection failed.");
  }

  return NextResponse.redirect(destination);
}
