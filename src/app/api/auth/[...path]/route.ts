import { createHash } from "node:crypto";

import { auth } from "@/lib/auth-server";

export const runtime = "nodejs";

const authHandlers = auth.handler();

type AuthContext = { params: Promise<{ path: string[] }> };
type AuthMethod = keyof typeof authHandlers;

const rateLimitedAuthActions: Record<string, "sign_up" | "sign_in" | "verification" | "password_reset"> = {
  "sign-up/email": "sign_up",
  "sign-in/email": "sign_in",
  "email-otp/send-verification-otp": "verification",
  "email-otp/check-verification-otp": "verification",
  "email-otp/passcode": "password_reset",
  "request-password-reset": "password_reset",
  "reset-password": "password_reset",
};

function serviceUnavailableResponse(): Response {
  return Response.json(
    { detail: "Authentication is temporarily unavailable. Try again shortly." },
    { status: 503, headers: { "Retry-After": "30" } },
  );
}

async function enforceAuthRateLimit(request: Request, action: string): Promise<Response | null> {
  if (process.env.AUTH_RATE_LIMITS_ENABLED !== "true") return null;

  const backendUrl = process.env.AUTH_RATE_LIMIT_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = process.env.AUTH_RATE_LIMIT_TOKEN;
  if (!backendUrl || !token) return serviceUnavailableResponse();

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientAddress = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const clientKey = createHash("sha256")
    .update(`${token}:${clientAddress}`)
    .digest("hex");

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/$/, "")}/internal/auth-rate-limit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Auth-Rate-Limit-Token": token,
        },
        body: JSON.stringify({ client_key: clientKey, action }),
        cache: "no-store",
      },
    );

    if (response.ok) return null;
    if (response.status === 429) {
      return Response.json(
        { detail: "Too many authentication attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": response.headers.get("Retry-After") ?? "60" },
        },
      );
    }
    return serviceUnavailableResponse();
  } catch {
    return serviceUnavailableResponse();
  }
}

async function handleAuthRequest(
  method: AuthMethod,
  request: Request,
  context: AuthContext,
): Promise<Response> {
  const { path } = await context.params;
  const action = request.method === "POST" ? rateLimitedAuthActions[path.join("/")] : undefined;
  if (action) {
    const denied = await enforceAuthRateLimit(request, action);
    if (denied) return denied;
  }

  return authHandlers[method](request, { params: Promise.resolve({ path }) });
}

export const GET = (request: Request, context: AuthContext) =>
  handleAuthRequest("GET", request, context);
export const POST = (request: Request, context: AuthContext) =>
  handleAuthRequest("POST", request, context);
export const PUT = (request: Request, context: AuthContext) =>
  handleAuthRequest("PUT", request, context);
export const DELETE = (request: Request, context: AuthContext) =>
  handleAuthRequest("DELETE", request, context);
export const PATCH = (request: Request, context: AuthContext) =>
  handleAuthRequest("PATCH", request, context);
