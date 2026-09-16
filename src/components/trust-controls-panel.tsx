import type { AccountDeletionRequest, ExportRequest, Thought, UserSettings } from "@/lib/api";
import { formatDate, formatStatus, isExportExpired, type LoadState } from "@/components/mind-palace-shell-helpers";

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
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#17191d]/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close privacy settings" onClick={onClose} />
      <section className="capture-panel-enter relative z-10 h-full w-full max-w-xl overflow-y-auto bg-[#f7f7f4] p-6 shadow-[-30px_0_100px_rgba(0,0,0,0.18)] sm:p-9">
        <div className="flex items-start justify-between gap-6"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#35a79f]">[ Trust controls ]</p><h1 id="privacy-title" className="mt-3 font-display text-4xl font-medium tracking-[-0.05em] text-[#202329]">Privacy &amp; data</h1></div><button className="h-10 rounded-full border border-black/10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em]" type="button" onClick={onClose}>Close</button></div>
        <div className="mt-10 space-y-4">
          <section className="rounded-[24px] border border-black/[0.08] bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9099]">AI participation</p><label className="mt-4 flex items-center justify-between gap-5 text-sm leading-6 text-[#383c44]"><span>Use new thoughts with Ask My Mind by default</span><input className="h-5 w-5 accent-[#24272d]" type="checkbox" checked={settings?.default_use_with_ask_my_mind ?? false} disabled={lifecycleState !== "ready"} onChange={(event) => onDefaultAskToggle(event.target.checked)} /></label></section>
          <section className="rounded-[24px] border border-black/[0.08] bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9099]">Deleted thoughts</p><p className="mt-2 text-sm leading-6 text-[#6f747e]">Restore a thought before its recovery window ends.</p><div className="mt-4 space-y-3">{deletedThoughts.length === 0 ? <p className="text-sm text-[#92969e]">Nothing is waiting to be restored.</p> : deletedThoughts.map((thought) => <article key={thought.id} className="rounded-2xl bg-[#f3f3f0] p-4"><p className="line-clamp-2 text-sm text-[#3e424a]">{thought.title || thought.body}</p><button className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5367c7]" type="button" onClick={() => onRestoreThought(thought.id)} disabled={restoringThoughtId !== null}>{restoringThoughtId === thought.id ? "Restoring…" : "Restore thought"}</button></article>)}</div></section>
          <section className="rounded-[24px] border border-black/[0.08] bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9099]">Your archive</p><p className="mt-2 text-sm leading-6 text-[#6f747e]">Create a JSON export of your thoughts, settings, and saved conversations.</p>{exportRequest ? <p className="mt-3 text-xs text-[#777c86]">Export status: {formatStatus(exportRequest.status)}{exportRequest.status === "completed" && !isExportExpired(exportRequest) ? ` · available until ${formatDate(exportRequest.expires_at)}` : ""}</p> : null}<div className="mt-4 flex flex-wrap gap-2"><button className="h-10 rounded-full border border-black/10 px-4 text-[10px] font-semibold uppercase tracking-[0.12em]" type="button" onClick={onCreateExport} disabled={isCreatingExport || exportRequest?.status === "pending" || exportRequest?.status === "processing"}>{isCreatingExport ? "Requesting…" : "Request export"}</button>{exportRequest?.status === "completed" && !isExportExpired(exportRequest) ? <button className="h-10 rounded-full bg-[#24272d] px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white" type="button" onClick={onDownloadExport} disabled={isDownloadingExport}>{isDownloadingExport ? "Downloading…" : "Download JSON"}</button> : null}</div></section>
          <section className="rounded-[24px] border border-[#bb454f]/20 bg-[#fffafa] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#bb454f]">Account deletion</p>{accountDeletion?.status === "pending" ? <><p className="mt-2 text-sm leading-6 text-[#7a4a4e]">Permanent deletion is scheduled for {formatDate(accountDeletion.purge_at)}.</p><button className="mt-4 h-10 rounded-full border border-[#bb454f]/30 px-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#bb454f]" type="button" onClick={onCancelDeletion} disabled={isCancellingDeletion}>{isCancellingDeletion ? "Cancelling…" : "Cancel deletion"}</button></> : <><p className="mt-2 text-sm leading-6 text-[#7a6668]">Your Mind Palace data is removed after the recovery window.</p><button className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bb454f]" type="button" onClick={onRequestDeletion} disabled={isRequestingDeletion}>{isRequestingDeletion ? "Requesting…" : "Request account deletion"}</button></>}</section>
        </div>
        {lifecycleMessage ? <p className="mt-5 text-sm text-[#5f646d]">{lifecycleMessage}</p> : null}
      </section>
    </div>
  );
}
