import { cookies } from "next/headers";
import { forwardBackendRequest } from "@/lib/backend-proxy";

const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const sessionCookieName = "__Secure-neon-auth.session_token";
const sessionCookieHeader = "X-Neon-Auth-Session-Cookie";

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(path.join("/"), `${backendUrl.replace(/\/$/, "")}/`);
  target.search = new URL(request.url).search;

  const requestHeaders = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) requestHeaders.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) requestHeaders.set("accept", accept);
  const authorization = request.headers.get("authorization");
  if (authorization) requestHeaders.set("authorization", authorization);
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) requestHeaders.set("idempotency-key", idempotencyKey);

  const sessionCookie = (await cookies()).get(sessionCookieName)?.value;
  if (sessionCookie) requestHeaders.set(sessionCookieHeader, sessionCookie);

  return forwardBackendRequest(request, target, requestHeaders);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
