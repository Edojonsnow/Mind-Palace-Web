"use client";

import { Pencil } from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  AskMessage,
  AskSource,
  askMyMind,
  AccountDeletionRequest,
  Book,
  cancelAccountDeletion,
  createBook,
  createThought,
  getSettings,
  getRememberOverview,
  createExportRequest,
  downloadExport,
  ExportRequest,
  getAccountDeletionRequest,
  getExportRequest,
  listDeletedThoughts,
  listBooks,
  listThoughts,
  organizeThought,
  Thought,
  ThoughtType,
  requestAccountDeletion,
  restoreThought,
  updateSettings,
  updateThought,
  UserSettings,
  RememberOverview,
} from "@/lib/api";
import { authClient, getJWTToken } from "@/lib/auth-client";
import {
  CompactLabelList,
  DEFAULT_RECALL_FILTERS,
  formatDate,
  generatedMetadataLabels,
  isExportExpired,
  manualThoughtLabels,
  recallQuery,
  splitTags,
  type LabelFilterKey,
  type LoadState,
  type RecallFilters,
  type RememberCategoryData,
  type ThoughtLabel,
  type WorkspaceMode,
} from "@/components/mind-palace-shell-helpers";
import { MindMapHome } from "@/components/mind-map-home";
import { RecallSearchPanel } from "@/components/recall-search-panel";
import { AskMyMindWorkspace } from "@/components/ask-my-mind-workspace";
import { ThoughtCaptureModal } from "@/components/thought-capture-modal";
import { TrustControlsPanel } from "@/components/trust-controls-panel";
import { BooksWorkspace } from "@/components/books-workspace";
import { ReminisceWorkspace } from "@/components/reminisce-workspace";
import { ThoughtEditForm } from "@/components/thought-edit-form";

async function getApiToken(): Promise<string | null> {
  return getJWTToken();
}

function subscribeToHydration(): () => void {
  return () => {};
}

export function MindPalaceShell() {
  const session = authClient.useSession();
  const hasMounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
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
  const [books, setBooks] = useState<Book[]>([]);
  const [rememberOverview, setRememberOverview] = useState<RememberOverview | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("hub");
  const [selectedRememberCategory, setSelectedRememberCategory] =
    useState<RememberCategoryData["key"] | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
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
  const [organizingThoughtId, setOrganizingThoughtId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [manualTags, setManualTags] = useState("");
  const [thoughtType, setThoughtType] = useState<ThoughtType>("thought");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [useWithAsk, setUseWithAsk] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editThoughtType, setEditThoughtType] = useState<ThoughtType>("thought");
  const [editBookId, setEditBookId] = useState("");
  const [editBookTitle, setEditBookTitle] = useState("");
  const [editBookAuthor, setEditBookAuthor] = useState("");
  const [editManualTags, setEditManualTags] = useState("");
  const [editUseWithAsk, setEditUseWithAsk] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<AskMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [latestSources, setLatestSources] = useState<AskSource[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [askMessage, setAskMessage] = useState("");
  const sessionUserId = session.data?.user?.id;
  const refreshSequence = useRef(0);
  const askSubmissionLock = useRef(false);
  const isAuthenticated = Boolean(session.data?.user) && authMode === "sign-in";

  const hasSavedThoughts = recallTotal > 0 || thoughts.length > 0;
  const showAskAction = loadState !== "ready" || hasSavedThoughts;
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

  const loadBooks = useCallback(async () => {
    const token = await getApiToken();
    if (!token) {
      setBooks([]);
      return;
    }

    try {
      setBooks(await listBooks(token));
    } catch {
      setBooks([]);
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
      void loadBooks();
    }, 0);
    return () => window.clearTimeout(refreshId);
  }, [authMode, loadBooks, loadRemember, loadTrustControls, refresh, session.isPending, sessionUserId]);

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
    setBooks([]);
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

  function revealReminisce() {
    if (workspaceMode === "organizing") {
      return;
    }
    if (workspaceMode === "reminisce") {
      setSelectedRememberCategory(null);
      setWorkspaceMode("hub");
      return;
    }

    setSelectedRememberCategory(null);
    setWorkspaceMode("organizing");
    window.setTimeout(() => setWorkspaceMode("reminisce"), 520);
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
      let bookId = selectedBookId && selectedBookId !== "__new__" ? selectedBookId : undefined;
      if (thoughtType === "book_excerpt" && selectedBookId === "__new__") {
        const book = await createBook(token, {
          title: newBookTitle.trim(),
          author: newBookAuthor.trim(),
        });
        bookId = book.id;
        setBooks((current) => [...current.filter((item) => item.id !== book.id), book]);
      }
      await createThought(token, {
        title: title.trim() || undefined,
        body: body.trim(),
        thought_type: thoughtType,
        book_id: thoughtType === "book_excerpt" ? bookId : undefined,
        book_title: thoughtType === "book_excerpt" && selectedBookId === "__new__" ? newBookTitle.trim() : undefined,
        book_author: thoughtType === "book_excerpt" && selectedBookId === "__new__" ? newBookAuthor.trim() : undefined,
        manual_tags: splitTags(manualTags),
        use_with_ask_my_mind: useWithAsk,
      });
      await refresh(recallPage, recallFilters);
      void loadRemember();
      setBody("");
      setTitle("");
      setManualTags("");
      setSelectedBookId("");
      setNewBookTitle("");
      setNewBookAuthor("");
      setUseWithAsk(settings?.default_use_with_ask_my_mind ?? false);
      setMessage("Thought saved.");
      setIsCaptureOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save thought.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditingThought(thought: Thought) {
    setEditingThoughtId(thought.id);
    setEditTitle(thought.title ?? "");
    setEditBody(thought.body);
    setEditThoughtType(thought.thought_type);
    setEditBookId(thought.book_id ?? (thought.book_title || thought.book_author ? "__new__" : ""));
    setEditBookTitle(thought.book_title ?? "");
    setEditBookAuthor(thought.book_author ?? "");
    setEditManualTags(thought.manual_tags.join(", "));
    setEditUseWithAsk(thought.use_with_ask_my_mind);
    setMessage("");
  }

  function editThoughtFromSearch(thought: Thought) {
    startEditingThought(thought);
  }

  function cancelEditingThought() {
    setEditingThoughtId(null);
    setEditTitle("");
    setEditBody("");
    setEditManualTags("");
    setEditThoughtType("thought");
    setEditBookId("");
    setEditBookTitle("");
    setEditBookAuthor("");
    setEditUseWithAsk(false);
  }

  async function handleUpdateThought(event: FormEvent<HTMLFormElement>, thoughtId: string) {
    event.preventDefault();
    if (isUpdating || !editBody.trim()) {
      return;
    }

    const token = await getApiToken();
    if (!token) {
      return;
    }

    setIsUpdating(true);
    setMessage("");
    try {
      const updatedThought = await updateThought(token, thoughtId, {
        title: editTitle.trim() || null,
        body: editBody.trim(),
        thought_type: editThoughtType,
        book_id: editThoughtType === "book_excerpt" && editBookId !== "__new__" ? editBookId || null : null,
        book_title: editThoughtType === "book_excerpt" && editBookId === "__new__" ? editBookTitle.trim() : null,
        book_author: editThoughtType === "book_excerpt" && editBookId === "__new__" ? editBookAuthor.trim() : null,
        manual_tags: splitTags(editManualTags),
        use_with_ask_my_mind: editUseWithAsk,
      });
      await refresh(recallPage, recallFilters);
      void loadRemember();
      cancelEditingThought();
      setMessage(
        updatedThought.ai_processing_status === "pending"
          ? "Thought updated. Organization is processing."
          : "Thought updated.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update thought.");
    } finally {
      setIsUpdating(false);
    }
  }

  function handleRecallSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecallFilters(recallDraftFilters);
    setRecallPage(1);
    void refresh(1, recallDraftFilters);
  }

  function handleLabelClick(label: ThoughtLabel) {
    const nextFilters = {
      ...DEFAULT_RECALL_FILTERS,
      [label.filterKey]: label.value,
    };
    setRecallDraftFilters(nextFilters);
    setRecallFilters(nextFilters);
    setRecallPage(1);
    setWorkspaceMode("search");
    void refresh(1, nextFilters);
  }

  function handleRememberCategoryItemClick(
    categoryKey: RememberCategoryData["key"],
    value: string,
  ) {
    const filterKeyByCategory: Record<RememberCategoryData["key"], LabelFilterKey> = {
      themes: "theme",
      emotions: "emotion",
      people: "person",
      books: "book",
    };
    const labelByCategory: Record<RememberCategoryData["key"], string> = {
      themes: "Theme",
      emotions: "Emotion",
      people: "Person",
      books: "Book",
    };
    handleLabelClick({
      label: `${labelByCategory[categoryKey]}: ${value}`,
      value,
      filterKey: filterKeyByCategory[categoryKey],
    });
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

  async function handleOrganizeThought(thoughtId: string) {
    const token = await getApiToken();
    if (!token || organizingThoughtId) {
      return;
    }

    setOrganizingThoughtId(thoughtId);
    setMessage("");
    try {
      await organizeThought(token, thoughtId);
      await refresh(recallPage, recallFilters);
      void loadRemember();
      setMessage("Organization restarted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to organize thought.");
    } finally {
      setOrganizingThoughtId(null);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking || askSubmissionLock.current) {
      return;
    }

    askSubmissionLock.current = true;
    setIsAsking(true);

    const token = await getApiToken();
    if (!token) {
      askSubmissionLock.current = false;
      setIsAsking(false);
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
      askSubmissionLock.current = false;
      setIsAsking(false);
    }
  }

  if (!hasMounted) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f6f8fc] px-4 text-[#172033]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d828b]">
          Restoring your private space…
        </p>
      </main>
    );
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
                onClick={() => {
                  setSelectedRememberCategory(null);
                  setWorkspaceMode("hub");
                }}
              >
                ← Return to my mind
              </button>
            ) : null}

            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center py-10 sm:py-12">
              {workspaceMode === "hub" ? (
                <MindMapHome
                  showAskAction={showAskAction}
                  onSaveThought={() => setIsCaptureOpen(true)}
                  onAskMind={() => setWorkspaceMode("ask")}
                  onSearchThoughts={() => setWorkspaceMode("search")}
                  onReminisce={revealReminisce}
                />
              ) : workspaceMode === "books" ? (
                <BooksWorkspace
                  books={books}
                  onBookSelect={(bookId) => {
                    const nextFilters = { ...DEFAULT_RECALL_FILTERS, book_id: bookId };
                    setRecallDraftFilters(nextFilters);
                    setRecallFilters(nextFilters);
                    setRecallPage(1);
                    setWorkspaceMode("search");
                    void refresh(1, nextFilters);
                  }}
                />
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
                      <RecallSearchPanel
                        draftFilters={recallDraftFilters}
                        activeFilters={recallFilters}
                        hasFilters={hasRecallFilters}
                        onDraftFiltersChange={setRecallDraftFilters}
                        onSubmit={handleRecallSubmit}
                        onReset={handleRecallReset}
                      />

                      <div className="mt-7 max-h-[36vh] overflow-y-auto border-t border-black/[0.07] pr-1">
                        {loadState === "loading" ? (
                          <p className="py-8 text-sm text-[#777c86]">Searching your memory…</p>
                        ) : thoughts.length === 0 ? (
                          <p className="py-8 text-sm text-[#777c86]">No thoughts match this view yet.</p>
                        ) : thoughts.map((thought, index) => (
                          <article key={thought.id} className="grid grid-cols-[32px_1fr] gap-3 border-b border-black/[0.06] py-4 last:border-0">
                            <span className="pt-0.5 text-[10px] font-semibold tracking-[0.12em] text-[#a1a5ae]">{String(index + 1).padStart(2, "0")}</span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#8b909a]"><span>{thought.thought_type}</span><span>·</span><span>{formatDate(thought.created_at)}</span>{thought.use_with_ask_my_mind && (thought.ai_processing_status === "pending" || thought.ai_processing_status === "processing") ? <><span>·</span><span className="text-[#9a7b3f]">Organizing...</span></> : null}</div>
                              {editingThoughtId === thought.id ? (
                                <ThoughtEditForm
                                  title={editTitle}
                                  body={editBody}
                                  thoughtType={editThoughtType}
                                  books={books}
                                  bookId={editBookId}
                                  bookTitle={editBookTitle}
                                  bookAuthor={editBookAuthor}
                                  manualTags={editManualTags}
                                  useWithAsk={editUseWithAsk}
                                  isUpdating={isUpdating}
                                  onSubmit={(event) => void handleUpdateThought(event, thought.id)}
                                  onTitleChange={setEditTitle}
                                  onBodyChange={setEditBody}
                                  onThoughtTypeChange={(nextType) => { setEditThoughtType(nextType); if (nextType !== "book_excerpt") setEditBookId(""); }}
                                  onBookIdChange={setEditBookId}
                                  onBookTitleChange={setEditBookTitle}
                                  onBookAuthorChange={setEditBookAuthor}
                                  onManualTagsChange={setEditManualTags}
                                  onUseWithAskChange={setEditUseWithAsk}
                                  onCancel={cancelEditingThought}
                                />
                              ) : (
                                <>
                                  <div className="mt-1 flex items-start justify-between gap-3">
                                    <h2 className="font-display text-base font-semibold text-[#24272d]">{thought.title || "Untitled thought"}</h2>
                                    <button
                                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#263a67] hover:bg-[#eef0fa] disabled:cursor-not-allowed disabled:opacity-40"
                                      type="button"
                                      aria-label="Edit thought"
                                      title="Edit thought"
                                      onClick={() => editThoughtFromSearch(thought)}
                                      disabled={isUpdating}
                                    >
                                      <Pencil size={15} aria-hidden="true" />
                                    </button>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#666b75]">{thought.body}</p>
                                  <CompactLabelList labels={generatedMetadataLabels(thought)} variant="ai" onLabelClick={handleLabelClick} />
                                  <CompactLabelList labels={manualThoughtLabels(thought)} variant="manual" maxVisible={4} onLabelClick={handleLabelClick} />
                                  {thought.ai_processing_status === "failed" && thought.use_with_ask_my_mind ? (
                                    <button
                                      className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b15b4d] disabled:opacity-50"
                                      type="button"
                                      onClick={() => void handleOrganizeThought(thought.id)}
                                      disabled={organizingThoughtId !== null}
                                    >
                                      {organizingThoughtId === thought.id ? "Retrying organization..." : "Retry organization"}
                                    </button>
                                  ) : null}
                                </>
                              )}
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
                <AskMyMindWorkspace
                  messages={chatMessages}
                  question={question}
                  isAsking={isAsking}
                  errorMessage={askMessage}
                  sources={latestSources}
                  onQuestionChange={setQuestion}
                  onSubmit={handleAsk}
                />
              ) : workspaceMode === "organizing" ? (
                <div className="mind-workspace-enter text-center">
                  <div className="mx-auto h-52 w-52 animate-pulse rounded-full bg-[radial-gradient(circle_at_34%_28%,#8fa0ff_0%,#5367c7_34%,#29345f_68%,#181b27_100%)] shadow-[0_35px_90px_rgba(32,42,89,0.34)]" />
                  <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#777c86]">Rearranging the view…</p>
                </div>
              ) : (
                <ReminisceWorkspace
                  overview={rememberOverview}
                  selectedCategory={selectedRememberCategory}
                  onSelectCategory={setSelectedRememberCategory}
                  onClearCategory={() => setSelectedRememberCategory(null)}
                  onCategoryItemClick={handleRememberCategoryItemClick}
                />
              )}
            </div>
          </section>
        ) : null}

        {isCaptureOpen && isAuthenticated ? (
          <ThoughtCaptureModal
            body={body}
            title={title}
            thoughtType={thoughtType}
            books={books}
            selectedBookId={selectedBookId}
            newBookTitle={newBookTitle}
            newBookAuthor={newBookAuthor}
            manualTags={manualTags}
            useWithAsk={useWithAsk}
            isSaving={isSaving}
            onClose={() => setIsCaptureOpen(false)}
            onSubmit={handleCreateThought}
            onBodyChange={setBody}
            onTitleChange={setTitle}
            onThoughtTypeChange={(nextType) => { setThoughtType(nextType); if (nextType !== "book_excerpt") setSelectedBookId(""); }}
            onBookChange={setSelectedBookId}
            onNewBookTitleChange={setNewBookTitle}
            onNewBookAuthorChange={setNewBookAuthor}
            onManualTagsChange={setManualTags}
            onUseWithAskChange={setUseWithAsk}
          />
        ) : null}

        {isTrustControlsOpen && isAuthenticated ? (
          <TrustControlsPanel
            settings={settings}
            deletedThoughts={deletedThoughts}
            exportRequest={exportRequest}
            accountDeletion={accountDeletion}
            lifecycleState={lifecycleState}
            lifecycleMessage={lifecycleMessage}
            restoringThoughtId={restoringThoughtId}
            isCreatingExport={isCreatingExport}
            isDownloadingExport={isDownloadingExport}
            isRequestingDeletion={isRequestingDeletion}
            isCancellingDeletion={isCancellingDeletion}
            onClose={() => setIsTrustControlsOpen(false)}
            onDefaultAskToggle={(value) => void handleDefaultAskToggle(value)}
            onRestoreThought={(thoughtId) => void handleRestoreThought(thoughtId)}
            onCreateExport={() => void handleCreateExport()}
            onDownloadExport={() => void handleDownloadExport()}
            onRequestDeletion={() => void handleRequestAccountDeletion()}
            onCancelDeletion={() => void handleCancelAccountDeletion()}
          />
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
                    ? "Begin reminiscing."
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

          </aside>

        </section>
      </div>
    </main>
  );
}
