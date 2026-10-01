// Keys live only for the active user's page session, never in browser storage.
export function createActionKeys(owner: string | undefined) {
  const pending = new Map<string, { payload: string; key: string }>();
  return {
    get(scope: string, input: unknown): string {
      const payload = JSON.stringify(input);
      const existing = pending.get(scope);
      if (existing?.payload === payload) return existing.key;
      const key = crypto.randomUUID();
      pending.set(scope, { payload, key });
      return key;
    },
    complete(scope: string) { pending.delete(scope); },
    clear() { pending.clear(); },
    owner,
  };
}
