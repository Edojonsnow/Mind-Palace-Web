import { expect, test } from "@playwright/test";
import { forwardBackendRequest } from "../src/lib/backend-proxy";
import { ApiError, getProfile } from "../src/lib/api";

const reference = "00000000-0000-4000-8000-000000000001";
const originalFetch = globalThis.fetch;
const originalError = console.error;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalError;
});

test("proxy preserves the request reference and removes stale compression headers", async () => {
  let sentHeaders = new Headers();
  globalThis.fetch = async (_url, options) => {
    sentHeaders = new Headers(options?.headers);
    return new Response("decoded body", { headers: {
      "Content-Encoding": "gzip", "Content-Length": "100", "X-Total-Count": "7",
    } });
  };
  const response = await forwardBackendRequest(
    new Request("http://localhost/api/backend/thoughts", { headers: { "X-Request-ID": reference } }),
    new URL("http://backend.test/thoughts"),
    new Headers({ "Authorization": "Bearer synthetic-token", "Idempotency-Key": "action-key" }),
  );
  expect(sentHeaders.get("X-Request-ID")).toBe(reference);
  expect(sentHeaders.get("Idempotency-Key")).toBe("action-key");
  expect(response.headers.get("X-Request-ID")).toBe(reference);
  expect(response.headers.get("Content-Encoding")).toBeNull();
  expect(response.headers.get("Content-Length")).toBeNull();
  expect(response.headers.get("X-Total-Count")).toBe("7");
  expect(await response.text()).toBe("decoded body");
});

for (const [reason, status] of [["connection", 502], ["timeout", 504]] as const) {
  test(`proxy returns a safe ${status} when the backend has a ${reason} failure`, async () => {
    const events: string[] = [];
    console.error = (value: string) => { events.push(value); };
    globalThis.fetch = async () => {
      throw new DOMException("private-provider-url private-response", reason === "timeout" ? "TimeoutError" : "Error");
    };
    const response = await forwardBackendRequest(
      new Request("http://localhost/api/backend/thoughts?q=private-query", {
        headers: { "X-Request-ID": "private-invalid-reference" },
      }),
      new URL("http://backend.test/thoughts?q=private-query"), new Headers(),
    );
    expect(response.status).toBe(status);
    const body = await response.text();
    expect(body).not.toContain("private-");
    expect(events).toHaveLength(1);
    expect(events[0]).not.toContain("private-");
    expect(JSON.parse(events[0]).request_id).toBe(response.headers.get("X-Request-ID"));
    expect(JSON.parse(events[0]).reason).toBe(reason);
  });
}

test("proxy hides upstream server errors but preserves retry admission headers", async () => {
  console.error = () => {};
  globalThis.fetch = async () => new Response("private-database-error", {
    status: 503, headers: { "Retry-After": "10" },
  });
  const response = await forwardBackendRequest(
    new Request("http://localhost/api/backend/ask"), new URL("http://backend.test/ask"), new Headers(),
  );
  expect(response.status).toBe(503);
  expect(response.headers.get("Retry-After")).toBe("10");
  expect(await response.text()).not.toContain("private-");
});

test("API failures expose a safe support reference instead of server details", async () => {
  globalThis.fetch = async () => Response.json({ detail: "private-database-error" }, {
    status: 500, headers: { "X-Request-ID": reference },
  });
  const error = await getProfile("synthetic-token").catch((error: unknown) => error);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).requestId).toBe(reference);
  expect((error as Error).message).toContain(`Reference: ${reference}`);
  expect((error as Error).message).not.toContain("private-");
});

test("API admission errors retain their actionable message", async () => {
  globalThis.fetch = async () => Response.json({ detail: "Questions limit reached. Try again later." }, {
    status: 429,
  });
  await expect(getProfile("synthetic-token")).rejects.toThrow("Questions limit reached. Try again later.");
});
