import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") || "unknown";
}

export async function requireApiUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { response: NextResponse.json({ error: "Authentication is not configured." }, { status: 503 }) };
  }

  const supabase = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user: data.user };
}

export function enforceRateLimit(req: NextRequest, userId: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const key = `${userId}:${clientIp(req)}:${req.nextUrl.pathname}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  current.count += 1;
  return null;
}

export async function authorizeApi(req: NextRequest, limit = 20) {
  const auth = await requireApiUser(req);
  if ("response" in auth) return auth.response;
  return enforceRateLimit(req, auth.user.id, limit);
}
