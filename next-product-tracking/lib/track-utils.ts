import { NextRequest } from "next/server";

const BOT_UA_PATTERN = /bot/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent || typeof userAgent !== "string") return false;
  return BOT_UA_PATTERN.test(userAgent);
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function getCountry(request: NextRequest): string {
  const country = request.headers.get("x-vercel-ip-country");
  if (country && country.trim()) return country.trim();
  return "unknown";
}

export function getUserAgent(request: NextRequest): string {
  const ua = request.headers.get("user-agent");
  return ua ?? "unknown";
}
