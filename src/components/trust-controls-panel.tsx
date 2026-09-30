import type { AccountDeletionRequest, ExportRequest, Thought, UserSettings } from "@/lib/api";
import { formatDate, formatStatus, isExportExpired, type LoadState } from "@/components/mind-palace-shell-helpers";
import { useModalFocus } from "./ui";

type TrustControlsPanelProps = {
  settings: UserSettings | null;
  deletedThoughts: Thought[];
  exportRequest: ExportRequest | null;
  accountDeletion: AccountDeletionRequest | null;
  lifecycleState: LoadState;
  lifecycleMessage: string;
  restoringThoughtId: string | null;
  isCreatingExport: boolean;
  isDownloadingExport: boolean;
  isRequestingDeletion: boolean;
  isCancellingDeletion: boolean;
  onClose: () => void;
  onDefaultAskToggle: (value: boolean) => void;
  onRestoreThought: (thoughtId: string) => void;
  onCreateExport: () => void;
  onDownloadExport: () => void;
  onRequestDeletion: () => void;
  onCancelDeletion: () => void;
};

export function TrustControlsPanel({
  settings, deletedThoughts, exportRequest, accountDeletion, lifecycleState, lifecycleMessage,
  restoringThoughtId, isCreatingExport, isDownloadingExport, isRequestingDeletion, isCancellingDeletion,
  onClose, onDefaultAskToggle, onRestoreThought, onCreateExport, onDownloadExport, onRequestDeletion, onCancelDeletion,
}: TrustControlsPanelProps) {
  const panel = useModalFocus(onClose);
  return (
    <div className="mp-overlay fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close privacy settings" onClick={onClose} />
      <section ref={panel} className="mp-settings capture-panel-enter relative z-10 h-full w-full max-w-xl overflow-y-auto bg-[var(--mp-surface)] p-6 shadow-e1 sm:p-9">
        <div className="flex items-start justify-between gap-6"><div><h1 id="privacy-title" className="mt-3 font-display text-4xl font-medium tracking-normal text-[var(--mp-text)]">Privacy &amp; data</h1></div><button className="h-10 rounded-full border border-[var(--mp-line)] px-4 text-[12px] font-semibold uppercase tracking-normal" type="button" onClick={onClose}>Close</button></div>
        <div className="mt-10 space-y-4">
          <section className="rounded-[24px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-5"><p className="text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text-3)]">AI participation</p><label className="mt-4 flex items-center justify-between gap-5 text-sm leading-6 text-[var(--mp-text-2)]"><span>Use new thoughts with Ask My Mind by default</span><input className="h-5 w-5 accent-[var(--mp-text)]" type="checkbox" checked={settings?.default_use_with_ask_my_mind ?? false} disabled={lifecycleState !== "ready"} onChange={(event) => onDefaultAskToggle(event.target.checked)} /></label></section>
          <section className="rounded-[24px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-5"><p className="text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text-3)]">Deleted thoughts</p><p className="mt-2 text-sm leading-6 text-[var(--mp-text-3)]">Restore a thought before its recovery window ends.</p><div className="mt-4 space-y-3">{deletedThoughts.length === 0 ? <p className="text-sm text-[var(--mp-text-3)]">Nothing is waiting to be restored.</p> : deletedThoughts.map((thought) => <article key={thought.id} className="rounded-2xl bg-[var(--mp-surface-2)] p-4"><p className="line-clamp-2 text-sm text-[var(--mp-text-2)]">{thought.title || thought.body}</p><button className="mt-3 text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-lumen-text)]" type="button" onClick={() => onRestoreThought(thought.id)} disabled={restoringThoughtId !== null}>{restoringThoughtId === thought.id ? "Restoring…" : "Restore thought"}</button></article>)}</div></section>
          <section className="rounded-[24px] border border-[var(--mp-line)] bg-[var(--mp-surface)] p-5"><p className="text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text-3)]">Your archive</p><p className="mt-2 text-sm leading-6 text-[var(--mp-text-3)]">Create a JSON export of your thoughts, settings, and saved conversations.</p>{exportRequest ? <p className="mt-3 text-xs text-[var(--mp-text-3)]">Export status: {formatStatus(exportRequest.status)}{exportRequest.status === "completed" && !isExportExpired(exportRequest) ? ` · available until ${formatDate(exportRequest.expires_at)}` : ""}</p> : null}<div className="mt-4 flex flex-wrap gap-2"><button className="h-10 rounded-full border border-[var(--mp-line)] px-4 text-[12px] font-semibold uppercase tracking-normal" type="button" onClick={onCreateExport} disabled={isCreatingExport || exportRequest?.status === "pending" || exportRequest?.status === "processing"}>{isCreatingExport ? "Requesting…" : "Request export"}</button>{exportRequest?.status === "completed" && !isExportExpired(exportRequest) ? <button className="h-10 rounded-full bg-[var(--mp-text)] px-4 text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text)]" type="button" onClick={onDownloadExport} disabled={isDownloadingExport}>{isDownloadingExport ? "Downloading…" : "Download JSON"}</button> : null}</div></section>
          <section className="rounded-[24px] border border-[var(--mp-danger)]/20 bg-[var(--mp-surface)] p-5"><p className="text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-danger)]">Account deletion</p>{accountDeletion?.status === "pending" ? <><p className="mt-2 text-sm leading-6 text-[var(--mp-danger)]">Permanent deletion is scheduled for {formatDate(accountDeletion.purge_at)}.</p><button className="mt-4 h-10 rounded-full border border-[var(--mp-danger)]/30 px-4 text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-danger)]" type="button" onClick={onCancelDeletion} disabled={isCancellingDeletion}>{isCancellingDeletion ? "Cancelling…" : "Cancel deletion"}</button></> : <><p className="mt-2 text-sm leading-6 text-[var(--mp-danger)]">Your Mind Palace data is removed after the recovery window.</p><button className="mt-4 text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-danger)]" type="button" onClick={onRequestDeletion} disabled={isRequestingDeletion}>{isRequestingDeletion ? "Requesting…" : "Request account deletion"}</button></>}</section>
        </div>
        {lifecycleMessage ? <p className="mt-5 text-sm text-[var(--mp-text-2)]">{lifecycleMessage}</p> : null}
      </section>
    </div>
  );
}
