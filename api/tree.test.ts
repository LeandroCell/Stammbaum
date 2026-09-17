import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Person, Family } from "../src/data/types";

const dbMocks = vi.hoisted(() => ({
  getTree: vi.fn(),
  saveTree: vi.fn(),
}));

vi.mock("./_lib/db", () => dbMocks);

import handler from "./tree";
import { createSessionCookie } from "./_lib/auth";
import { fakeRequest, fakeResponse } from "./_lib/testHelpers";

const SAMPLE_PEOPLE: Person[] = [{ id: "me", firstName: "Max", lastName: "Berger" }];
const SAMPLE_FAMILIES: Family[] = [];

function authedRequest(overrides: Parameters<typeof fakeRequest>[0] = {}) {
  const cookie = createSessionCookie().split(";")[0];
  return fakeRequest({ headers: { cookie }, ...overrides });
}

describe("/api/tree", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret";
    dbMocks.getTree.mockReset();
    dbMocks.saveTree.mockReset();
  });

  it("rejects a request without a valid session", async () => {
    const res = fakeResponse();
    await handler(fakeRequest({ method: "GET" }), res);
    expect(res.statusCode).toBe(401);
    expect(dbMocks.getTree).not.toHaveBeenCalled();
  });

  it("GET returns the tree from the database", async () => {
    dbMocks.getTree.mockResolvedValue({ people: SAMPLE_PEOPLE, families: SAMPLE_FAMILIES });
    const res = fakeResponse();
    await handler(authedRequest({ method: "GET" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ people: SAMPLE_PEOPLE, families: SAMPLE_FAMILIES });
  });

  it("GET responds 500 when the database call fails", async () => {
    dbMocks.getTree.mockRejectedValue(new Error("Verbindung fehlgeschlagen"));
    const res = fakeResponse();
    await handler(authedRequest({ method: "GET" }), res);
    expect(res.statusCode).toBe(500);
  });

  it("PUT saves the provided people/families", async () => {
    dbMocks.saveTree.mockResolvedValue(undefined);
    const res = fakeResponse();
    await handler(
      authedRequest({ method: "PUT", body: { people: SAMPLE_PEOPLE, families: SAMPLE_FAMILIES } }),
      res
    );
    expect(dbMocks.saveTree).toHaveBeenCalledWith(SAMPLE_PEOPLE, SAMPLE_FAMILIES);
    expect(res.statusCode).toBe(200);
  });

  it("PUT rejects a body where people/families aren't arrays", async () => {
    const res = fakeResponse();
    await handler(authedRequest({ method: "PUT", body: { people: "not-an-array" } }), res);
    expect(res.statusCode).toBe(400);
    expect(dbMocks.saveTree).not.toHaveBeenCalled();
  });

  it("rejects unsupported methods", async () => {
    const res = fakeResponse();
    await handler(authedRequest({ method: "DELETE" }), res);
    expect(res.statusCode).toBe(405);
  });
});
