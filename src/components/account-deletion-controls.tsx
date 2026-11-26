import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { ApiError, type AccountDeletionOptions, type AccountDeletionRequest } from "@/lib/api";
import { formatDate } from "./mind-palace-shell-helpers";

type Props = {
  request: AccountDeletionRequest | null;
  options: AccountDeletionOptions | null;
  disabled: boolean;
  isRequesting: boolean;
  isCancelling: boolean;
  isDeleting: boolean;
  onRequest: () => void;
  onCancel: () => void;
  onDelete: (confirmation: "DELETE MY ACCOUNT") => Promise<void>;
  onSignOut: () => void;
};

const button = "min-h-10 rounded-lg border border-[var(--mp-danger)] px-4 py-2 text-sm font-medium text-[var(--mp-danger)] disabled:cursor-not-allowed disabled:opacity-50";

export function AccountDeletionControls({ request, options, disabled, isRequesting, isCancelling,
  isDeleting, onRequest, onCancel, onDelete, onSignOut }: Props) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const submitting = useRef(false);
  const [openedAt] = useState(() => Date.now());
  const busy = disabled || isRequesting || isCancelling || isDeleting;
  const pending = request?.status === "pending";
  const started = pending && Date.parse(request.purge_at) <= openedAt;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || submitting.current || confirmation !== "DELETE MY ACCOUNT") return;
    submitting.current = true;
    setError("");
    setNeedsSignIn(false);
    try {
      await onDelete(confirmation);
    } catch (failure) {
      setNeedsSignIn(failure instanceof ApiError && failure.status === 403);
      setError(failure instanceof Error ? failure.message : "Deletion could not be completed. Try again.");
    } finally {
      submitting.current = false;
    }
  }

  return <section className="border-t border-[var(--mp-line)] pt-6" aria-labelledby="account-deletion-title">
    <h2 id="account-deletion-title" className="text-base font-semibold text-[var(--mp-text)]">Delete account</h2>
    {pending ? <>
      <p className="mt-2 text-sm leading-6 text-[var(--mp-text-2)]">{started
        ? "Permanent deletion is pending. It can no longer be cancelled."
        : `Permanent deletion is scheduled for ${formatDate(request.purge_at)}.`}</p>
      {!started ? <button className={`${button} mt-3`} type="button" onClick={onCancel} disabled={busy}>
        {isCancelling ? "Cancelling..." : "Cancel deletion"}
      </button> : null}
    </> : <>
      <p className="mt-2 text-sm leading-6 text-[var(--mp-text-2)]">Keep a {options?.recovery_window_days ?? 60}-day recovery window. You can cancel before it ends.</p>
      <button className={`${button} mt-3`} type="button" onClick={onRequest} disabled={busy}>
        {isRequesting ? "Requesting..." : "Request account deletion"}
      </button>
    </>}
    <div className="mt-6">
      {!isConfirming ? <>
        <button className="min-h-11 text-sm font-medium text-[var(--mp-danger)] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
          type="button" disabled={busy || !options?.permanent_deletion_available} onClick={() => setIsConfirming(true)}>
          Delete permanently now
        </button>
        {!options?.permanent_deletion_available ? <p className="mt-1 text-sm leading-6 text-[var(--mp-text-3)]">
          Immediate deletion is unavailable right now. Contact support or use the recovery-window option.
        </p> : null}
      </> : <form onSubmit={submit} aria-label="Permanent account deletion" aria-busy={isDeleting}>
        <h3 className="flex items-start gap-2 text-base font-semibold text-[var(--mp-danger)]">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" /> No recovery period
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--mp-text-2)]">Your account, thoughts, books, collections, conversations, and AI data will be permanently deleted. This cannot be undone. Download an export above first if you need a copy.</p>
        <label htmlFor="delete-account-confirmation" className="mt-4 block text-sm font-medium text-[var(--mp-text)]">Type DELETE MY ACCOUNT to confirm</label>
        <input id="delete-account-confirmation" className="mp-field mt-2 min-w-0"
          value={confirmation} onChange={event => setConfirmation(event.target.value)}
          autoComplete="off" spellCheck={false} maxLength={17} disabled={isDeleting}
          aria-describedby="delete-account-warning" autoFocus />
        <p id="delete-account-warning" className="mt-2 text-sm leading-6 text-[var(--mp-text-3)]">For your security, a recent sign-in is required.</p>
        {error ? <p className="mt-3 break-words text-sm leading-6 text-[var(--mp-danger)]" role="alert">{error}</p> : null}
        {needsSignIn ? <button className={`${button} mt-3`} type="button" onClick={onSignOut} disabled={isDeleting}>Sign out to sign in again</button> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button className={`${button} flex items-center justify-center gap-2`} type="submit" disabled={busy || confirmation !== "DELETE MY ACCOUNT"}>
            {isDeleting ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            {isDeleting ? "Deleting account..." : "Permanently delete account"}
          </button>
          <button className="min-h-11 rounded-lg px-3 text-sm text-[var(--mp-text-2)]" type="button" disabled={isDeleting}
            onClick={() => { setIsConfirming(false); setConfirmation(""); setError(""); setNeedsSignIn(false); }}>
            Keep my account
          </button>
        </div>
        {isDeleting ? <p className="mt-3 text-sm text-[var(--mp-text-2)]" role="status">Removing your account. Please keep this page open.</p> : null}
      </form>}
    </div>
  </section>;
}
