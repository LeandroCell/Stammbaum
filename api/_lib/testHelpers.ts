import { vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export function fakeRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "GET",
    headers: {},
    body: undefined,
    ...overrides,
  } as unknown as VercelRequest;
}

export interface FakeResponse extends VercelResponse {
  statusCode?: number;
  jsonBody?: unknown;
  headers: Record<string, string>;
}

export function fakeResponse(): FakeResponse {
  const res = { headers: {} } as FakeResponse;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  }) as unknown as VercelResponse["status"];
  res.json = vi.fn((body: unknown) => {
    res.jsonBody = body;
    return res;
  }) as unknown as VercelResponse["json"];
  res.setHeader = vi.fn((name: string, value: string) => {
    res.headers[name] = value;
    return res;
  }) as unknown as VercelResponse["setHeader"];
  return res;
}
