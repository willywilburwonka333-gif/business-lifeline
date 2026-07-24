import { NextResponse } from "next/server";
import { decryptSecret, encryptSecret } from "@/lib/accounting-token-vault";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders } from "@/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type Tokens = { access_token: string; refresh_token: string; expires_in?: number; x_refresh_token_expires_in?: number };

async function refresh(tokens: Tokens) {
  const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID || ""}:${process.env.QUICKBOOKS_CLIENT_SECRET || ""}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token }),
    signal: AbortSignal.timeout(20_000),
  });
  const value = await response.json() as Tokens;
  if (!response.ok || !value.access_token || !value.refresh_token) throw new Error("QuickBooks token refresh failed.");
  return value;
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const { db } = getFirebaseAdmin();
    const ref = db.collection("accountingConnections").doc(`${user.uid}_quickbooks`);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: "QuickBooks is not connected." }, { status: 404, headers: privateResponseHeaders() });
    const data = snapshot.data() || {};
    let tokens = decryptSecret<Tokens>(String(data.encryptedTokens || ""));
    tokens = await refresh(tokens);
    const realmId = String(data.realmId || "");
    const base = `https://quickbooks.api.intuit.com/v3/company/${encodeURIComponent(realmId)}`;

    const companyResponse = await fetch(`${base}/companyinfo/${encodeURIComponent(realmId)}?minorversion=75`, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    const companyPayload = await companyResponse.json() as { CompanyInfo?: { CompanyName?: string; LegalName?: string; Country?: string } };
    if (!companyResponse.ok) throw new Error("QuickBooks company information could not be read.");

    const query = encodeURIComponent("select count(*) from Invoice");
    const countResponse = await fetch(`${base}/query?query=${query}&minorversion=75`, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    const countPayload = await countResponse.json() as { QueryResponse?: { totalCount?: number } };
    const organisationName = companyPayload.CompanyInfo?.CompanyName || companyPayload.CompanyInfo?.LegalName || "QuickBooks company";
    const sourceRecords = Number(countPayload.QueryResponse?.totalCount || 0);
    const lastSyncedAt = new Date().toISOString();

    await ref.set({
      encryptedTokens: encryptSecret(tokens),
      organisationName,
      country: companyPayload.CompanyInfo?.Country || null,
      sourceRecords,
      lastSyncedAt,
      updatedAt: lastSyncedAt,
      status: "connected",
    }, { merge: true });

    return NextResponse.json({ connected: true, organisationName, sourceRecords, lastSyncedAt }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "QuickBooks sync failed." }, { status: 502, headers: privateResponseHeaders() });
  }
}
