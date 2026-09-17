import { describe, it, expect, beforeEach } from "vitest";
import handler from "./login";
import { hasValidSession } from "./_lib/auth";
import { fakeRequest, fakeResponse } from "./_lib/testHelpers";

describe("POST /api/login", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret";
    process.env.SITE_PASSWORD = "geheim123";
  });

  it("rejects non-POST requests", () => {
    const res = fakeResponse();
    handler(fakeRequest({ method: "GET" }), res);
    expect(res.statusCode).toBe(405);
  });

  it("responds 500 when SITE_PASSWORD isn't configured", () => {
    delete process.env.SITE_PASSWORD;
    const res = fakeResponse();
    handler(fakeRequest({ method: "POST", body: { password: "anything" } }), res);
    expect(res.statusCode).toBe(500);
  });

  it("rejects an incorrect password without setting a cookie", () => {
    const res = fakeResponse();
    handler(fakeRequest({ method: "POST", body: { password: "falsch" } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.headers["Set-Cookie"]).toBeUndefined();
  });

  it("sets a valid session cookie on the correct password", () => {
    const res = fakeResponse();
    handler(fakeRequest({ method: "POST", body: { password: "geheim123" } }), res);
    expect(res.statusCode).toBe(200);

    const cookieHeader = res.headers["Set-Cookie"].split(";")[0];
    expect(hasValidSession(fakeRequest({ headers: { cookie: cookieHeader } }))).toBe(true);
  });
});
