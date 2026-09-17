import { createHmac, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const COOKIE_NAME = "stammbaum_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage
const SESSION_VALUE = "valid";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ist auf dem Server nicht konfiguriert.");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSessionCookie(): string {
  const token = `${SESSION_VALUE}.${sign(SESSION_VALUE)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

// ponytail: a single shared password has no per-user identity to check, so
// the "session" is just a fixed value signed with a server-only secret —
// anyone who once entered the correct password gets the same cookie value
// until SESSION_SECRET is rotated. That's the right amount of complexity
// for a private, single-shared-password family site; it would need real
// per-user sessions (and a users table) if that ever changes.
export function hasValidSession(req: VercelRequest): boolean {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return false;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;
  const value = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (value !== SESSION_VALUE) return false;

  let expectedBuffer: Buffer;
  let actualBuffer: Buffer;
  try {
    expectedBuffer = Buffer.from(sign(value), "hex");
    actualBuffer = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function requireSession(req: VercelRequest, res: VercelResponse): boolean {
  if (hasValidSession(req)) return true;
  res.status(401).json({ error: "Nicht angemeldet." });
  return false;
}
