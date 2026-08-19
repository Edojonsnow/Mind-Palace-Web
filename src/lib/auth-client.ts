"use client";

import { createAuthClient as createNextAuthClient } from "@neondatabase/auth/next";

export const authClient = createNextAuthClient();

export async function getJWTToken(): Promise<string | null> {
  const response = await fetch("/api/auth/token", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { token?: string };
  return payload.token ?? null;
}
