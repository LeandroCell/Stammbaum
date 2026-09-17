import { describe, it, expect, beforeEach } from "vitest";
import { createSessionCookie, clearSessionCookie, hasValidSession, requireSession } from "./auth";
import { fakeRequest as fakeReq, fakeResponse } from "./testHelpers";

function fakeRequest(cookieHeader?: string) {
  return fakeReq({ headers: { cookie: cookieHeader } });
}

function extractCookieValue(setCookieHeader: string): string {
  return setCookieHeader.split(";")[0];
}

describe("auth", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret";
  });

  it("accepts a request carrying a cookie created by createSessionCookie", () => {
    const cookieHeader = extractCookieValue(createSessionCookie());
    expect(hasValidSession(fakeRequest(cookieHeader))).toBe(true);
  });

  it("rejects a request with no cookie", () => {
    expect(hasValidSession(fakeRequest(undefined))).toBe(false);
  });

  it("rejects a cookie signed with a different secret", () => {
    const cookieHeader = extractCookieValue(createSessionCookie());
    process.env.SESSION_SECRET = "a-different-secret";
    expect(hasValidSession(fakeRequest(cookieHeader))).toBe(false);
  });

  it("rejects a tampered cookie value", () => {
    const cookieHeader = extractCookieValue(createSessionCookie()).replace("valid", "admin");
    expect(hasValidSession(fakeRequest(cookieHeader))).toBe(false);
  });

  it("rejects the cookie once cleared", () => {
    const cookieHeader = extractCookieValue(clearSessionCookie());
    expect(hasValidSession(fakeRequest(cookieHeader))).toBe(false);
  });

  it("requireSession lets a valid session through without touching the response", () => {
    const cookieHeader = extractCookieValue(createSessionCookie());
    const res = fakeResponse();
    expect(requireSession(fakeRequest(cookieHeader), res)).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("requireSession responds 401 for an invalid session", () => {
    const res = fakeResponse();
    expect(requireSession(fakeRequest(undefined), res)).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toMatchObject({ error: expect.any(String) });
  });
});
