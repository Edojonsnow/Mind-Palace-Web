"use client";

import { createAuthClient as createNextAuthClient } from "@neondatabase/auth/next";

export const authClient = createNextAuthClient();

export type ActiveAuthSession = {
  token?: string;
  expiresAt?: string | Date;
};

export async function getJWTToken(activeSession?: ActiveAuthSession): Promise<string | null> {
  // The cached Better Auth session token may be opaque. Use the explicit JWT
  // endpoint so API requests receive a locally verifiable access token.
  void activeSession;
  const response = await fetch("/api/auth/token", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as { token?: unknown };
  return typeof payload.token === "string" ? payload.token : null;
}
