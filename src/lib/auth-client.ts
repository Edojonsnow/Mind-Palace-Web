"use client";

import { createAuthClient as createNextAuthClient } from "@neondatabase/auth/next";

export const authClient = createNextAuthClient();

export type ActiveAuthSession = {
  token?: string;
  expiresAt?: string | Date;
};

export async function getJWTToken(activeSession?: ActiveAuthSession): Promise<string | null> {
  const expiresAt = activeSession?.expiresAt;
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  // Reuse SDK-owned session state, with time for the backend request to finish.
  if (activeSession?.token && expiresAtMs > Date.now() + 30_000) {
    return activeSession.token;
  }

  const session = await authClient.getSession({
    query: { disableCookieCache: true },
    // Cookie-cache bypass alone does not bypass Neon's in-memory client cache.
    ...(activeSession ? { fetchOptions: { headers: { "X-Force-Fetch": "true" } } } : {}),
  });
  return session.data?.session?.token ?? null;
}
