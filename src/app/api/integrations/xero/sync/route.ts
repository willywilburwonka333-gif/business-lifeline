import { NextResponse } from "next/server";
import { decryptSecret, encryptSecret } from "@/lib/accounting-token-vault";
import { getFirebaseAdmin, requireFirebaseUser } from "@/lib/firebase-admin";
import { privateResponseHeaders, rejectCrossSiteRequest } from "@/lib/api-security";
import { combineXeroFacts, type XeroReport } from "@/lib/xero-normalizer";

export const runtime = "nodejs";
export const maxDuration = 30;

type Tokens = { access_token: string; refresh_token: string; expires_in?: number };

async function refresh(tokens: Tokens) {
  const response = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.XERO_CLIENT_ID || ""}:${process.env.XERO_CLIENT_SECRET || ""}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token }),
    signal: AbortSignal.timeout(20_000),
  });
  const value = await response.json() as Tokens;
  if (!response.ok || !value.access_token || !value.refresh_token) throw new Error("Xero token refresh failed.");
  return value;
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSiteRequest(request);
  if (crossSite) return crossSite;

  try {
    const user = await requireFirebaseUser(request);
    const { db } = getFirebaseAdmin();
    const ref = db.collection("accountingConnections").doc(`${user.uid}_xero`);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Xero is not connected." }, { status: 404, headers: privateResponseHeaders() });

    const data = snapshot.data() || {};
    let tokens = decryptSecret<Tokens>(String(data.encryptedTokens || ""));
    tokens = await refresh(tokens);
    const tenantId = String(data.tenantId || "");
    if (!tenantId) throw new Error("Xero tenant is missing from the stored connection.");

    const headers = {
      Authorization: `Bearer ${tokens.access_token}`,
      "xero-tenant-id": tenantId,
      Accept: "application/json",
    };

    const organisationResponse = await fetch("https://api.xero.com/api.xro/2.0/Organisation", { headers, signal: AbortSignal.timeout(20_000) });
    const organisationPayload = await organisationResponse.json() as { Organisations?: Array<{ Name?: string; LegalName?: string; CountryCode?: string; BaseCurrency?: string }> };
    if (!organisationResponse.ok) throw new Error("Xero organisation information could not be read.");

    const now = new Date();
    const firstThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEndDate = new Date(firstThisMonth.getTime() - 86_400_000);
    const periodStartDate = new Date(Date.UTC(periodEndDate.getUTCFullYear(), periodEndDate.getUTCMonth(), 1));
    const isoDate = (value: Date) => value.toISOString().slice(0, 10);

    const readReport = async (name: string, params?: Record<string, string>): Promise<XeroReport> => {
      const reportUrl = new URL(`https://api.xero.com/api.xro/2.0/Reports/${name}`);
      for (const [key, value] of Object.entries(params || {})) reportUrl.searchParams.set(key, value);
      const response = await fetch(reportUrl, { headers, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`Xero ${name} report could not be read. Confirm the connected user has report access and the configured Xero scopes permit this report.`);
      return response.json() as Promise<XeroReport>;
    };

    const [profitAndLoss, balanceSheet] = await Promise.all([
      readReport("ProfitAndLoss", { fromDate: isoDate(periodStartDate), toDate: isoDate(periodEndDate) }),
      readReport("BalanceSheet"),
    ]);
    const financials = combineXeroFacts(profitAndLoss, balanceSheet);
    const organisation = organisationPayload.Organisations?.[0];
    const organisationName = organisation?.Name || organisation?.LegalName || data.organisationName || "Xero organisation";
    const lastSyncedAt = new Date().toISOString();
    const financialSnapshot = {
      ...financials,
      periodStart: isoDate(periodStartDate),
      periodEnd: isoDate(periodEndDate),
    };

    await ref.set({
      encryptedTokens: encryptSecret(tokens),
      organisationName,
      country: organisation?.CountryCode || null,
      baseCurrency: organisation?.BaseCurrency || null,
      financialSnapshot,
      lastSyncedAt,
      updatedAt: lastSyncedAt,
      status: "connected",
    }, { merge: true });

    return NextResponse.json({ connected: true, organisationName, financialSnapshot, lastSyncedAt }, { headers: privateResponseHeaders() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Xero sync failed." }, { status: 502, headers: privateResponseHeaders() });
  }
}
