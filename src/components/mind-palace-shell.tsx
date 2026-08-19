"use client";

import {
  BookOpenText,
  Brain,
  Check,
  CircleAlert,
  MessageCircleQuestion,
  LogOut,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";

import {
  createThought,
  getSettings,
  listThoughts,
  Thought,
  updateSettings,
  UserSettings,
} from "@/lib/api";
import { authClient, getJWTToken } from "@/lib/auth-client";

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

type LoadState = "idle" | "loading" | "ready" | "error";

async function getApiToken(): Promise<string | null> {
  return getJWTToken();
}

export function MindPalaceShell() {
  const session = authClient.useSession();
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | "confirm">("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [manualTags, setManualTags] = useState("");
  const [thoughtType, setThoughtType] = useState("thought");
  const [useWithAsk, setUseWithAsk] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isAuthenticated = Boolean(session.data?.user) && authMode === "sign-in";

  const aiEnabledThoughts = useMemo(
    () => thoughts.filter((thought) => thought.use_with_ask_my_mind),
    [thoughts],
  );

  const refresh = useCallback(
    async () => {
      const nextToken = await getApiToken();
      if (!nextToken) {
        setLoadState("idle");
        return;
      }

      setLoadState("loading");
      setMessage("");

      try {
        const [nextThoughts, nextSettings] = await Promise.all([
          listThoughts(nextToken),
          getSettings(nextToken),
        ]);
        setThoughts(nextThoughts);
        setSettings(nextSettings);
        setUseWithAsk(nextSettings.default_use_with_ask_my_mind);
        setLoadState("ready");
      } catch (error) {
        setLoadState("error");
        setMessage(error instanceof Error ? error.message : "Unable to load Mind Palace.");
      }
    },
    [],
  );

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthenticating(true);
    setAuthMessage("");

    try {
      if (authMode === "confirm") {
        const result = await authClient.emailOtp.verifyEmail({
          email: authEmail,
          otp: verificationCode,
        });

        if (result.error) {
          setAuthMessage(result.error.message ?? "That confirmation code is not valid.");
          return;
        }

        setVerificationCode("");
        setAuthMode("sign-in");
        setAuthMessage("Email confirmed.");
        void refresh();
        return;
      }

      const result =
        authMode === "sign-in"
          ? await authClient.signIn.email({ email: authEmail, password: authPassword })
          : await authClient.signUp.email({
              email: authEmail,
              password: authPassword,
              name: authName,
            });

      if (result.error) {
        setAuthMessage(result.error.message ?? "Unable to authenticate.");
        return;
      }

      if (authMode === "sign-up") {
        const verificationResult = await authClient.emailOtp.sendVerificationOtp({
          email: authEmail,
          type: "email-verification",
        });

        if (verificationResult.error) {
          setAuthMessage(
            verificationResult.error.message ?? "Unable to send the confirmation code.",
          );
          return;
        }

        setAuthMode("confirm");
        setAuthMessage(`We sent a confirmation code to ${authEmail}.`);
        return;
      }

      setAuthPassword("");
      setAuthMessage(authMode === "sign-in" ? "Signed in." : "Account created.");
      void refresh();
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    setThoughts([]);
    setSettings(null);
    setLoadState("idle");
    setMessage("");
  }

  async function handleResendVerificationCode() {
    setIsResendingCode(true);
    setAuthMessage("");

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: authEmail,
        type: "email-verification",
      });

      if (result.error) {
        setAuthMessage(result.error.message ?? "Unable to resend the confirmation code.");
        return;
      }

      setAuthMessage(`A new confirmation code was sent to ${authEmail}.`);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Unable to resend the confirmation code.");
    } finally {
      setIsResendingCode(false);
    }
  }

  async function handleCreateThought(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = await getApiToken();
    if (!token || !body.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const thought = await createThought(token, {
        title: title.trim() || undefined,
        body: body.trim(),
        thought_type: thoughtType,
        manual_tags: splitTags(manualTags),
        use_with_ask_my_mind: useWithAsk,
      });
      setThoughts((current) => [thought, ...current]);
      setBody("");
      setTitle("");
      setManualTags("");
      setUseWithAsk(settings?.default_use_with_ask_my_mind ?? false);
      setMessage("Thought saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save thought.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDefaultAskToggle(nextValue: boolean) {
    const token = await getApiToken();
    if (!token) {
      return;
    }

    setMessage("");

    try {
      const nextSettings = await updateSettings(token, {
        default_use_with_ask_my_mind: nextValue,
      });
      setSettings(nextSettings);
      setUseWithAsk(nextSettings.default_use_with_ask_my_mind);
      setMessage("Settings updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update settings.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#1f2933]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[#d9d2c6] py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#6b5e51]">Mind Palace</p>
            <h1 className="text-2xl font-semibold tracking-normal text-[#17212b]">
              Hello Alex, what would you like to do today?
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && aiEnabledThoughts.length > 0 ? (
              <button className="inline-flex h-10 items-center gap-2 rounded-md bg-[#17212b] px-4 text-sm font-medium text-white">
                <MessageCircleQuestion size={18} aria-hidden="true" />
                Ask my mind
              </button>
            ) : null}
            {isAuthenticated ? <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9bca9] bg-white px-4 text-sm font-medium text-[#17212b]"
              onClick={() => document.getElementById("save-thought")?.scrollIntoView()}
            >
              <Save size={18} aria-hidden="true" />
              Save a thought
            </button> : null}
            {isAuthenticated ? <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9bca9] bg-white px-3 text-sm font-medium text-[#17212b]"
              onClick={() => void handleSignOut()}
              title="Sign out"
            >
              <LogOut size={17} aria-hidden="true" />
              <span className="sr-only">Sign out</span>
            </button> : null}
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            {!isAuthenticated ? <section className="rounded-lg border border-[#d9d2c6] bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#17212b]">
                <Settings size={17} aria-hidden="true" />
                {authMode === "sign-in"
                  ? "Sign in"
                  : authMode === "sign-up"
                    ? "Create account"
                    : "Confirm email"}
              </div>
              <form className="space-y-3" onSubmit={handleAuth}>
                {authMode === "confirm" ? <>
                  <p className="text-sm leading-5 text-[#5f6b76]">
                    Enter the six-digit code sent to {authEmail}.
                  </p>
                  <input
                    className="h-11 w-full rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-center text-lg tracking-[0.25em] outline-none focus:border-[#2f6f73]"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    minLength={6}
                    maxLength={6}
                    required
                  />
                </> : authMode === "sign-up" ? <input
                  className="h-10 w-full rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-sm outline-none focus:border-[#2f6f73]"
                  placeholder="Name"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  required
                /> : null}
                {authMode !== "confirm" ? <input
                  className="h-10 w-full rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-sm outline-none focus:border-[#2f6f73]"
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  required
                /> : null}
                {authMode !== "confirm" ? <input
                  className="h-10 w-full rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-sm outline-none focus:border-[#2f6f73]"
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  minLength={8}
                  required
                /> : null}
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#2f6f73] px-4 text-sm font-medium text-white disabled:opacity-50"
                  disabled={isAuthenticating}
                >
                  <Check size={17} aria-hidden="true" />
                  {isAuthenticating
                    ? "Working..."
                    : authMode === "confirm"
                      ? "Confirm email"
                      : authMode === "sign-in"
                        ? "Sign in"
                        : "Create account"}
                </button>
              </form>
              {authMessage ? <p className="mt-3 text-xs text-[#5f6b76]">{authMessage}</p> : null}
              {authMode === "confirm" ? <button
                type="button"
                className="mt-3 text-left text-xs text-[#2f6f73] underline disabled:opacity-50"
                onClick={() => void handleResendVerificationCode()}
                disabled={isResendingCode}
              >
                {isResendingCode ? "Sending..." : "Resend confirmation code"}
              </button> : null}
              {authMode === "confirm" ? <button
                type="button"
                className="mt-3 text-left text-xs text-[#2f6f73] underline"
                onClick={() => {
                  setAuthMode("sign-up");
                  setVerificationCode("");
                  setAuthMessage("");
                }}
              >
                Use a different email
              </button> : <button
                className="mt-3 text-left text-xs text-[#2f6f73] underline"
                onClick={() => {
                  setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
                  setAuthMessage("");
                }}
              >
                {authMode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>}
            </section> : null}

            {isAuthenticated ? <section className="rounded-lg border border-[#d9d2c6] bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#17212b]">
                <Sparkles size={17} aria-hidden="true" />
                Ask default
              </div>
              <label className="flex items-center justify-between gap-3 text-sm text-[#44515f]">
                <span>Use new thoughts with Ask My Mind</span>
                <input
                  className="h-5 w-5 accent-[#2f6f73]"
                  type="checkbox"
                  checked={settings?.default_use_with_ask_my_mind ?? false}
                  disabled={!isAuthenticated || loadState !== "ready"}
                  onChange={(event) => void handleDefaultAskToggle(event.target.checked)}
                />
              </label>
            </section> : null}

            <nav className="rounded-lg border border-[#d9d2c6] bg-white p-2">
              <a className="flex h-10 items-center gap-2 rounded-md bg-[#f2ede5] px-3 text-sm font-medium">
                <Brain size={17} aria-hidden="true" />
                Home
              </a>
              <a className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#5f6b76]">
                <Search size={17} aria-hidden="true" />
                Mind
              </a>
              <a className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#5f6b76]">
                <BookOpenText size={17} aria-hidden="true" />
                Books
              </a>
            </nav>
          </aside>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-lg border border-[#d9d2c6] bg-white">
              <div className="flex items-center justify-between border-b border-[#e5ded2] px-5 py-4">
                <h2 className="text-base font-semibold text-[#17212b]">Thoughts</h2>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-[#c9bca9] px-3 text-sm text-[#44515f]"
                  onClick={() => void refresh()}
                  disabled={!isAuthenticated || loadState === "loading"}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh
                </button>
              </div>

              {message ? (
                <div className="mx-5 mt-4 flex items-center gap-2 rounded-md border border-[#d8c7a4] bg-[#fff8e8] px-3 py-2 text-sm text-[#6c5521]">
                  <CircleAlert size={16} aria-hidden="true" />
                  {message}
                </div>
              ) : null}

              <div className="divide-y divide-[#eee7dc]">
                {!isAuthenticated || session.isPending ? (
                  <div className="px-5 py-10 text-sm text-[#5f6b76]">
                    Sign in to begin building your mind.
                  </div>
                ) : thoughts.length === 0 ? (
                  <div className="px-5 py-10 text-sm text-[#5f6b76]">
                    No thoughts saved yet.
                  </div>
                ) : (
                  thoughts.map((thought) => (
                    <article key={thought.id} className="px-5 py-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[#eef5f4] px-2 py-1 text-xs font-medium text-[#2f6f73]">
                          {thought.thought_type}
                        </span>
                        {thought.use_with_ask_my_mind ? (
                          <span className="rounded bg-[#eee9f7] px-2 py-1 text-xs font-medium text-[#5d4b86]">
                            Ask enabled
                          </span>
                        ) : null}
                        <span className="text-xs text-[#79838c]">
                          {formatDate(thought.created_at)}
                        </span>
                      </div>
                      {thought.title ? (
                        <h3 className="mb-1 text-sm font-semibold text-[#17212b]">
                          {thought.title}
                        </h3>
                      ) : null}
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#344250]">
                        {thought.body}
                      </p>
                      {thought.manual_tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {thought.manual_tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded border border-[#d9d2c6] px-2 py-1 text-xs text-[#5f6b76]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>

            <section
              id="save-thought"
              className="rounded-lg border border-[#d9d2c6] bg-white p-5"
            >
              <h2 className="text-base font-semibold text-[#17212b]">Save a thought</h2>
              <form className="mt-4 grid gap-4" onSubmit={handleCreateThought}>
                <label className="grid gap-2 text-sm text-[#44515f]">
                  Title
                  <input
                    className="h-11 rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 outline-none focus:border-[#2f6f73]"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label className="grid gap-2 text-sm text-[#44515f]">
                  Thought
                  <textarea
                    className="min-h-44 resize-none rounded-md border border-[#c9bca9] bg-[#fbfaf8] p-3 leading-6 outline-none focus:border-[#2f6f73]"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm text-[#44515f]">
                  Type
                  <select
                    className="h-11 rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 outline-none focus:border-[#2f6f73]"
                    value={thoughtType}
                    onChange={(event) => setThoughtType(event.target.value)}
                  >
                    <option value="thought">Thought</option>
                    <option value="journal">Journal</option>
                    <option value="quote">Quote</option>
                    <option value="book_excerpt">Book excerpt</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-[#44515f]">
                  Tags
                  <input
                    className="h-11 rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 outline-none focus:border-[#2f6f73]"
                    value={manualTags}
                    onChange={(event) => setManualTags(event.target.value)}
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-md border border-[#d9d2c6] bg-[#fbfaf8] p-3 text-sm text-[#44515f]">
                  <span>Use with Ask My Mind</span>
                  <input
                    className="h-5 w-5 accent-[#2f6f73]"
                    type="checkbox"
                    checked={useWithAsk}
                    onChange={(event) => setUseWithAsk(event.target.checked)}
                  />
                </label>

                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#17212b] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-[#9aa3aa]"
                  type="submit"
                  disabled={!isAuthenticated || !body.trim() || isSaving}
                >
                  <Save size={18} aria-hidden="true" />
                  {isSaving ? "Saving" : "Save thought"}
                </button>
              </form>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
