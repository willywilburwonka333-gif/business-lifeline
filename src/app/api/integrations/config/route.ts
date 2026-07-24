import { NextResponse } from "next/server";
import { privateResponseHeaders } from "@/lib/api-security";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  const tokenVault = Boolean(process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY);
  const firebaseAdmin = firebaseAdminConfigured();
  return NextResponse.json({
    quickbooks: {
      configured: Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET && process.env.QUICKBOOKS_REDIRECT_URI),
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || null,
    },
    xero: {
      configured: Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET && process.env.XERO_REDIRECT_URI),
    },
    secureTokenVault: tokenVault,
    firebaseAdmin,
    liveConnectionsReady: tokenVault && firebaseAdmin,
  }, { headers: privateResponseHeaders() });
}
