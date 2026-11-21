import { validRequestId } from "./request-reference";

export async function forwardBackendRequest(request: Request, target: URL, headers: Headers) {
  const requestId = validRequestId(request.headers.get("x-request-id")) ?? crypto.randomUUID();
  headers.set("X-Request-ID", requestId);
  const startedAt = performance.now();

  function recordFailure(status: number, reason: "upstream" | "timeout" | "connection") {
    console.error(JSON.stringify({
      event: "backend_proxy.failed",
      request_id: requestId,
      status_code: status,
      reason,
      duration_ms: Math.round(performance.now() - startedAt),
    }));
  }

  function unavailable(status: number) {
    return Response.json({
      detail: "Mind Palace could not complete this request. Please try again.",
      request_id: requestId,
    }, { status, headers: { "X-Request-ID": requestId, "Cache-Control": "no-store" } });
  }

  let response: Response;
  try {
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
    response = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]),
      redirect: "manual",
    });
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    const status = timeout ? 504 : 502;
    recordFailure(status, timeout ? "timeout" : "connection");
    return unavailable(status);
  }

  // Server fetch can decompress a body without removing the original headers.
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.set("X-Request-ID", requestId);
  responseHeaders.set("Cache-Control", "no-store");

  if (response.status >= 500) {
    recordFailure(response.status, "upstream");
    await response.body?.cancel();
    const safeResponse = unavailable(response.status);
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) safeResponse.headers.set("Retry-After", retryAfter);
    return safeResponse;
  }

  return new Response(response.body, { status: response.status, headers: responseHeaders });
}
