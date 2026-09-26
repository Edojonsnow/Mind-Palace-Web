"use client";

import { createAuthClient as createNextAuthClient } from "@neondatabase/auth/next";

export const authClient = createNextAuthClient();

export async function getJWTToken(): Promise<string | null> {
  const session = await authClient.getSession({
    query: { disableCookieCache: true },
  });
  return session.data?.session?.token ?? null;
}
