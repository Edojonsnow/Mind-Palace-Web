"use client";

import { createInternalNeonAuth } from "@neondatabase/auth";
import { createAuthClient as createNextAuthClient } from "@neondatabase/auth/next";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react";

export const authClient = createNextAuthClient();
const jwtAuthClient = createInternalNeonAuth(undefined as unknown as string, {
  adapter: BetterAuthReactAdapter(),
});

export type ActiveAuthSession = {
  token?: string;
  expiresAt?: string | Date;
};

export async function getJWTToken(activeSession?: ActiveAuthSession): Promise<string | null> {
  // The Better Auth session token may be opaque. Use Neon's JWT-specific
  // method so API requests receive a locally verifiable access token.
  void activeSession;
  return jwtAuthClient.getJWTToken();
}
