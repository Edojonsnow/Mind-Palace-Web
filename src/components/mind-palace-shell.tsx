"use client";

import {
  BookOpenText,
  BookMarked,
  Brain,
  CircleAlert,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Heart,
  MessageCircleQuestion,
  LogOut,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Send,
  Undo2,
  UsersRound,
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
  getRememberOverview,
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
  RememberOverview,
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
type WorkspaceMode = "hub" | "organizing" | "remember" | "search" | "ask";

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
const EMPTY_REMEMBER_CATEGORIES: RememberOverview["categories"] = [
  { key: "themes", label: "Themes", items: [] },
  { key: "emotions", label: "Emotions", items: [] },
  { key: "people", label: "People", items: [] },
  { key: "books", label: "Books", items: [] },
];

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
  const [rememberOverview, setRememberOverview] = useState<RememberOverview | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("hub");
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const mindMode =
    workspaceMode === "remember"
      ? "categories"
      : workspaceMode === "organizing"
        ? "organizing"
        : "actions";
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

  const loadRemember = useCallback(async () => {
    const token = await getApiToken();
    if (!token) {
      setRememberOverview(null);
      return;
    }

    try {
      setRememberOverview(await getRememberOverview(token));
    } catch {
      setRememberOverview(null);
    }
  }, []);

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
      void loadRemember();
    }, 0);
    return () => window.clearTimeout(refreshId);
  }, [authMode, loadRemember, loadTrustControls, refresh, session.isPending, sessionUserId]);

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
    setRememberOverview(null);
    setWorkspaceMode("hub");
    setIsCaptureOpen(false);
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
      void loadRemember();
      setLifecycleMessage("Thought restored.");
    } catch (error) {
      setLifecycleMessage(error instanceof Error ? error.message : "Unable to restore thought.");
    } finally {
      setRestoringThoughtId(null);
    }
  }

  function revealRememberedMind() {
    if (workspaceMode === "organizing") {
      return;
    }
    if (workspaceMode === "remember") {
      setWorkspaceMode("hub");
      return;
    }

    setWorkspaceMode("organizing");
    window.setTimeout(() => setWorkspaceMode("remember"), 520);
  }

  function setMindMode(value: "actions" | "organizing" | "categories") {
    setWorkspaceMode(
      value === "categories" ? "remember" : value === "organizing" ? "organizing" : "hub",
    );
  }

  function scrollToWorkspace(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
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
      void loadRemember();
      setBody("");
      setTitle("");
      setManualTags("");
      setUseWithAsk(settings?.default_use_with_ask_my_mind ?? false);
      setMessage("Thought saved.");
      setIsCaptureOpen(false);
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
    <main className="min-h-screen bg-[#f6f8fc] text-[#172033]">
      <div className="flex min-h-screen w-full flex-col">
        {isAuthenticated ? (
          <section className="relative isolate flex min-h-dvh w-full flex-col justify-center overflow-hidden bg-white px-4 py-12 sm:px-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(111,127,216,0.14),transparent_36%),linear-gradient(to_bottom,rgba(246,248,252,0.2),rgba(238,240,250,0.56))]" />
            <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-7 sm:top-6">
              <button
                className="h-10 rounded-full border border-black/10 bg-white/75 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#31343b] backdrop-blur-xl hover:bg-white"
                type="button"
                onClick={() => setIsTrustControlsOpen(true)}
              >
                Privacy &amp; data
              </button>
              <button
                className="h-10 rounded-full bg-[#202226] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-black"
                type="button"
                onClick={() => void handleSignOut()}
              >
                Sign out
              </button>
            </div>

            {message ? (
              <div className="pointer-events-none fixed inset-x-0 top-5 z-[60] flex justify-center px-4">
                <div className="capture-panel-enter rounded-full border border-black/10 bg-[#24272d] px-5 py-3 text-xs font-medium text-white shadow-xl">
                  {message}
                </div>
              </div>
            ) : null}

            {workspaceMode !== "hub" ? (
              <button
                className="absolute left-4 top-4 z-30 h-10 rounded-full border border-black/10 bg-white/75 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#31343b] backdrop-blur-xl hover:bg-white sm:left-7 sm:top-6"
                type="button"
                onClick={() => setWorkspaceMode("hub")}
              >
                ← Return to my mind
              </button>
            ) : null}

            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center py-10 sm:py-12">
              {workspaceMode === "hub" ? (
                <div className="mind-workspace-enter flex w-full flex-col items-center justify-center text-center">
                  <div className="mx-auto max-w-2xl text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6f7fd8]">
                      [ Private memory / 01 ]
                    </p>
                    <h1 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.6rem)] font-medium leading-tight tracking-[-0.045em] text-[#1f2228]">
                      Wander through your mind.
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#777c86]">
                      Write without organizing. Return when you need clarity. Your thoughts arrange themselves quietly.
                    </p>
                  </div>

                  <div className="relative mx-auto mt-2 aspect-square w-full max-w-[620px] sm:mt-3">
                    <div className="absolute inset-[12%] rounded-full border border-black/[0.06]" />
                    <div className="absolute inset-[24%] rounded-full border border-dashed border-[#6f7fd8]/25" />
                    <div className="mind-sculpture absolute left-1/2 top-1/2 flex h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full sm:h-[250px] sm:w-[250px]">
                      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_34%_28%,#8fa0ff_0%,#5367c7_34%,#29345f_68%,#181b27_100%)] shadow-[0_35px_90px_rgba(32,42,89,0.34)]" />
                      <span className="absolute inset-[13%] rounded-[43%_57%_54%_46%/46%_38%_62%_54%] border border-white/30" />
                      <span className="absolute inset-[27%] rounded-[56%_44%_37%_63%/52%_60%_40%_48%] border border-white/20" />
                      <span className="relative text-center text-[10px] font-semibold uppercase tracking-[0.23em] text-white/90">
                        Your<br />mind
                      </span>
                    </div>

                    {[
                      {
                        number: "01",
                        title: "Save a thought",
                        detail: "Capture without friction",
                        placement: "left-0 top-[8%]",
                        action: () => setIsCaptureOpen(true),
                      },
                      {
                        number: "02",
                        title: "Ask my mind",
                        detail: "Answers grounded in you",
                        placement: "right-0 top-[8%]",
                        action: () => setWorkspaceMode("ask"),
                        disabled: aiEnabledThoughts.length === 0,
                      },
                      {
                        number: "03",
                        title: "Search thoughts",
                        detail: "Find the exact fragment",
                        placement: "bottom-[8%] left-0",
                        action: () => setWorkspaceMode("search"),
                      },
                      {
                        number: "04",
                        title: "View thoughts",
                        detail: "See emerging patterns",
                        placement: "bottom-[8%] right-0",
                        action: revealRememberedMind,
                      },
                    ]
                      .filter((action) => action.number !== "02" || aiEnabledThoughts.length > 0)
                      .map((action, index) => (
                      <button
                        key={action.number}
                        className={`mind-action-card absolute ${action.placement} w-[43%] rounded-[18px] border border-black/[0.08] bg-white/80 p-3 text-left shadow-[0_18px_55px_rgba(30,34,45,0.08)] backdrop-blur-xl hover:-translate-y-1 hover:border-black/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 sm:rounded-[22px] sm:p-5`}
                        style={{ animationDelay: `${index * 70}ms` }}
                        type="button"
                        onClick={action.action}
                        disabled={action.disabled}
                      >
                        <span className="flex items-center justify-between text-[10px] font-semibold tracking-[0.18em] text-[#9196a0]">
                          {action.number}
                          <span aria-hidden="true">↗</span>
                        </span>
                        <span className="mt-2 block font-display text-xs font-semibold tracking-[-0.02em] text-[#202329] sm:mt-5 sm:text-base">
                          {action.title}
                        </span>
                        <span className="mt-1 hidden text-[11px] leading-5 text-[#777c86] sm:block sm:text-xs">
                          {action.detail}
                        </span>
                      </button>
                      ))}
                  </div>
                </div>
              ) : workspaceMode === "search" ? (
                <div className="mind-workspace-enter w-full max-w-5xl">
                  <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
                    <header className="pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6f7fd8]">[ Recall / 03 ]</p>
                      <h1 className="mt-5 font-display text-5xl font-medium leading-[0.98] tracking-[-0.055em] text-[#202329] sm:text-6xl">
                        Find the thought behind the thought.
                      </h1>
                      <p className="mt-6 max-w-sm text-sm leading-6 text-[#747983]">
                        Search the words you remember, then narrow by context. Nothing here changes how your thoughts are organized.
                      </p>
                    </header>

                    <div className="rounded-[30px] border border-black/[0.08] bg-white/80 p-4 shadow-[0_30px_90px_rgba(31,35,45,0.1)] backdrop-blur-xl sm:p-7">
                      <form onSubmit={handleRecallSubmit}>
                        <label className="block">
                          <span className="sr-only">Search your thoughts</span>
                          <input
                            autoFocus
                            className="h-auto w-full border-0 border-b border-black/10 bg-transparent px-0 pb-5 font-display text-2xl tracking-[-0.035em] text-[#202329] outline-none placeholder:text-[#a5a8af] sm:text-4xl"
                            placeholder="What do you remember?"
                            value={recallDraftFilters.q}
                            onChange={(event) => setRecallDraftFilters((current) => ({ ...current, q: event.target.value }))}
                          />
                        </label>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <select className="modern-control" aria-label="Thought type" value={recallDraftFilters.thought_type} onChange={(event) => setRecallDraftFilters((current) => ({ ...current, thought_type: event.target.value }))}>
                            <option value="">All thought types</option><option value="thought">Thought</option><option value="journal">Journal</option><option value="quote">Quote</option><option value="book_excerpt">Book excerpt</option>
                          </select>
                          <select className="modern-control" aria-label="Source" value={recallDraftFilters.source_type} onChange={(event) => setRecallDraftFilters((current) => ({ ...current, source_type: event.target.value }))}>
                            <option value="">Every source</option><option value="manual">Manual</option><option value="book">Book</option><option value="article">Article</option><option value="website">Website</option><option value="audio">Audio</option><option value="import">Import</option>
                          </select>
                          <select className="modern-control" aria-label="Archive" value={recallDraftFilters.archive} onChange={(event) => setRecallDraftFilters((current) => ({ ...current, archive: event.target.value as ArchiveFilter }))}>
                            <option value="all">All thoughts</option><option value="active">Active only</option><option value="archived">Archived only</option>
                          </select>
                          <input className="modern-control" aria-label="Tag" placeholder="Tag" value={recallDraftFilters.tag} onChange={(event) => setRecallDraftFilters((current) => ({ ...current, tag: event.target.value }))} />
                          <input className="modern-control sm:col-span-2" aria-label="Book or author" placeholder="Book or author" value={recallDraftFilters.book} onChange={(event) => setRecallDraftFilters((current) => ({ ...current, book: event.target.value }))} />
                        </div>
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <button className="h-11 rounded-full bg-[#24272d] px-6 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-black" type="submit">Search memory</button>
                          <button className="h-11 px-3 text-xs font-semibold text-[#777c86] hover:text-black disabled:opacity-35" type="button" disabled={!hasRecallFilters} onClick={handleRecallReset}>Clear filters</button>
                        </div>
                      </form>

                      <div className="mt-7 max-h-[36vh] overflow-y-auto border-t border-black/[0.07] pr-1">
                        {loadState === "loading" ? (
                          <p className="py-8 text-sm text-[#777c86]">Searching your memory…</p>
                        ) : thoughts.length === 0 ? (
                          <p className="py-8 text-sm text-[#777c86]">No thoughts match this view yet.</p>
                        ) : thoughts.map((thought, index) => (
                          <article key={thought.id} className="grid grid-cols-[32px_1fr] gap-3 border-b border-black/[0.06] py-4 last:border-0">
                            <span className="pt-0.5 text-[10px] font-semibold tracking-[0.12em] text-[#a1a5ae]">{String(index + 1).padStart(2, "0")}</span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#8b909a]"><span>{thought.thought_type}</span><span>·</span><span>{formatDate(thought.created_at)}</span></div>
                              <h2 className="mt-1 font-display text-base font-semibold text-[#24272d]">{thought.title || "Untitled thought"}</h2>
                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#666b75]">{thought.body}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                      {recallTotal > 0 ? (
                        <div className="flex items-center justify-between border-t border-black/[0.07] pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b909a]">
                          <span>{recallTotal} {recallTotal === 1 ? "thought" : "thoughts"}</span>
                          {recallTotalPages > 1 ? <div className="flex items-center gap-3"><button type="button" disabled={recallPage === 1 || loadState === "loading"} onClick={() => handleRecallPageChange(recallPage - 1)}>← Previous</button><span>{recallPage} / {recallTotalPages}</span><button type="button" disabled={recallPage === recallTotalPages || loadState === "loading"} onClick={() => handleRecallPageChange(recallPage + 1)}>Next →</button></div> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : workspaceMode === "ask" ? (
                <div className="mind-workspace-enter w-full max-w-5xl">
                  <div className="mb-8 max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#35a79f]">[ Ask my mind / 02 ]</p>
                    <h1 className="mt-4 font-display text-5xl font-medium tracking-[-0.055em] text-[#202329] sm:text-6xl">A conversation grounded in you.</h1>
                  </div>
                  <div className="grid min-h-[520px] overflow-hidden rounded-[30px] border border-black/[0.08] bg-white/80 shadow-[0_30px_90px_rgba(31,35,45,0.1)] backdrop-blur-xl lg:grid-cols-[1fr_300px]">
                    <div className="flex min-h-0 flex-col border-b border-black/[0.07] lg:border-b-0 lg:border-r">
                      <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
                        {chatMessages.length === 0 ? <p className="max-w-md font-display text-2xl leading-9 tracking-[-0.025em] text-[#90949c]">Ask about a pattern, decision, person, or idea you have written about.</p> : chatMessages.map((chatMessage) => (
                          <div key={chatMessage.id} className={chatMessage.role === "user" ? "ml-auto max-w-[80%] rounded-[20px] bg-[#24272d] px-5 py-4 text-sm leading-6 text-white" : "max-w-[88%] border-l border-[#6f7fd8] pl-5 text-sm leading-7 text-[#343840]"}>{chatMessage.content}</div>
                        ))}
                        {isAsking ? <p className="text-xs uppercase tracking-[0.14em] text-[#8b909a]">Looking through your thoughts…</p> : null}
                      </div>
                      <form className="m-4 flex items-end gap-3 rounded-[22px] border border-black/[0.09] bg-[#f4f4f1] p-2 sm:m-5" onSubmit={handleAsk}>
                        <textarea className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none" placeholder="Ask something only your mind could answer…" value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} maxLength={5000} disabled={isAsking} />
                        <button className="h-11 rounded-full bg-[#24272d] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-35" type="submit" disabled={!question.trim() || isAsking}>Ask →</button>
                      </form>
                      {askMessage ? <p className="mx-5 mb-4 text-xs leading-5 text-[#bb454f]">{askMessage}</p> : null}
                    </div>
                    <aside className="bg-[#f3f3f0]/70 p-5 sm:p-7">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d929c]">Sources / {latestSources.length}</p>
                      <div className="mt-5 space-y-5">{latestSources.length === 0 ? <p className="text-sm leading-6 text-[#8b909a]">Citations appear here with the exact thoughts used.</p> : latestSources.map((source) => <article key={source.chunk_id}><span className="text-[10px] font-semibold tracking-[0.12em] text-[#6f7fd8]">{source.citation_label}</span><h2 className="mt-1 text-sm font-semibold text-[#30343b]">{source.title ?? source.source_title ?? "Untitled thought"}</h2><p className="mt-1 line-clamp-4 text-xs leading-5 text-[#737984]">{source.snippet}</p></article>)}</div>
                    </aside>
                  </div>
                </div>
              ) : workspaceMode === "organizing" ? (
                <div className="mind-workspace-enter text-center">
                  <div className="mx-auto h-52 w-52 animate-pulse rounded-full bg-[radial-gradient(circle_at_34%_28%,#8fa0ff_0%,#5367c7_34%,#29345f_68%,#181b27_100%)] shadow-[0_35px_90px_rgba(32,42,89,0.34)]" />
                  <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#777c86]">Rearranging the view…</p>
                </div>
              ) : (
                <div className="mind-workspace-enter w-full max-w-6xl">
                  <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
                    <header>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#35a79f]">[ Remember / 04 ]</p>
                      <h1 className="mt-5 font-display text-5xl font-medium leading-[0.98] tracking-[-0.055em] text-[#202329] sm:text-7xl">Patterns, without the filing.</h1>
                      <p className="mt-6 max-w-sm text-sm leading-6 text-[#747983]">{rememberOverview?.thoughts_analyzed ?? 0} AI-enabled thoughts have contributed to this view.</p>
                    </header>
                    <div className="grid gap-3 sm:grid-cols-2">{(rememberOverview?.categories ?? EMPTY_REMEMBER_CATEGORIES).map((category, index) => <article key={category.key} className="rounded-[26px] border border-black/[0.08] bg-white/80 p-6 shadow-[0_20px_60px_rgba(31,35,45,0.07)] backdrop-blur-xl"><span className="text-[10px] font-semibold tracking-[0.18em] text-[#9a9ea7]">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-7 font-display text-2xl font-semibold tracking-[-0.035em] text-[#24272d]">{category.label}</h2><div className="mt-5 flex flex-wrap gap-2">{category.items.length === 0 ? <span className="text-sm text-[#8b909a]">Still taking shape</span> : category.items.map((item) => <span key={item.label} className="rounded-full border border-black/[0.08] bg-[#f3f3f0] px-3 py-2 text-xs text-[#5f646d]">{item.label} <sup className="text-[#969ba4]">{item.count}</sup></span>)}</div></article>)}</div>
                  </div>
                </div>
              )}
            </div>
            <button
              className="hidden"
              onClick={() => void handleSignOut()}
              title="Sign out"
              type="button"
            >
              <LogOut size={18} aria-hidden="true" />
              <span className="sr-only">Sign out</span>
            </button>
            <div className="hidden">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6f7fd8]">
                {mindMode === "categories" ? "Your mind, remembered" : "Welcome back, Alex"}
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-[#172033] sm:text-4xl">
                {mindMode === "categories"
                  ? "The patterns taking shape"
                  : "Where would you like to wander?"}
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#68738a] sm:text-base">
                {mindMode === "categories"
                  ? `${rememberOverview?.thoughts_analyzed ?? 0} AI-enabled thoughts organized quietly in the background.`
                  : "Capture what is here, revisit what was, or ask your own thoughts a question."}
              </p>
            </div>

            <div className="hidden">
              <svg
                className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
                viewBox="0 0 800 354"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <g fill="none" stroke="#cfd6ec" strokeWidth="1.5" strokeDasharray="5 7">
                  <path d="M400 177 C310 177 300 59 195 59" />
                  <path d="M400 177 C490 177 500 59 605 59" />
                  <path d="M400 177 C310 177 300 295 195 295" />
                  <path d="M400 177 C490 177 500 295 605 295" />
                </g>
              </svg>

              <button
                className="mind-core relative order-first col-span-2 mx-auto flex h-[158px] w-[158px] flex-col items-center justify-center rounded-full border border-[#cfd6ec] bg-[#263a67] text-white sm:order-none sm:col-span-1 sm:col-start-2 sm:row-start-2"
                type="button"
                onClick={() => mindMode === "categories" && setMindMode("actions")}
                aria-label={mindMode === "categories" ? "Return to mind actions" : "Your mind"}
              >
                <span className="mind-orbit absolute h-[178px] w-[178px] rounded-full border border-dashed border-[#aeb9e8]" />
                <Brain size={42} strokeWidth={1.6} aria-hidden="true" />
                <span className="font-display mt-2 text-sm font-semibold">
                  {mindMode === "organizing"
                    ? "Remembering…"
                    : mindMode === "categories"
                      ? "My mind"
                      : "Begin here"}
                </span>
              </button>

              {mindMode === "actions" ? (
                <>
                  <button
                    className="mind-node-enter group rounded-2xl border border-[#dde2ee] bg-white p-4 text-left shadow-[0_10px_30px_rgba(38,58,103,0.06)] hover:-translate-y-1 hover:border-[#6f7fd8] hover:shadow-[0_16px_36px_rgba(38,58,103,0.12)] sm:col-start-1 sm:row-start-1"
                    type="button"
                    onClick={() => scrollToWorkspace("save-thought")}
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0fa] text-[#6f7fd8]"><Save size={18} /></span>
                    <span className="font-display block text-sm font-semibold text-[#172033]">Save a thought</span>
                    <span className="mt-1 block text-xs leading-5 text-[#68738a]">Get it out in under ten seconds.</span>
                  </button>
                  <button
                    className="mind-node-enter group rounded-2xl border border-[#dde2ee] bg-white p-4 text-left shadow-[0_10px_30px_rgba(38,58,103,0.06)] hover:-translate-y-1 hover:border-[#35b8b0] hover:shadow-[0_16px_36px_rgba(38,58,103,0.12)] disabled:cursor-not-allowed disabled:opacity-50 sm:col-start-3 sm:row-start-1"
                    style={{ animationDelay: "70ms" }}
                    type="button"
                    disabled={aiEnabledThoughts.length === 0}
                    onClick={() => {
                      setIsChatOpen(true);
                      setAskMessage("");
                      scrollToWorkspace("ask-my-mind");
                    }}
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#e7f7f5] text-[#24796f]"><MessageCircleQuestion size={18} /></span>
                    <span className="font-display block text-sm font-semibold text-[#172033]">Ask my mind</span>
                    <span className="mt-1 block text-xs leading-5 text-[#68738a]">Find meaning with cited answers.</span>
                  </button>
                  <button
                    className="mind-node-enter group rounded-2xl border border-[#dde2ee] bg-white p-4 text-left shadow-[0_10px_30px_rgba(38,58,103,0.06)] hover:-translate-y-1 hover:border-[#6f7fd8] hover:shadow-[0_16px_36px_rgba(38,58,103,0.12)] sm:col-start-1 sm:row-start-3"
                    style={{ animationDelay: "140ms" }}
                    type="button"
                    onClick={() => scrollToWorkspace("thoughts-workspace")}
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0fa] text-[#6f7fd8]"><Search size={18} /></span>
                    <span className="font-display block text-sm font-semibold text-[#172033]">Search thoughts</span>
                    <span className="mt-1 block text-xs leading-5 text-[#68738a]">Recall a detail, person, or idea.</span>
                  </button>
                  <button
                    className="mind-node-enter group rounded-2xl border border-[#dde2ee] bg-white p-4 text-left shadow-[0_10px_30px_rgba(38,58,103,0.06)] hover:-translate-y-1 hover:border-[#35b8b0] hover:shadow-[0_16px_36px_rgba(38,58,103,0.12)] sm:col-start-3 sm:row-start-3"
                    style={{ animationDelay: "210ms" }}
                    type="button"
                    onClick={revealRememberedMind}
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#e7f7f5] text-[#24796f]"><Sparkles size={18} /></span>
                    <span className="font-display block text-sm font-semibold text-[#172033]">View thoughts</span>
                    <span className="mt-1 block text-xs leading-5 text-[#68738a]">See what your mind has organized.</span>
                  </button>
                </>
              ) : mindMode === "organizing" ? (
                <div className="col-span-2 flex items-center justify-center gap-2 text-sm text-[#68738a] sm:col-span-3 sm:row-start-1 sm:row-end-4">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#6f7fd8]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#35b8b0] [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#6f7fd8] [animation-delay:240ms]" />
                </div>
              ) : (
                (rememberOverview?.categories ?? EMPTY_REMEMBER_CATEGORIES).map((category, index) => {
                  const positions = [
                    "sm:col-start-1 sm:row-start-1",
                    "sm:col-start-3 sm:row-start-1",
                    "sm:col-start-1 sm:row-start-3",
                    "sm:col-start-3 sm:row-start-3",
                  ];
                  const CategoryIcon =
                    category.key === "themes"
                      ? Sparkles
                      : category.key === "emotions"
                        ? Heart
                        : category.key === "people"
                          ? UsersRound
                          : BookMarked;
                  return (
                    <article
                      key={category.key}
                      className={`mind-node-enter rounded-2xl border border-[#cfd6ec] bg-white p-4 shadow-[0_12px_36px_rgba(38,58,103,0.09)] ${positions[index]}`}
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0fa] text-[#6f7fd8]"><CategoryIcon size={18} /></span>
                        <h2 className="font-display text-sm font-semibold text-[#172033]">{category.label}</h2>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#68738a]">
                        {category.items.length > 0
                          ? category.items.slice(0, 3).map((item) => item.label).join(" · ")
                          : "Waiting for more AI-enabled thoughts"}
                      </p>
                    </article>
                  );
                })
              )}
            </div>

            {mindMode === "categories" ? (
              <div className="hidden">
                <button
                  className="rounded-xl border border-[#dde2ee] bg-white px-4 text-sm font-medium text-[#263a67] hover:border-[#6f7fd8] hover:bg-[#eef0fa]"
                  type="button"
                  onClick={() => scrollToWorkspace("thoughts-workspace")}
                >
                  Browse the full timeline
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {isCaptureOpen && isAuthenticated ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#17191d]/55 p-3 backdrop-blur-md sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="capture-title"
          >
            <button
              className="absolute inset-0 cursor-default"
              type="button"
              aria-label="Close thought composer"
              onClick={() => setIsCaptureOpen(false)}
            />
            <section className="capture-panel-enter relative z-10 flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-[#f7f7f4] shadow-[0_50px_160px_rgba(0,0,0,0.32)]">
              <header className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4 sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#35a79f]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#727780]">Private capture / autosaved after submission</p>
                </div>
                <button className="h-10 rounded-full border border-black/10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#565b64] hover:bg-white" type="button" onClick={() => setIsCaptureOpen(false)}>Close</button>
              </header>

              <form className="min-h-0 overflow-y-auto" onSubmit={handleCreateThought}>
                <div className="px-5 pb-5 pt-7 sm:px-10 sm:pb-8 sm:pt-10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f7fd8]">[ New thought ]</p>
                  <h1 id="capture-title" className="mt-3 font-display text-4xl font-medium tracking-[-0.05em] text-[#202329] sm:text-5xl">What is moving through your mind?</h1>
                  <textarea
                    autoFocus
                    className="mt-7 min-h-52 w-full resize-none border-0 bg-transparent font-display text-xl leading-9 tracking-[-0.025em] text-[#30343b] outline-none placeholder:text-[#a4a7ad] sm:min-h-64 sm:text-2xl"
                    placeholder="Start anywhere. You do not need to organize it."
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    required
                  />
                </div>

                <div className="border-t border-black/[0.07] bg-white/70 px-5 py-5 sm:px-8">
                  <div className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr]">
                    <label>
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Optional title</span>
                      <input className="modern-control w-full" placeholder="Give this thought a name" value={title} onChange={(event) => setTitle(event.target.value)} />
                    </label>
                    <label>
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Kind of thought</span>
                      <select className="modern-control w-full" value={thoughtType} onChange={(event) => setThoughtType(event.target.value)}><option value="thought">Thought</option><option value="journal">Journal</option><option value="quote">Quote</option><option value="book_excerpt">Book excerpt</option></select>
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label>
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Context, if useful</span>
                      <input className="modern-control w-full" placeholder="Tags separated by commas" value={manualTags} onChange={(event) => setManualTags(event.target.value)} />
                    </label>
                    <label className="flex min-h-12 items-center justify-between gap-6 rounded-2xl border border-black/[0.08] bg-[#f3f3f0] px-4 text-xs font-medium text-[#4d525b]">
                      <span>Let Ask My Mind use this</span>
                      <input className="h-4 w-4 accent-[#24272d]" type="checkbox" checked={useWithAsk} onChange={(event) => setUseWithAsk(event.target.checked)} />
                    </label>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <p className="hidden max-w-md text-xs leading-5 text-[#8a8f98] sm:block">AI access is off unless you enable it. Your original thought remains visible only inside your account.</p>
                    <button className="h-12 shrink-0 rounded-full bg-[#24272d] px-7 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-35" type="submit" disabled={!body.trim() || isSaving}>{isSaving ? "Keeping it…" : "Keep this thought →"}</button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {isTrustControlsOpen && isAuthenticated ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#17191d]/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
            <button className="absolute inset-0 cursor-default" type="button" aria-label="Close privacy settings" onClick={() => setIsTrustControlsOpen(false)} />
            <section className="capture-panel-enter relative z-10 h-full w-full max-w-xl overflow-y-auto bg-[#f7f7f4] p-6 shadow-[-30px_0_100px_rgba(0,0,0,0.18)] sm:p-9">
              <div className="flex items-start justify-between gap-6">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#35a79f]">[ Trust controls ]</p><h1 id="privacy-title" className="mt-3 font-display text-4xl font-medium tracking-[-0.05em] text-[#202329]">Privacy &amp; data</h1></div>
                <button className="h-10 rounded-full border border-black/10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em]" type="button" onClick={() => setIsTrustControlsOpen(false)}>Close</button>
              </div>

              <div className="mt-10 space-y-4">
                <section className="rounded-[24px] border border-black/[0.08] bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9099]">AI participation</p>
                  <label className="mt-4 flex items-center justify-between gap-5 text-sm leading-6 text-[#383c44]"><span>Use new thoughts with Ask My Mind by default</span><input className="h-5 w-5 accent-[#24272d]" type="checkbox" checked={settings?.default_use_with_ask_my_mind ?? false} disabled={loadState !== "ready"} onChange={(event) => void handleDefaultAskToggle(event.target.checked)} /></label>
                </section>

                <section className="rounded-[24px] border border-black/[0.08] bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9099]">Deleted thoughts</p>
                  <p className="mt-2 text-sm leading-6 text-[#6f747e]">Restore a thought before its recovery window ends.</p>
                  <div className="mt-4 space-y-3">{deletedThoughts.length === 0 ? <p className="text-sm text-[#92969e]">Nothing is waiting to be restored.</p> : deletedThoughts.map((thought) => <article key={thought.id} className="rounded-2xl bg-[#f3f3f0] p-4"><p className="line-clamp-2 text-sm text-[#3e424a]">{thought.title || thought.body}</p><button className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5367c7]" type="button" onClick={() => void handleRestoreThought(thought.id)} disabled={restoringThoughtId !== null}>{restoringThoughtId === thought.id ? "Restoring…" : "Restore thought"}</button></article>)}</div>
                </section>

                <section className="rounded-[24px] border border-black/[0.08] bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9099]">Your archive</p>
                  <p className="mt-2 text-sm leading-6 text-[#6f747e]">Create a JSON export of your thoughts, settings, and saved conversations.</p>
                  {exportRequest ? <p className="mt-3 text-xs text-[#777c86]">Export status: {formatStatus(exportRequest.status)}{exportRequest.status === "completed" && !isExportExpired(exportRequest) ? ` · available until ${formatDate(exportRequest.expires_at)}` : ""}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2"><button className="h-10 rounded-full border border-black/10 px-4 text-[10px] font-semibold uppercase tracking-[0.12em]" type="button" onClick={() => void handleCreateExport()} disabled={isCreatingExport || exportRequest?.status === "pending" || exportRequest?.status === "processing"}>{isCreatingExport ? "Requesting…" : "Request export"}</button>{exportRequest?.status === "completed" && !isExportExpired(exportRequest) ? <button className="h-10 rounded-full bg-[#24272d] px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white" type="button" onClick={() => void handleDownloadExport()} disabled={isDownloadingExport}>{isDownloadingExport ? "Downloading…" : "Download JSON"}</button> : null}</div>
                </section>

                <section className="rounded-[24px] border border-[#bb454f]/20 bg-[#fffafa] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#bb454f]">Account deletion</p>
                  {accountDeletion?.status === "pending" ? <><p className="mt-2 text-sm leading-6 text-[#7a4a4e]">Permanent deletion is scheduled for {formatDate(accountDeletion.purge_at)}.</p><button className="mt-4 h-10 rounded-full border border-[#bb454f]/30 px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#bb454f]" type="button" onClick={() => void handleCancelAccountDeletion()} disabled={isCancellingDeletion}>{isCancellingDeletion ? "Cancelling…" : "Cancel deletion"}</button></> : <><p className="mt-2 text-sm leading-6 text-[#7a6668]">Your Mind Palace data is removed after the recovery window.</p><button className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bb454f]" type="button" onClick={() => void handleRequestAccountDeletion()} disabled={isRequestingDeletion}>{isRequestingDeletion ? "Requesting…" : "Request account deletion"}</button></>}
                </section>
              </div>
              {lifecycleMessage ? <p className="mt-5 text-sm text-[#5f646d]">{lifecycleMessage}</p> : null}
            </section>
          </div>
        ) : null}

        {isChatOpen && isAuthenticated ? (
          <section
            id="ask-my-mind"
            className="mx-auto mt-6 w-[calc(100%-2rem)] max-w-7xl overflow-hidden rounded-2xl border border-[#dde2ee] bg-white shadow-sm sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
          >
            <div className="flex items-center justify-between border-b border-[#dde2ee] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0fa] text-[#263a67]">
                  <MessageCircleQuestion size={19} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">Ask my mind</h2>
                  <p className="text-xs text-[#68738a]">
                    Answers use only thoughts you have allowed AI to analyze.
                  </p>
                </div>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#dde2ee] text-[#263a67] hover:bg-[#f6f8fc]"
                type="button"
                aria-label="Close Ask My Mind"
                title="Close Ask My Mind"
                onClick={() => setIsChatOpen(false)}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="grid min-h-[260px] lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex min-h-[260px] flex-col border-b border-[#dde2ee] lg:border-b-0 lg:border-r">
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                  {chatMessages.length === 0 ? (
                    <div className="flex min-h-36 items-center justify-center text-center text-sm text-[#68738a]">
                      Ask a question about your saved thoughts.
                    </div>
                  ) : (
                    chatMessages.map((chatMessage) => (
                      <div
                        key={chatMessage.id}
                        className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                            chatMessage.role === "user"
                              ? "bg-[#172033] text-white"
                              : "border border-[#dde2ee] bg-[#f6f8fc] text-[#172033]"
                          }`}
                        >
                          {chatMessage.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isAsking ? (
                    <div className="text-sm text-[#68738a]">Thinking...</div>
                  ) : null}
                </div>

                {askMessage ? (
                  <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-[#d8c7a4] bg-[#fff8e8] px-3 py-2 text-sm text-[#6c5521]">
                    <CircleAlert size={16} aria-hidden="true" />
                    {askMessage}
                  </div>
                ) : null}

                <form className="flex gap-2 border-t border-[#dde2ee] p-4" onSubmit={handleAsk}>
                  <textarea
                    className="min-h-11 flex-1 resize-none rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 py-2 text-sm leading-5 outline-none focus:border-[#263a67]"
                    placeholder="What would you like to remember?"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    rows={2}
                    maxLength={5000}
                    disabled={isAsking}
                  />
                  <button
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl bg-[#263a67] text-white disabled:cursor-not-allowed disabled:bg-[#9ca6ba]"
                    type="submit"
                    aria-label="Send question"
                    title="Send question"
                    disabled={!question.trim() || isAsking}
                  >
                    <Send size={17} aria-hidden="true" />
                  </button>
                </form>
              </div>

              <aside className="bg-[#f6f8fc] px-5 py-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#172033]">Sources</h3>
                  <span className="text-xs text-[#68738a]">{latestSources.length}</span>
                </div>
                {latestSources.length === 0 ? (
                  <p className="text-sm leading-5 text-[#68738a]">
                    Sources will appear here after you ask a question.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {latestSources.map((source) => (
                      <article key={source.chunk_id} className="border-l-2 border-[#263a67] pl-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#263a67]">
                            {source.citation_label}
                          </span>
                          {source.is_cited ? (
                            <span className="text-[11px] text-[#68738a]">Used in answer</span>
                          ) : null}
                        </div>
                        <p className="text-xs font-medium text-[#172033]">
                          {source.title ?? source.source_title ?? "Untitled thought"}
                        </p>
                        <p className="mt-1 line-clamp-4 text-xs leading-5 text-[#68738a]">
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

        <section
          className={`mx-auto w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8 ${isAuthenticated ? "hidden" : "grid place-items-center"}`}
        >
          <aside className={`flex w-full flex-col gap-4 ${isAuthenticated ? "" : "max-w-md"}`}>
            {session.isPending ? <section className="rounded-[30px] border border-black/[0.08] bg-white p-8 shadow-[0_30px_100px_rgba(31,35,45,0.08)]">
              <div className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d828b]">Restoring your private space…</div>
            </section> : !isAuthenticated ? <section className="rounded-[30px] border border-black/[0.08] bg-white p-7 shadow-[0_30px_100px_rgba(31,35,45,0.1)] sm:p-9">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f7fd8]">[ Private memory ]</p>
              <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.05em] text-[#202329]">
                {authMode === "sign-in"
                  ? "Return to your mind."
                  : authMode === "sign-up"
                    ? "Begin remembering."
                    : "Confirm it is you."}
              </h1>
              <p className="mb-7 mt-3 text-sm leading-6 text-[#7a7f88]">Your thoughts stay private and your AI controls remain yours.</p>
              <form className="space-y-3" onSubmit={handleAuth}>
                {authMode === "confirm" ? <>
                  <p className="text-sm leading-5 text-[#68738a]">
                    Enter the six-digit code sent to {authEmail}.
                  </p>
                  <input
                    className="modern-control w-full text-center text-lg tracking-[0.25em]"
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
                  className="modern-control w-full"
                  placeholder="Name"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  required
                /> : null}
                {authMode !== "confirm" ? <input
                  className="modern-control w-full"
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  required
                /> : null}
                {authMode !== "confirm" ? <input
                  className="modern-control w-full"
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  minLength={8}
                  required
                /> : null}
                <button
                  className="mt-2 h-12 w-full rounded-full bg-[#24272d] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-black disabled:opacity-50"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating
                    ? "Working..."
                    : authMode === "confirm"
                      ? "Confirm email"
                      : authMode === "sign-in"
                        ? "Sign in"
                        : "Create account"}
                </button>
              </form>
              {authMessage ? <p className="mt-4 text-xs leading-5 text-[#68738a]">{authMessage}</p> : null}
              {authMode === "confirm" ? <button
                type="button"
                className="mt-4 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5367c7] disabled:opacity-50"
                onClick={() => void handleResendVerificationCode()}
                disabled={isResendingCode}
              >
                {isResendingCode ? "Sending..." : "Resend confirmation code"}
              </button> : null}
              {authMode === "confirm" ? <button
                type="button"
                className="mt-4 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5367c7]"
                onClick={() => {
                  setAuthMode("sign-up");
                  setVerificationCode("");
                  setAuthMessage("");
                }}
              >
                Use a different email
              </button> : <button
                className="mt-4 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5367c7]"
                onClick={() => {
                  setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
                  setAuthMessage("");
                }}
              >
                {authMode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>}
            </section> : null}

            {isAuthenticated ? <section className="rounded-2xl border border-[#dde2ee] bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#172033]">
                <Sparkles size={17} aria-hidden="true" />
                Ask default
              </div>
              <label className="flex items-center justify-between gap-3 text-sm text-[#263a67]">
                <span>Use new thoughts with Ask My Mind</span>
                <input
                  className="h-5 w-5 accent-[#263a67]"
                  type="checkbox"
                  checked={settings?.default_use_with_ask_my_mind ?? false}
                  disabled={!isAuthenticated || loadState !== "ready"}
                  onChange={(event) => void handleDefaultAskToggle(event.target.checked)}
                />
              </label>
            </section> : null}

            {isAuthenticated ? <section className="rounded-2xl border border-[#dde2ee] bg-white">
              <button
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[#172033]"
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

              {isTrustControlsOpen ? <div className="space-y-5 border-t border-[#dde2ee] p-4">
                {lifecycleState === "loading" ? (
                  <div className="flex items-center gap-2 text-xs text-[#68738a]">
                    <RefreshCw className="animate-spin" size={15} aria-hidden="true" />
                    Loading data controls...
                  </div>
                ) : lifecycleState === "error" ? (
                  <div className="flex items-start gap-2 text-xs text-[#bb454f]">
                    <CircleAlert className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
                    <span>{lifecycleMessage || "Unable to load data controls."}</span>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-sm font-semibold text-[#172033]">Deleted thoughts</h3>
                  <p className="mt-1 text-xs leading-5 text-[#68738a]">
                    Restore a thought before its recovery window ends.
                  </p>
                  {deletedThoughts.length === 0 ? (
                    <p className="mt-3 text-xs text-[#68738a]">No thoughts are waiting to be restored.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {deletedThoughts.map((thought) => (
                        <div key={thought.id} className="rounded-xl border border-[#dde2ee] bg-[#f6f8fc] p-3">
                          <p className="line-clamp-2 text-xs leading-5 text-[#172033]">
                            {thought.title || thought.body}
                          </p>
                          {thought.purge_at ? (
                            <p className="mt-2 text-[11px] text-[#68738a]">
                              Purges {formatDate(thought.purge_at)}
                            </p>
                          ) : null}
                          <button
                            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dde2ee] px-2.5 text-xs font-medium text-[#263a67] disabled:cursor-not-allowed disabled:opacity-50"
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

                <div className="border-t border-[#dde2ee] pt-4">
                  <h3 className="text-sm font-semibold text-[#172033]">Export your data</h3>
                  <p className="mt-1 text-xs leading-5 text-[#68738a]">
                    Download your thoughts, settings, and saved chat history as JSON.
                  </p>
                  {exportRequest ? (
                    <div className="mt-3 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] p-3">
                      <p className="text-xs capitalize text-[#68738a]">
                        Status: {formatStatus(exportRequest.status)}
                      </p>
                      {exportRequest.status === "failed" ? (
                        <p className="mt-1 text-xs text-[#bb454f]">
                          {exportRequest.error_message || "Export generation failed."}
                        </p>
                      ) : null}
                      {exportRequest.status === "completed" && !isExportExpired(exportRequest) ? (
                        <>
                          <p className="mt-1 text-xs text-[#68738a]">
                            Available until {formatDate(exportRequest.expires_at)}.
                          </p>
                          <button
                            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#263a67] px-2.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                        <p className="mt-1 text-xs text-[#bb454f]">
                          This export has expired. Request a new one.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dde2ee] px-2.5 text-xs font-medium text-[#263a67] disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={() => void handleCreateExport()}
                    disabled={isCreatingExport || exportRequest?.status === "pending" || exportRequest?.status === "processing"}
                  >
                    <Download size={14} aria-hidden="true" />
                    {isCreatingExport ? "Requesting..." : "Request export"}
                  </button>
                </div>

                <div className="border-t border-[#dde2ee] pt-4">
                  <h3 className="text-sm font-semibold text-[#172033]">Delete account</h3>
                  {accountDeletion?.status === "pending" ? (
                    <>
                      <p className="mt-1 text-xs leading-5 text-[#bb454f]">
                        Your account is scheduled for permanent deletion on {formatDate(accountDeletion.purge_at)}.
                      </p>
                      <button
                        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dde2ee] px-2.5 text-xs font-medium text-[#bb454f] disabled:cursor-not-allowed disabled:opacity-50"
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
                      <p className="mt-1 text-xs leading-5 text-[#68738a]">
                        Your data is removed after the recovery window. This cannot be undone after that point.
                      </p>
                      <button
                        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dde2ee] px-2.5 text-xs font-medium text-[#bb454f] disabled:cursor-not-allowed disabled:opacity-50"
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
                  <p className="text-xs text-[#263a67]">{lifecycleMessage}</p>
                ) : null}
              </div> : null}
            </section> : null}

            <nav className={`${isAuthenticated ? "" : "hidden"} rounded-2xl border border-[#dde2ee] bg-white p-2`}>
              <a className="flex h-10 items-center gap-2 rounded-xl bg-[#eef0fa] px-3 text-sm font-medium">
                <Brain size={17} aria-hidden="true" />
                Home
              </a>
              <a className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-[#68738a]">
                <Search size={17} aria-hidden="true" />
                Mind
              </a>
              <a className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-[#68738a]">
                <BookOpenText size={17} aria-hidden="true" />
                Books
              </a>
            </nav>
          </aside>

          <div className={`${isAuthenticated ? "grid" : "hidden"} gap-6 xl:grid-cols-[minmax(0,1fr)_380px]`}>
            <section id="thoughts-workspace" className="scroll-mt-6 rounded-2xl border border-[#dde2ee] bg-white">
              <div className="flex items-center justify-between border-b border-[#dde2ee] px-5 py-4">
                <h2 className="text-base font-semibold text-[#172033]">Thoughts</h2>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dde2ee] px-3 text-sm text-[#263a67]"
                  onClick={() => void refresh(recallPage, recallFilters)}
                  disabled={!isAuthenticated || loadState === "loading"}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh
                </button>
              </div>

              {message ? (
                <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-[#d8c7a4] bg-[#fff8e8] px-3 py-2 text-sm text-[#6c5521]">
                  <CircleAlert size={16} aria-hidden="true" />
                  {message}
                </div>
              ) : null}

              {isAuthenticated ? (
                <form
                  className="grid gap-3 border-b border-[#dde2ee] px-5 py-4"
                  onSubmit={handleRecallSubmit}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="grid min-w-0 gap-1 text-xs text-[#68738a]">
                      <span>Search</span>
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#68738a]"
                          size={16}
                          aria-hidden="true"
                        />
                        <input
                          className="h-10 w-full min-w-0 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] pl-9 pr-3 text-sm outline-none focus:border-[#263a67]"
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
                    <label className="grid min-w-0 gap-1 text-xs text-[#68738a]">
                      <span>Type</span>
                      <select
                        className="h-10 w-full min-w-0 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
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
                    <label className="grid min-w-0 gap-1 text-xs text-[#68738a]">
                      <span>Source</span>
                      <select
                        className="h-10 w-full min-w-0 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
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
                    <label className="grid min-w-0 gap-1 text-xs text-[#68738a]">
                      <span>Tag</span>
                      <input
                        className="h-10 w-full min-w-0 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
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
                    <label className="grid min-w-0 gap-1 text-xs text-[#68738a]">
                      <span>Book or author</span>
                      <input
                        className="h-10 w-full min-w-0 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
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
                    <label className="grid min-w-0 gap-1 text-xs text-[#68738a]">
                      <span>Archive</span>
                      <select
                        className="h-10 w-full min-w-0 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
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
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#263a67] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={loadState === "loading"}
                    >
                      <Search size={16} aria-hidden="true" />
                      Search
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#dde2ee] px-4 text-sm text-[#263a67] disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={loadState === "loading"}
                    >
                      <Filter size={16} aria-hidden="true" />
                      Filter
                    </button>
                    <button
                      className="h-10 rounded-xl border border-[#dde2ee] px-4 text-sm text-[#263a67] disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={handleRecallReset}
                      disabled={!hasRecallFilters || loadState === "loading"}
                    >
                      Reset
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="divide-y divide-[#dde2ee]">
                {session.isPending ? (
                  <div className="px-5 py-10 text-sm text-[#68738a]">
                    Restoring your session...
                  </div>
                ) : !isAuthenticated ? (
                  <div className="px-5 py-10 text-sm text-[#68738a]">
                    Sign in to begin building your mind.
                  </div>
                ) : loadState === "loading" ? (
                  <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-[#68738a]">
                    <RefreshCw className="animate-spin" size={17} aria-hidden="true" />
                    Loading thoughts...
                  </div>
                ) : recallTotal === 0 ? (
                  <div className="px-5 py-10 text-sm text-[#68738a]">
                    {hasRecallFilters ? "No thoughts match these filters." : "No thoughts saved yet."}
                  </div>
                ) : thoughts.length === 0 ? (
                  <div className="px-5 py-10 text-sm text-[#68738a]">
                    No thoughts on this page.
                  </div>
                ) : (
                  thoughts.map((thought) => (
                    <article key={thought.id} className="px-5 py-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[#eef0fa] px-2 py-1 text-xs font-medium text-[#263a67]">
                          {thought.thought_type}
                        </span>
                        {thought.use_with_ask_my_mind ? (
                          <span className="rounded bg-[#eef0fa] px-2 py-1 text-xs font-medium text-[#6f7fd8]">
                            Ask enabled
                          </span>
                        ) : null}
                        <span className="text-xs text-[#68738a]">
                          {formatDate(thought.created_at)}
                        </span>
                      </div>
                      {thought.title ? (
                        <h3 className="mb-1 text-sm font-semibold text-[#172033]">
                          {thought.title}
                        </h3>
                      ) : null}
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#172033]">
                        {thought.body}
                      </p>
                      {thought.manual_tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {thought.manual_tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded border border-[#dde2ee] px-2 py-1 text-xs text-[#68738a]"
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
                <div className="flex flex-col gap-3 border-t border-[#dde2ee] px-5 py-3 text-xs text-[#68738a] sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {recallTotal} {recallTotal === 1 ? "thought" : "thoughts"}
                  </span>
                  {recallTotalPages > 1 ? (
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#dde2ee] text-[#263a67] disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#dde2ee] text-[#263a67] disabled:cursor-not-allowed disabled:opacity-40"
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
              className="scroll-mt-6 rounded-2xl border border-[#dde2ee] bg-white p-5"
            >
              <h2 className="text-base font-semibold text-[#172033]">Save a thought</h2>
              <form className="mt-4 grid gap-4" onSubmit={handleCreateThought}>
                <label className="grid gap-2 text-sm text-[#263a67]">
                  Title
                  <input
                    className="h-11 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 outline-none focus:border-[#263a67]"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label className="grid gap-2 text-sm text-[#263a67]">
                  Thought
                  <textarea
                    className="min-h-44 resize-none rounded-xl border border-[#dde2ee] bg-[#f6f8fc] p-3 leading-6 outline-none focus:border-[#263a67]"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm text-[#263a67]">
                  Type
                  <select
                    className="h-11 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 outline-none focus:border-[#263a67]"
                    value={thoughtType}
                    onChange={(event) => setThoughtType(event.target.value)}
                  >
                    <option value="thought">Thought</option>
                    <option value="journal">Journal</option>
                    <option value="quote">Quote</option>
                    <option value="book_excerpt">Book excerpt</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-[#263a67]">
                  Tags
                  <input
                    className="h-11 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 outline-none focus:border-[#263a67]"
                    value={manualTags}
                    onChange={(event) => setManualTags(event.target.value)}
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] p-3 text-sm text-[#263a67]">
                  <span>Use with Ask My Mind</span>
                  <input
                    className="h-5 w-5 accent-[#263a67]"
                    type="checkbox"
                    checked={useWithAsk}
                    onChange={(event) => setUseWithAsk(event.target.checked)}
                  />
                </label>

                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#172033] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-[#9ca6ba]"
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
