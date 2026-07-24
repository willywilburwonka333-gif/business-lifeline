import { NextResponse } from "next/server";
import { privateResponseHeaders } from "@/lib/api-security";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    quickbooks: {
      configured: Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET && process.env.QUICKBOOKS_REDIRECT_URI),
    },
    xero: {
      configured: Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET && process.env.XERO_REDIRECT_URI),
    },
    secureTokenVault: Boolean(process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY),
  }, { headers: privateResponseHeaders() });
}
