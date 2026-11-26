type AuthCookieStore = {
  getAll: () => { name: string }[];
  set: (name: string, value: string, options: {
    path: string; secure: boolean; httpOnly: boolean; sameSite: "lax"; maxAge: number;
  }) => unknown;
};

export function expireNeonAuthCookies(store: AuthCookieStore) {
  for (const cookie of store.getAll()) {
    if (!cookie.name.startsWith("__Secure-neon-auth.")) continue;
    // __Secure- cookies require Secure even on the response that expires them.
    store.set(cookie.name, "", {
      path: "/", secure: true, httpOnly: true, sameSite: "lax", maxAge: 0,
    });
  }
}
