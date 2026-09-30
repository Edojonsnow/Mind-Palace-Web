"use client";

import { LockKeyhole, LogOut, UserRound } from "lucide-react";
import { ThemeToggle, ValidatedForm, Skeleton } from "./ui";
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
  getThought,
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
  Profile,
  getProfile,
} from "@/lib/api";
import { authClient, getJWTToken } from "@/lib/auth-client";
import {
  DEFAULT_RECALL_FILTERS,
  hasRecallFilterValues,
  isExportExpired,
  recallQuery,
  splitTags,
  type LabelFilterKey,
  type LoadState,
  type RecallFilters,
  type RememberCategoryData,
  type WorkspaceMode,
} from "@/components/mind-palace-shell-helpers";
import { MindMapHome } from "@/components/mind-map-home";
import homeStyles from "@/components/mind-map-home.module.css";
import { AskMyMindWorkspace } from "@/components/ask-my-mind-workspace";
import { ThoughtCaptureModal } from "@/components/thought-capture-modal";
import { TrustControlsPanel } from "@/components/trust-controls-panel";
import { BooksWorkspace } from "@/components/books-workspace";
import { ReminisceWorkspace } from "@/components/reminisce-workspace";
import { ThoughtEditForm } from "@/components/thought-edit-form";
import { ThoughtPreviewPanel } from "@/components/thought-preview-panel";
import { ProfileWorkspace } from "@/components/profile-workspace";

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
  const [authMode, setAuthMode] = useState<
    "sign-in" | "sign-up" | "confirm" | "forgot-password" | "reset-password"
  >("sign-in");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [recallFilters, setRecallFilters] = useState<RecallFilters>(DEFAULT_RECALL_FILTERS);
  const [recallDraftFilters, setRecallDraftFilters] =
    useState<RecallFilters>(DEFAULT_RECALL_FILTERS);
  const [recallPage, setRecallPage] = useState(1);
  const [recallTotal, setRecallTotal] = useState(0);
  const [recallTotalPages, setRecallTotalPages] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);
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
  const [isThoughtPreviewOpen, setIsThoughtPreviewOpen] = useState(false);
  const [previewThought, setPreviewThought] = useState<Thought | null>(null);
  const [isPreviewThoughtLoading, setIsPreviewThoughtLoading] = useState(false);
  const [previewThoughtError, setPreviewThoughtError] = useState("");
  const sessionUserId = session.data?.user?.id;
  const refreshSequence = useRef(0);
  const askSubmissionLock = useRef(false);
  const isAuthenticated = Boolean(session.data?.user) && authMode === "sign-in";

  const hasSavedThoughts = libraryTotal > 0 || thoughts.length > 0;
  const hasProcessingThoughts = thoughts.some(
    (thought) =>
      thought.use_with_ask_my_mind &&
      (thought.ai_processing_status === "pending" || thought.ai_processing_status === "processing"),
  );
  const showAskAction = loadState !== "ready" || hasSavedThoughts;
  const hasRecallFilters = useMemo(
    () => hasRecallFilterValues(recallFilters) || hasRecallFilterValues(recallDraftFilters),
    [recallDraftFilters, recallFilters],
  );

  const refresh = useCallback(
    async (
      pageOverride: number,
      filtersOverride: RecallFilters,
      includeSettings = false,
      tokenOverride?: string,
    ) => {
      const requestSequence = refreshSequence.current + 1;
      refreshSequence.current = requestSequence;
      const isLibraryRequest = !hasRecallFilterValues(filtersOverride);
      setLoadState("loading");
      const nextToken = tokenOverride ?? (await getApiToken());
      if (!nextToken) {
        setLoadState("idle");
        return;
      }

      if (!tokenOverride) {
        setMessage("");
      }

      try {
        const [nextThoughts, nextSettings] = await Promise.all([
          listThoughts(nextToken, recallQuery(filtersOverride, pageOverride)),
          includeSettings ? getSettings(nextToken) : Promise.resolve(null),
        ]);
        if (requestSequence !== refreshSequence.current) {
          return;
        }
        setThoughts(nextThoughts.items);
        if (isLibraryRequest) {
          setLibraryTotal(nextThoughts.total);
        }
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

  const loadProfile = useCallback(async (signal: AbortSignal) => {
    try {
      const token = await getApiToken();
      if (!token || signal.aborted) return;
      const nextProfile = await getProfile(token, signal);
      if (!signal.aborted) setProfile(nextProfile);
    }
    catch { /* Profile loading must not block the library. The workspace offers retry. */ }
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
    const profileController = new AbortController();
    const refreshId = window.setTimeout(() => {
      void refresh(1, DEFAULT_RECALL_FILTERS, true);
      void loadTrustControls();
      void loadRemember();
      void loadBooks();
      void loadProfile(profileController.signal);
    }, 0);
    return () => {
      window.clearTimeout(refreshId);
      profileController.abort();
    };
  }, [authMode, loadBooks, loadProfile, loadRemember, loadTrustControls, refresh, session.isPending, sessionUserId]);

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

  useEffect(() => {
    if (!isAuthenticated || !hasProcessingThoughts) {
      return;
    }

    const pollId = window.setInterval(() => {
      void refresh(recallPage, recallFilters);
      void loadRemember();
    }, 2500);
    return () => window.clearInterval(pollId);
  }, [hasProcessingThoughts, isAuthenticated, loadRemember, recallFilters, recallPage, refresh]);

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

      if (authMode === "forgot-password") {
        const result = await authClient.emailOtp.requestPasswordReset({ email: authEmail });

        if (result.error) {
          setAuthMessage(result.error.message ?? "Unable to send the reset code.");
          return;
        }

        setVerificationCode("");
        setAuthMode("reset-password");
        setAuthMessage(`We sent a password reset code to ${authEmail}.`);
        return;
      }

      if (authMode === "reset-password") {
        const result = await authClient.emailOtp.resetPassword({
          email: authEmail,
          otp: verificationCode,
          password: authPassword,
        });

        if (result.error) {
          setAuthMessage(result.error.message ?? "Unable to reset your password.");
          return;
        }

        setAuthPassword("");
        setVerificationCode("");
        setAuthMode("sign-in");
        setAuthMessage("Password updated. Sign in again.");
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
    setProfile(null);
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
    setLibraryTotal(0);
    setMessage("");
  }

  async function handleProfilePasswordReset() {
    const email = session.data?.user?.email;
    if (!email) throw new Error("No email address is available for password recovery.");
    const result = await authClient.emailOtp.requestPasswordReset({ email });
    if (result.error) throw new Error(result.error.message ?? "Unable to send the reset code.");
    await handleSignOut();
    setAuthEmail(email);
    setAuthPassword("");
    setVerificationCode("");
    setAuthMode("reset-password");
    setAuthMessage("Check your email for the password reset code.");
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
      await refresh(recallPage, recallFilters, false, token);
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
    setIsCaptureOpen(false);

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
      setBody("");
      setTitle("");
      setManualTags("");
      setSelectedBookId("");
      setNewBookTitle("");
      setNewBookAuthor("");
      setUseWithAsk(settings?.default_use_with_ask_my_mind ?? false);
      setMessage("Thought saved.");
      void refresh(recallPage, recallFilters, false, token);
      void loadRemember();
    } catch (error) {
      setIsCaptureOpen(true);
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
    setThoughts([]);
    cancelEditingThought();
    setRecallFilters(recallDraftFilters);
    setRecallPage(1);
    void refresh(1, recallDraftFilters);
  }

  function openLibrary() {
    setSelectedRememberCategory(null);
    setWorkspaceMode("hub");
    void refresh(recallPage, recallFilters);
  }

  function clearSearchQuery() {
    setThoughts([]);
    const nextFilters = { ...recallFilters, q: "" };
    setRecallDraftFilters((current) => ({ ...current, q: "" }));
    setRecallFilters(nextFilters);
    setRecallPage(1);
    cancelEditingThought();
    void refresh(1, nextFilters);
  }

  function handleLabelClick(label: { filterKey: LabelFilterKey; value: string }) {
    setThoughts([]);
    const nextFilters = {
      ...DEFAULT_RECALL_FILTERS,
      [label.filterKey]: label.value,
    };
    cancelEditingThought();
    setRecallDraftFilters(nextFilters);
    setRecallFilters(nextFilters);
    setRecallPage(1);
    setWorkspaceMode("hub");
    void refresh(1, nextFilters);
  }

  function handleRememberCategoryItemClick(
    categoryKey: RememberCategoryData["key"],
    value: string,
  ) {
    const filterKeyByCategory: Record<RememberCategoryData["key"], LabelFilterKey> = {
      tags: "tag",
      books: "book",
    };
    handleLabelClick({
      value,
      filterKey: filterKeyByCategory[categoryKey],
    });
  }

  function handleRecallReset() {
    setThoughts([]);
    cancelEditingThought();
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
    setThoughts([]);
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

  async function handleOpenCitedThought(source: AskSource) {
    setIsThoughtPreviewOpen(true);
    setPreviewThought(null);
    setPreviewThoughtError("");
    setIsPreviewThoughtLoading(true);

    const token = await getApiToken();
    if (!token) {
      setPreviewThoughtError("Your session has expired. Sign in again to view this thought.");
      setIsPreviewThoughtLoading(false);
      return;
    }

    try {
      setPreviewThought(await getThought(token, source.thought_id));
    } catch (error) {
      setPreviewThoughtError(error instanceof Error ? error.message : "Unable to open this thought.");
    } finally {
      setIsPreviewThoughtLoading(false);
    }
  }

  if (!hasMounted) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--mp-surface)] px-4 text-[var(--mp-text)]">
        <p className="text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text-3)]">
          Restoring your private space…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-[var(--mp-text)]">
      <div className="flex min-h-screen w-full flex-col">
        {isAuthenticated ? (
          <section className={workspaceMode === "hub" ? homeStyles.shell : homeStyles.workspaceShell}>
            {workspaceMode === "hub" ? <div className={homeStyles.brand}><div className="mp-wordmark">mind palace</div><span>A place for what stays with you.</span></div> : null}
            <div className={homeStyles.utilities}>
              <ThemeToggle />
              <button className="mp-button mp-button-secondary" type="button" aria-label="Profile" title="Profile" onClick={() => setWorkspaceMode("profile")}>
                <UserRound size={16} aria-hidden="true" /><span className={homeStyles.utilityLabel}>Profile</span>
              </button>
              <button
                className="mp-button mp-button-secondary"
                type="button"
                aria-label="Privacy & data"
                title="Privacy & data"
                onClick={() => setIsTrustControlsOpen(true)}
              >
                <LockKeyhole size={16} aria-hidden="true" /><span className={homeStyles.utilityLabel}>Privacy &amp; data</span>
              </button>
              <button
                className="mp-button mp-button-ghost"
                type="button"
                aria-label="Sign out"
                title="Sign out"
                onClick={() => void handleSignOut()}
              >
                <LogOut size={18} className={homeStyles.signOutIcon} aria-hidden="true" /><span className={homeStyles.utilityLabel}>Sign out</span>
              </button>
            </div>

            {message ? (
              <div className="mp-toast" role="status" aria-live="polite">
                <div>
                  {message}
                </div>
              </div>
            ) : null}

            {workspaceMode !== "hub" ? (
              <button
                className={`${homeStyles.back} mp-button mp-button-ghost`}
                type="button"
                onClick={openLibrary}
              >
                ← Return to my mind
              </button>
            ) : null}

            <div className={workspaceMode === "hub" ? homeStyles.content : "relative z-10 mx-auto w-full max-w-6xl py-4"}>
              {workspaceMode === "hub" ? (
                <MindMapHome
                  name={profile?.display_name ?? session.data?.user?.name ?? ""}
                  thoughts={thoughts}
                  total={recallTotal}
                  page={recallPage}
                  totalPages={recallTotalPages}
                  loadState={loadState}
                  draftFilters={recallDraftFilters}
                  activeFilters={recallFilters}
                  hasFilters={hasRecallFilters}
                  onDraftFiltersChange={setRecallDraftFilters}
                  onSearchSubmit={handleRecallSubmit}
                  onClearQuery={clearSearchQuery}
                  onResetFilters={handleRecallReset}
                  onPageChange={handleRecallPageChange}
                  showAskAction={showAskAction}
                  onSaveThought={() => setIsCaptureOpen(true)}
                  onAskMind={() => setWorkspaceMode("ask")}
                  onReminisce={revealReminisce}
                  onBooks={() => setWorkspaceMode("books")}
                  onOpenThought={(thought) => {
                    setPreviewThought(thought);
                    setPreviewThoughtError("");
                    setIsPreviewThoughtLoading(false);
                    setIsThoughtPreviewOpen(true);
                  }}
                  onEditThought={startEditingThought}
                  isUpdating={isUpdating}
                  organizingThoughtId={organizingThoughtId}
                  onOrganizeThought={(thoughtId) => void handleOrganizeThought(thoughtId)}
                  onTagSelect={(tag) => handleLabelClick({ value: tag, filterKey: "tag" })}
                  onRefresh={() => void refresh(recallPage, recallFilters)}
                  editingThoughtId={editingThoughtId}
                  editor={editingThoughtId ? (
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
                      onSubmit={(event) => { if (editingThoughtId) void handleUpdateThought(event, editingThoughtId); }}
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
                  ) : null}
                />
              ) : workspaceMode === "profile" ? (
                <ProfileWorkspace
                  key={sessionUserId}
                  fallbackName={session.data?.user?.name ?? ""}
                  fallbackEmail={session.data?.user?.email ?? ""}
                  sessionToken={session.data?.session?.token}
                  sessionExpiresAt={session.data?.session?.expiresAt?.toString()}
                  onProfileUpdated={setProfile}
                  onPrivacy={() => setIsTrustControlsOpen(true)}
                  onSignOut={() => void handleSignOut()}
                  onPasswordReset={handleProfilePasswordReset}
                />
              ) : workspaceMode === "books" ? (
                <BooksWorkspace
                  books={books}
                  onBookSelect={(bookId) => {
                    setThoughts([]);
                    cancelEditingThought();
                    const nextFilters = { ...DEFAULT_RECALL_FILTERS, book_id: bookId };
                    setRecallDraftFilters(nextFilters);
                    setRecallFilters(nextFilters);
                    setRecallPage(1);
                    setWorkspaceMode("hub");
                    void refresh(1, nextFilters);
                  }}
                />
              ) : workspaceMode === "ask" ? (
                <AskMyMindWorkspace
                  messages={chatMessages}
                  question={question}
                  isAsking={isAsking}
                  errorMessage={askMessage}
                  sources={latestSources}
                  onQuestionChange={setQuestion}
                  onSubmit={handleAsk}
                  onSourceOpen={(source) => void handleOpenCitedThought(source)}
                />
              ) : workspaceMode === "organizing" ? (
                <div className="mind-workspace-enter text-center">
                  <Skeleton label="Rearranging the view" />
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

        {isThoughtPreviewOpen && isAuthenticated ? (
          <ThoughtPreviewPanel
            thought={previewThought}
            isLoading={isPreviewThoughtLoading}
            errorMessage={previewThoughtError}
            onClose={() => setIsThoughtPreviewOpen(false)}
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
          className={`mp-auth mx-auto w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8 ${isAuthenticated ? "hidden" : "grid place-items-center"}`}
        >
          <aside className={`flex w-full flex-col gap-4 ${isAuthenticated ? "" : "max-w-md"}`}>
            {session.isPending ? <section className="rounded-[30px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-8 shadow-e1">
              <div className="text-center text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text-3)]">Restoring your private space…</div>
            </section> : !isAuthenticated ? <section className="mp-auth-card">
              <div className="mb-8 flex items-center justify-between gap-4"><span className="mp-wordmark">mind palace</span><ThemeToggle /></div>
              <h1 className="mt-4 font-display text-4xl font-medium tracking-normal text-[var(--mp-text)]">
                {authMode === "sign-in"
                  ? "Return to your mind."
                  : authMode === "sign-up"
                    ? "Begin reminiscing."
                    : authMode === "confirm"
                      ? "Confirm it is you."
                      : authMode === "forgot-password"
                        ? "Reset your password."
                        : "Choose a new password."}
              </h1>
              <p className="mb-7 mt-3 text-sm leading-6 text-[var(--mp-text-3)]">
                {authMode === "forgot-password" || authMode === "reset-password"
                  ? "We will help you get back into your private space."
                  : "Your thoughts stay private and your AI controls remain yours."}
              </p>
              <ValidatedForm className="space-y-3" onSubmit={handleAuth}>
                {authMode === "confirm" ? <>
                  <p className="text-sm leading-5 text-[var(--mp-text-3)]">
                    Enter the six-digit code sent to {authEmail}.
                  </p>
                  <input
                    className="modern-control w-full text-center text-lg tracking-normal"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    aria-label="Confirmation code"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    minLength={6}
                    maxLength={6}
                    required
                  />
                </> : authMode === "reset-password" ? <>
                  <p className="text-sm leading-5 text-[var(--mp-text-3)]">
                    Enter the six-digit code sent to {authEmail}, then choose a new password.
                  </p>
                  <input
                    className="modern-control w-full text-center text-lg tracking-normal"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    aria-label="Reset code"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    minLength={6}
                    maxLength={6}
                    required
                  />
                </> : authMode === "sign-up" ? <input
                  className="modern-control w-full"
                  placeholder="Name"
                  aria-label="Name"
                  autoComplete="name"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  required
                /> : null}
                {authMode !== "confirm" && authMode !== "reset-password" ? <input
                  className="modern-control w-full"
                  type="email"
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  required
                /> : null}
                {authMode === "sign-up" || authMode === "sign-in" ? <input
                  className="modern-control w-full"
                  type="password"
                  placeholder="Password"
                  aria-label="Password"
                  autoComplete={authMode === "sign-up" ? "new-password" : "current-password"}
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  minLength={8}
                  required
                /> : null}
                {authMode === "reset-password" ? <input
                  className="modern-control w-full"
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  aria-label="New password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  minLength={8}
                  required
                /> : null}
                <button
                  className="mp-button mp-button-primary mt-2 w-full"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating
                    ? "Working..."
                    : authMode === "confirm"
                      ? "Confirm email"
                      : authMode === "forgot-password"
                        ? "Send reset code"
                        : authMode === "reset-password"
                          ? "Update password"
                      : authMode === "sign-in"
                        ? "Sign in"
                        : "Create account"}
                </button>
              </ValidatedForm>
              <p className="mp-trust-line"><LockKeyhole size={16} aria-hidden="true" />Your thoughts belong to you.</p>
              {authMessage ? <p className="mt-4 text-xs leading-5 text-[var(--mp-text-3)]">{authMessage}</p> : null}
              {authMode === "confirm" ? <button
                type="button"
                className="mt-4 text-left text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-lumen-text)] disabled:opacity-50"
                onClick={() => void handleResendVerificationCode()}
                disabled={isResendingCode}
              >
                {isResendingCode ? "Sending..." : "Resend confirmation code"}
              </button> : null}
              {authMode === "reset-password" ? <button
                type="button"
                className="mt-4 text-left text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-lumen-text)]"
                onClick={() => {
                  setAuthMode("forgot-password");
                  setVerificationCode("");
                  setAuthPassword("");
                  setAuthMessage("");
                }}
              >
                Request a new reset code
              </button> : null}
              {authMode === "confirm" ? <button
                type="button"
                className="mt-4 text-left text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-lumen-text)]"
                onClick={() => {
                  setAuthMode("sign-up");
                  setVerificationCode("");
                  setAuthMessage("");
                }}
              >
                Use a different email
              </button> : authMode === "reset-password" ? <button
                type="button"
                className="mt-4 text-left text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-lumen-text)]"
                onClick={() => {
                  setAuthMode("sign-in");
                  setVerificationCode("");
                  setAuthPassword("");
                  setAuthMessage("");
                }}
              >
                Return to sign in
              </button> : authMode === "forgot-password" ? <button
                type="button"
                className="mt-4 text-left text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-lumen-text)]"
                onClick={() => {
                  setAuthMode("sign-in");
                  setAuthMessage("");
                }}
              >
                Return to sign in
              </button> : <button
                className="mt-4 text-left text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-lumen-text)]"
                onClick={() => {
                  setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
                  setAuthMessage("");
                }}
              >
                {authMode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>}
              {authMode === "sign-in" ? <button
                type="button"
                className="mt-3 block text-left text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-lumen-text)]"
                onClick={() => {
                  setAuthMode("forgot-password");
                  setAuthPassword("");
                  setAuthMessage("");
                }}
              >
                Forgot password?
              </button> : null}
            </section> : null}

          </aside>

        </section>
      </div>
    </main>
  );
}
