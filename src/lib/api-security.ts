import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${scope}:${forwarded || realIp || "unknown"}`;
}

function normalizedOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).origin;
  } catch {
    return null;
  }
}

export function rejectCrossSiteRequest(request: Request): NextResponse | null {
  const origin = normalizedOrigin(request.headers.get("origin"));
  if (!origin) return null;

  const requestOrigin = normalizedOrigin(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const forwardedOrigin = forwardedHost ? normalizedOrigin(`${forwardedProto}://${forwardedHost}`) : null;
  const configuredOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ].map(normalizedOrigin).filter((value): value is string => Boolean(value));

  const allowed = new Set([requestOrigin, forwardedOrigin, ...configuredOrigins].filter((value): value is string => Boolean(value)));
  if (!allowed.has(origin)) {
    return NextResponse.json(
      { error: "Cross-site requests are not allowed." },
      { status: 403, headers: privateResponseHeaders() },
    );
  }
  return null;
}

export function enforceRateLimit(request: Request, scope: string): NextResponse | null {
  const now = Date.now();
  const key = clientKey(request, scope);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (current.count >= MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: { ...privateResponseHeaders(), "Retry-After": String(retryAfter) },
      },
    );
  }

  current.count += 1;
  buckets.set(key, current);
  return null;
}

export function hasExplicitAiConsent(request: Request, payload: unknown) {
  const headerConsent = request.headers.get("x-business-lifeline-ai-consent") === "true";
  const bodyConsent =
    typeof payload === "object" && payload !== null &&
    "consent" in payload && (payload as { consent?: unknown }).consent === true;
  return headerConsent && bodyConsent;
}

export function privateResponseHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    "X-Robots-Tag": "noindex, nofollow",
  };
}
