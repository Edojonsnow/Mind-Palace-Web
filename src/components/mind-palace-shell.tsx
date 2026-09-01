"use client";

import {
  BookOpenText,
  Brain,
  Check,
  CircleAlert,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MessageCircleQuestion,
  LogOut,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Send,
  Undo2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AskMessage,
  AskSource,
  askMyMind,
  AccountDeletionRequest,
  cancelAccountDeletion,
  createThought,
  getSettings,
  createExportRequest,
  downloadExport,
  ExportRequest,
  getAccountDeletionRequest,
  getExportRequest,
  listDeletedThoughts,
  listThoughts,
  Thought,
  ThoughtListOptions,
  requestAccountDeletion,
  restoreThought,
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

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function isExportExpired(exportRequest: ExportRequest): boolean {
  return exportRequest.status === "expired" || new Date(exportRequest.expires_at) <= new Date();
}

type LoadState = "idle" | "loading" | "ready" | "error";
type ArchiveFilter = "all" | "active" | "archived";

type RecallFilters = {
  q: string;
  thought_type: string;
  source_type: string;
  tag: string;
  book: string;
  archive: ArchiveFilter;
};

const DEFAULT_RECALL_FILTERS: RecallFilters = {
  q: "",
  thought_type: "",
  source_type: "",
  tag: "",
  book: "",
  archive: "all",
};

const RECALL_PAGE_SIZE = 20;

function recallQuery(filters: RecallFilters, page: number): ThoughtListOptions {
  return {
    q: filters.q.trim() || undefined,
    thought_type: filters.thought_type || undefined,
    source_type: filters.source_type || undefined,
    tag: filters.tag.trim() || undefined,
    book: filters.book.trim() || undefined,
    is_archived: filters.archive === "all" ? undefined : filters.archive === "archived",
    page,
    page_size: RECALL_PAGE_SIZE,
  };
}

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
  const [recallFilters, setRecallFilters] = useState<RecallFilters>(DEFAULT_RECALL_FILTERS);
  const [recallDraftFilters, setRecallDraftFilters] =
    useState<RecallFilters>(DEFAULT_RECALL_FILTERS);
  const [recallPage, setRecallPage] = useState(1);
  const [recallTotal, setRecallTotal] = useState(0);
  const [recallTotalPages, setRecallTotalPages] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [deletedThoughts, setDeletedThoughts] = useState<Thought[]>([]);
  const [exportRequest, setExportRequest] = useState<ExportRequest | null>(null);
  const [accountDeletion, setAccountDeletion] = useState<AccountDeletionRequest | null>(null);
  const [isTrustControlsOpen, setIsTrustControlsOpen] = useState(false);
  const [lifecycleState, setLifecycleState] = useState<LoadState>("idle");
  const [lifecycleMessage, setLifecycleMessage] = useState("");
  const [restoringThoughtId, setRestoringThoughtId] = useState<string | null>(null);
  const [isCreatingExport, setIsCreatingExport] = useState(false);
  const [isDownloadingExport, setIsDownloadingExport] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [manualTags, setManualTags] = useState("");
  const [thoughtType, setThoughtType] = useState("thought");
  const [useWithAsk, setUseWithAsk] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<AskMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [latestSources, setLatestSources] = useState<AskSource[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [askMessage, setAskMessage] = useState("");
  const sessionUserId = session.data?.user?.id;
  const refreshSequence = useRef(0);
  const isAuthenticated = Boolean(session.data?.user) && authMode === "sign-in";

  const aiEnabledThoughts = useMemo(
    () => thoughts.filter((thought) => thought.use_with_ask_my_mind),
    [thoughts],
  );
  const hasRecallFilters = useMemo(
    () => Object.values(recallDraftFilters).some((value) => value !== "" && value !== "all"),
    [recallDraftFilters],
  );

  const refresh = useCallback(
    async (
      pageOverride: number,
      filtersOverride: RecallFilters,
      includeSettings = false,
    ) => {
      const requestSequence = refreshSequence.current + 1;
      refreshSequence.current = requestSequence;
      const nextToken = await getApiToken();
      if (!nextToken) {
        setLoadState("idle");
        return;
      }

      setLoadState("loading");
      setMessage("");

      try {
        const [nextThoughts, nextSettings] = await Promise.all([
          listThoughts(nextToken, recallQuery(filtersOverride, pageOverride)),
          includeSettings ? getSettings(nextToken) : Promise.resolve(null),
        ]);
        if (requestSequence !== refreshSequence.current) {
          return;
        }
        setThoughts(nextThoughts.items);
        setRecallPage(nextThoughts.page);
        setRecallTotal(nextThoughts.total);
        setRecallTotalPages(nextThoughts.totalPages);
        if (nextSettings) {
          setSettings(nextSettings);
          setUseWithAsk(nextSettings.default_use_with_ask_my_mind);
        }
        setLoadState("ready");
      } catch (error) {
        if (requestSequence !== refreshSequence.current) {
          return;
        }
        setLoadState("error");
        setMessage(error instanceof Error ? error.message : "Unable to load Mind Palace.");
      }
    },
    [],
  );

  const loadTrustControls = useCallback(async () => {
    const token = await getApiToken();
    if (!token) {
      setLifecycleState("idle");
      return;
    }

    setLifecycleState("loading");
    setLifecycleMessage("");
    try {
      const [nextDeletedThoughts, nextAccountDeletion] = await Promise.all([
        listDeletedThoughts(token),
        getAccountDeletionRequest(token),
      ]);
      setDeletedThoughts(nextDeletedThoughts);
      setAccountDeletion(nextAccountDeletion);
      setLifecycleState("ready");
    } catch (error) {
      setLifecycleState("error");
      setLifecycleMessage(
        error instanceof Error ? error.message : "Unable to load data controls.",
      );
    }
  }, []);

  const refreshExportStatus = useCallback(async (exportId: string) => {
    const token = await getApiToken();
    if (!token) {
      return;
    }

    try {
      setExportRequest(await getExportRequest(token, exportId));
    } catch (error) {
      setLifecycleMessage(
        error instanceof Error ? error.message : "Unable to refresh export status.",
      );
    }
  }, []);

  useEffect(() => {
    if (session.isPending || !sessionUserId || authMode !== "sign-in") {
      return;
    }
    const refreshId = window.setTimeout(() => {
      void refresh(1, DEFAULT_RECALL_FILTERS, true);
      void loadTrustControls();
    }, 0);
    return () => window.clearTimeout(refreshId);
  }, [authMode, loadTrustControls, refresh, session.isPending, sessionUserId]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !exportRequest ||
      !["pending", "processing"].includes(exportRequest.status)
    ) {
      return;
    }

    const pollId = window.setInterval(
      () => void refreshExportStatus(exportRequest.id),
      2000,
    );
    return () => window.clearInterval(pollId);
  }, [exportRequest, isAuthenticated, refreshExportStatus]);

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
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    setThoughts([]);
    setRecallPage(1);
    setRecallTotal(0);
    setRecallTotalPages(0);
    setSettings(null);
    setDeletedThoughts([]);
    setExportRequest(null);
    setAccountDeletion(null);
    setLifecycleState("idle");
    setLifecycleMessage("");
    setLoadState("idle");
    setMessage("");
  }

  async function handleRestoreThought(thoughtId: string) {
    const token = await getApiToken();
    if (!token || restoringThoughtId) {
      return;
    }

    setRestoringThoughtId(thoughtId);
    setLifecycleMessage("");
    try {
      await restoreThought(token, thoughtId);
      setDeletedThoughts((current) => current.filter((thought) => thought.id !== thoughtId));
      await refresh(recallPage, recallFilters);
      setLifecycleMessage("Thought restored.");
    } catch (error) {
      setLifecycleMessage(error instanceof Error ? error.message : "Unable to restore thought.");
    } finally {
      setRestoringThoughtId(null);
    }
  }

  async function handleCreateExport() {
    const token = await getApiToken();
    if (!token || isCreatingExport) {
      return;
    }

    setIsCreatingExport(true);
    setLifecycleMessage("");
    try {
      setExportRequest(await createExportRequest(token));
      setLifecycleMessage("Export requested. This may take a moment.");
    } catch (error) {
      setLifecycleMessage(error instanceof Error ? error.message : "Unable to create export.");
    } finally {
      setIsCreatingExport(false);
    }
  }

  async function handleDownloadExport() {
    if (!exportRequest || isExportExpired(exportRequest) || isDownloadingExport) {
      return;
    }

    const token = await getApiToken();
    if (!token) {
      return;
    }

    setIsDownloadingExport(true);
    setLifecycleMessage("");
    try {
      const blob = await downloadExport(token, exportRequest.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mind-palace-export.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setLifecycleMessage("Export downloaded.");
    } catch (error) {
      setLifecycleMessage(error instanceof Error ? error.message : "Unable to download export.");
    } finally {
      setIsDownloadingExport(false);
    }
  }

  async function handleRequestAccountDeletion() {
    if (isRequestingDeletion || accountDeletion?.status === "pending") {
      return;
    }

    const confirmed = window.confirm(
      "Request account deletion? Your data will be permanently removed after the recovery window.",
    );
    if (!confirmed) {
      return;
    }

    const token = await getApiToken();
    if (!token) {
      return;
    }

    setIsRequestingDeletion(true);
    setLifecycleMessage("");
    try {
      setAccountDeletion(await requestAccountDeletion(token));
      setLifecycleMessage("Account deletion requested. You can cancel it during the recovery window.");
    } catch (error) {
      setLifecycleMessage(
        error instanceof Error ? error.message : "Unable to request account deletion.",
      );
    } finally {
      setIsRequestingDeletion(false);
    }
  }

  async function handleCancelAccountDeletion() {
    const token = await getApiToken();
    if (!token || isCancellingDeletion) {
      return;
    }

    setIsCancellingDeletion(true);
    setLifecycleMessage("");
    try {
      await cancelAccountDeletion(token);
      setAccountDeletion(null);
      setLifecycleMessage("Account deletion cancelled.");
    } catch (error) {
      setLifecycleMessage(
        error instanceof Error ? error.message : "Unable to cancel account deletion.",
      );
    } finally {
      setIsCancellingDeletion(false);
    }
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
      await createThought(token, {
        title: title.trim() || undefined,
        body: body.trim(),
        thought_type: thoughtType,
        manual_tags: splitTags(manualTags),
        use_with_ask_my_mind: useWithAsk,
      });
      await refresh(recallPage, recallFilters);
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

  function handleRecallSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecallFilters(recallDraftFilters);
    setRecallPage(1);
    void refresh(1, recallDraftFilters);
  }

  function handleRecallReset() {
    setRecallDraftFilters(DEFAULT_RECALL_FILTERS);
    setRecallFilters(DEFAULT_RECALL_FILTERS);
    setRecallPage(1);
    void refresh(1, DEFAULT_RECALL_FILTERS);
  }

  function handleRecallPageChange(nextPage: number) {
    if (nextPage < 1 || nextPage > recallTotalPages || loadState === "loading") {
      return;
    }
    setRecallPage(nextPage);
    void refresh(nextPage, recallFilters);
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

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking) {
      return;
    }

    const token = await getApiToken();
    if (!token) {
      setAskMessage("Your session has expired. Sign in again to continue.");
      return;
    }

    const userMessage: AskMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: trimmedQuestion,
      citations: [],
      created_at: new Date().toISOString(),
    };

    setChatMessages((current) => [...current, userMessage]);
    setQuestion("");
    setAskMessage("");
    setIsAsking(true);

    try {
      const response = await askMyMind(token, {
        question: trimmedQuestion,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      });
      const assistantMessage: AskMessage = {
        id: `local-assistant-${response.created_at}`,
        role: "assistant",
        content: response.answer,
        citations: response.sources,
        created_at: response.created_at,
      };
      setConversationId(response.conversation_id);
      setLatestSources(response.sources);
      setChatMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      setAskMessage(error instanceof Error ? error.message : "Unable to ask your mind.");
    } finally {
      setIsAsking(false);
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
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#17212b] px-4 text-sm font-medium text-white"
                type="button"
                onClick={() => {
                  setIsChatOpen(true);
                  setAskMessage("");
                }}
              >
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

        {isChatOpen && isAuthenticated ? (
          <section
            id="ask-my-mind"
            className="mt-6 overflow-hidden rounded-lg border border-[#c9bca9] bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[#e5ded2] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eef5f4] text-[#2f6f73]">
                  <MessageCircleQuestion size={19} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#17212b]">Ask my mind</h2>
                  <p className="text-xs text-[#79838c]">
                    Answers use only thoughts you have allowed AI to analyze.
                  </p>
                </div>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d9d2c6] text-[#44515f] hover:bg-[#f7f4ef]"
                type="button"
                aria-label="Close Ask My Mind"
                title="Close Ask My Mind"
                onClick={() => setIsChatOpen(false)}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="grid min-h-[260px] lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex min-h-[260px] flex-col border-b border-[#e5ded2] lg:border-b-0 lg:border-r">
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                  {chatMessages.length === 0 ? (
                    <div className="flex min-h-36 items-center justify-center text-center text-sm text-[#79838c]">
                      Ask a question about your saved thoughts.
                    </div>
                  ) : (
                    chatMessages.map((chatMessage) => (
                      <div
                        key={chatMessage.id}
                        className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6 ${
                            chatMessage.role === "user"
                              ? "bg-[#17212b] text-white"
                              : "border border-[#e5ded2] bg-[#fbfaf8] text-[#344250]"
                          }`}
                        >
                          {chatMessage.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isAsking ? (
                    <div className="text-sm text-[#79838c]">Thinking...</div>
                  ) : null}
                </div>

                {askMessage ? (
                  <div className="mx-5 mb-3 flex items-center gap-2 rounded-md border border-[#d8c7a4] bg-[#fff8e8] px-3 py-2 text-sm text-[#6c5521]">
                    <CircleAlert size={16} aria-hidden="true" />
                    {askMessage}
                  </div>
                ) : null}

                <form className="flex gap-2 border-t border-[#e5ded2] p-4" onSubmit={handleAsk}>
                  <textarea
                    className="min-h-11 flex-1 resize-none rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 py-2 text-sm leading-5 outline-none focus:border-[#2f6f73]"
                    placeholder="What would you like to remember?"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    rows={2}
                    maxLength={5000}
                    disabled={isAsking}
                  />
                  <button
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-md bg-[#2f6f73] text-white disabled:cursor-not-allowed disabled:bg-[#9aa3aa]"
                    type="submit"
                    aria-label="Send question"
                    title="Send question"
                    disabled={!question.trim() || isAsking}
                  >
                    <Send size={17} aria-hidden="true" />
                  </button>
                </form>
              </div>

              <aside className="bg-[#fbfaf8] px-5 py-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#17212b]">Sources</h3>
                  <span className="text-xs text-[#79838c]">{latestSources.length}</span>
                </div>
                {latestSources.length === 0 ? (
                  <p className="text-sm leading-5 text-[#79838c]">
                    Sources will appear here after you ask a question.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {latestSources.map((source) => (
                      <article key={source.chunk_id} className="border-l-2 border-[#2f6f73] pl-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#2f6f73]">
                            {source.citation_label}
                          </span>
                          {source.is_cited ? (
                            <span className="text-[11px] text-[#79838c]">Used in answer</span>
                          ) : null}
                        </div>
                        <p className="text-xs font-medium text-[#344250]">
                          {source.title ?? source.source_title ?? "Untitled thought"}
                        </p>
                        <p className="mt-1 line-clamp-4 text-xs leading-5 text-[#5f6b76]">
                          {source.snippet}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </section>
        ) : null}

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            {session.isPending ? <section className="rounded-lg border border-[#d9d2c6] bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-[#5f6b76]">
                <RefreshCw className="animate-spin" size={17} aria-hidden="true" />
                Restoring your session...
              </div>
            </section> : !isAuthenticated ? <section className="rounded-lg border border-[#d9d2c6] bg-white p-4">
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

            {isAuthenticated ? <section className="rounded-lg border border-[#d9d2c6] bg-white">
              <button
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[#17212b]"
                type="button"
                aria-expanded={isTrustControlsOpen}
                onClick={() => setIsTrustControlsOpen((current) => !current)}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck size={17} aria-hidden="true" />
                  Data &amp; privacy
                </span>
                <ChevronRight
                  className={isTrustControlsOpen ? "rotate-90 transition-transform" : "transition-transform"}
                  size={16}
                  aria-hidden="true"
                />
              </button>

              {isTrustControlsOpen ? <div className="space-y-5 border-t border-[#e5ded2] p-4">
                {lifecycleState === "loading" ? (
                  <div className="flex items-center gap-2 text-xs text-[#5f6b76]">
                    <RefreshCw className="animate-spin" size={15} aria-hidden="true" />
                    Loading data controls...
                  </div>
                ) : lifecycleState === "error" ? (
                  <div className="flex items-start gap-2 text-xs text-[#8a3f2d]">
                    <CircleAlert className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
                    <span>{lifecycleMessage || "Unable to load data controls."}</span>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-sm font-semibold text-[#17212b]">Deleted thoughts</h3>
                  <p className="mt-1 text-xs leading-5 text-[#79838c]">
                    Restore a thought before its recovery window ends.
                  </p>
                  {deletedThoughts.length === 0 ? (
                    <p className="mt-3 text-xs text-[#5f6b76]">No thoughts are waiting to be restored.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {deletedThoughts.map((thought) => (
                        <div key={thought.id} className="rounded-md border border-[#e5ded2] bg-[#fbfaf8] p-3">
                          <p className="line-clamp-2 text-xs leading-5 text-[#344250]">
                            {thought.title || thought.body}
                          </p>
                          {thought.purge_at ? (
                            <p className="mt-2 text-[11px] text-[#79838c]">
                              Purges {formatDate(thought.purge_at)}
                            </p>
                          ) : null}
                          <button
                            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#c9bca9] px-2.5 text-xs font-medium text-[#2f6f73] disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                            onClick={() => void handleRestoreThought(thought.id)}
                            disabled={restoringThoughtId !== null}
                          >
                            <Undo2 size={14} aria-hidden="true" />
                            {restoringThoughtId === thought.id ? "Restoring..." : "Restore"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#e5ded2] pt-4">
                  <h3 className="text-sm font-semibold text-[#17212b]">Export your data</h3>
                  <p className="mt-1 text-xs leading-5 text-[#79838c]">
                    Download your thoughts, settings, and saved chat history as JSON.
                  </p>
                  {exportRequest ? (
                    <div className="mt-3 rounded-md border border-[#e5ded2] bg-[#fbfaf8] p-3">
                      <p className="text-xs capitalize text-[#5f6b76]">
                        Status: {formatStatus(exportRequest.status)}
                      </p>
                      {exportRequest.status === "failed" ? (
                        <p className="mt-1 text-xs text-[#8a3f2d]">
                          {exportRequest.error_message || "Export generation failed."}
                        </p>
                      ) : null}
                      {exportRequest.status === "completed" && !isExportExpired(exportRequest) ? (
                        <>
                          <p className="mt-1 text-xs text-[#79838c]">
                            Available until {formatDate(exportRequest.expires_at)}.
                          </p>
                          <button
                            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-[#2f6f73] px-2.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                            onClick={() => void handleDownloadExport()}
                            disabled={isDownloadingExport}
                          >
                            <Download size={14} aria-hidden="true" />
                            {isDownloadingExport ? "Downloading..." : "Download JSON"}
                          </button>
                        </>
                      ) : null}
                      {isExportExpired(exportRequest) ? (
                        <p className="mt-1 text-xs text-[#8a3f2d]">
                          This export has expired. Request a new one.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#c9bca9] px-2.5 text-xs font-medium text-[#2f6f73] disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={() => void handleCreateExport()}
                    disabled={isCreatingExport || exportRequest?.status === "pending" || exportRequest?.status === "processing"}
                  >
                    <Download size={14} aria-hidden="true" />
                    {isCreatingExport ? "Requesting..." : "Request export"}
                  </button>
                </div>

                <div className="border-t border-[#e5ded2] pt-4">
                  <h3 className="text-sm font-semibold text-[#17212b]">Delete account</h3>
                  {accountDeletion?.status === "pending" ? (
                    <>
                      <p className="mt-1 text-xs leading-5 text-[#8a3f2d]">
                        Your account is scheduled for permanent deletion on {formatDate(accountDeletion.purge_at)}.
                      </p>
                      <button
                        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#c9bca9] px-2.5 text-xs font-medium text-[#8a3f2d] disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={() => void handleCancelAccountDeletion()}
                        disabled={isCancellingDeletion}
                      >
                        <Undo2 size={14} aria-hidden="true" />
                        {isCancellingDeletion ? "Cancelling..." : "Cancel deletion"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xs leading-5 text-[#79838c]">
                        Your data is removed after the recovery window. This cannot be undone after that point.
                      </p>
                      <button
                        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#c9bca9] px-2.5 text-xs font-medium text-[#8a3f2d] disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={() => void handleRequestAccountDeletion()}
                        disabled={isRequestingDeletion}
                      >
                        <ShieldCheck size={14} aria-hidden="true" />
                        {isRequestingDeletion ? "Requesting..." : "Request account deletion"}
                      </button>
                    </>
                  )}
                </div>

                {lifecycleMessage && lifecycleState !== "error" ? (
                  <p className="text-xs text-[#2f6f73]">{lifecycleMessage}</p>
                ) : null}
              </div> : null}
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
                  onClick={() => void refresh(recallPage, recallFilters)}
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

              {isAuthenticated ? (
                <form
                  className="grid gap-3 border-b border-[#e5ded2] px-5 py-4"
                  onSubmit={handleRecallSubmit}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="grid min-w-0 gap-1 text-xs text-[#79838c]">
                      <span>Search</span>
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#79838c]"
                          size={16}
                          aria-hidden="true"
                        />
                        <input
                          className="h-10 w-full min-w-0 rounded-md border border-[#c9bca9] bg-[#fbfaf8] pl-9 pr-3 text-sm outline-none focus:border-[#2f6f73]"
                          placeholder="Search thoughts"
                        value={recallDraftFilters.q}
                        onChange={(event) =>
                            setRecallDraftFilters((current) => ({
                              ...current,
                              q: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs text-[#79838c]">
                      <span>Type</span>
                      <select
                        className="h-10 w-full min-w-0 rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-sm text-[#344250] outline-none focus:border-[#2f6f73]"
                        value={recallDraftFilters.thought_type}
                        onChange={(event) =>
                          setRecallDraftFilters((current) => ({
                            ...current,
                            thought_type: event.target.value,
                          }))
                        }
                      >
                        <option value="">All types</option>
                        <option value="thought">Thought</option>
                        <option value="journal">Journal</option>
                        <option value="quote">Quote</option>
                        <option value="book_excerpt">Book excerpt</option>
                      </select>
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs text-[#79838c]">
                      <span>Source</span>
                      <select
                        className="h-10 w-full min-w-0 rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-sm text-[#344250] outline-none focus:border-[#2f6f73]"
                        value={recallDraftFilters.source_type}
                        onChange={(event) =>
                          setRecallDraftFilters((current) => ({
                            ...current,
                            source_type: event.target.value,
                          }))
                        }
                      >
                        <option value="">All sources</option>
                        <option value="manual">Manual</option>
                        <option value="book">Book</option>
                        <option value="article">Article</option>
                        <option value="website">Website</option>
                        <option value="audio">Audio</option>
                        <option value="import">Import</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="grid min-w-0 gap-1 text-xs text-[#79838c]">
                      <span>Tag</span>
                      <input
                        className="h-10 w-full min-w-0 rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-sm text-[#344250] outline-none focus:border-[#2f6f73]"
                        placeholder="e.g. work"
                        value={recallDraftFilters.tag}
                        onChange={(event) =>
                          setRecallDraftFilters((current) => ({
                            ...current,
                            tag: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs text-[#79838c]">
                      <span>Book or author</span>
                      <input
                        className="h-10 w-full min-w-0 rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-sm text-[#344250] outline-none focus:border-[#2f6f73]"
                        placeholder="e.g. James Clear"
                        value={recallDraftFilters.book}
                        onChange={(event) =>
                          setRecallDraftFilters((current) => ({
                            ...current,
                            book: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="grid min-w-0 gap-1 text-xs text-[#79838c]">
                      <span>Archive</span>
                      <select
                        className="h-10 w-full min-w-0 rounded-md border border-[#c9bca9] bg-[#fbfaf8] px-3 text-sm text-[#344250] outline-none focus:border-[#2f6f73]"
                        value={recallDraftFilters.archive}
                        onChange={(event) =>
                          setRecallDraftFilters((current) => ({
                            ...current,
                            archive: event.target.value as ArchiveFilter,
                          }))
                        }
                      >
                        <option value="all">All thoughts</option>
                        <option value="active">Active only</option>
                        <option value="archived">Archived only</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2f6f73] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={loadState === "loading"}
                    >
                      <Search size={16} aria-hidden="true" />
                      Search
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9bca9] px-4 text-sm text-[#44515f] disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={loadState === "loading"}
                    >
                      <Filter size={16} aria-hidden="true" />
                      Filter
                    </button>
                    <button
                      className="h-10 rounded-md border border-[#c9bca9] px-4 text-sm text-[#44515f] disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={handleRecallReset}
                      disabled={!hasRecallFilters || loadState === "loading"}
                    >
                      Reset
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="divide-y divide-[#eee7dc]">
                {session.isPending ? (
                  <div className="px-5 py-10 text-sm text-[#5f6b76]">
                    Restoring your session...
                  </div>
                ) : !isAuthenticated ? (
                  <div className="px-5 py-10 text-sm text-[#5f6b76]">
                    Sign in to begin building your mind.
                  </div>
                ) : loadState === "loading" ? (
                  <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-[#5f6b76]">
                    <RefreshCw className="animate-spin" size={17} aria-hidden="true" />
                    Loading thoughts...
                  </div>
                ) : recallTotal === 0 ? (
                  <div className="px-5 py-10 text-sm text-[#5f6b76]">
                    {hasRecallFilters ? "No thoughts match these filters." : "No thoughts saved yet."}
                  </div>
                ) : thoughts.length === 0 ? (
                  <div className="px-5 py-10 text-sm text-[#5f6b76]">
                    No thoughts on this page.
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

              {isAuthenticated && recallTotal > 0 ? (
                <div className="flex flex-col gap-3 border-t border-[#e5ded2] px-5 py-3 text-xs text-[#79838c] sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {recallTotal} {recallTotal === 1 ? "thought" : "thoughts"}
                  </span>
                  {recallTotalPages > 1 ? (
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#c9bca9] text-[#44515f] disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        aria-label="Previous page"
                        title="Previous page"
                        onClick={() => handleRecallPageChange(recallPage - 1)}
                        disabled={recallPage === 1 || loadState === "loading"}
                      >
                        <ChevronLeft size={16} aria-hidden="true" />
                      </button>
                      <span>
                        Page {recallPage} of {recallTotalPages}
                      </span>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#c9bca9] text-[#44515f] disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        aria-label="Next page"
                        title="Next page"
                        onClick={() => handleRecallPageChange(recallPage + 1)}
                        disabled={recallPage === recallTotalPages || loadState === "loading"}
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
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
