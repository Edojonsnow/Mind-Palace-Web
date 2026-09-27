import { X } from "lucide-react";

import type { Thought } from "@/lib/api";
import { formatDate, manualThoughtLabels, CompactLabelList } from "@/components/mind-palace-shell-helpers";

type ThoughtPreviewPanelProps = {
  thought: Thought | null;
  isLoading: boolean;
  errorMessage: string;
  onClose: () => void;
};

export function ThoughtPreviewPanel({
  thought,
  isLoading,
  errorMessage,
  onClose,
}: ThoughtPreviewPanelProps) {
  const title = thought?.title || "Untitled thought";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#17191d]/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Cited thought"
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Close thought preview"
        onClick={onClose}
      />
      <section className="capture-panel-enter relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[#f7f7f4] p-6 shadow-[-30px_0_100px_rgba(0,0,0,0.18)] sm:p-9">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#35a79f]">[ Cited thought ]</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.05em] text-[#202329]">
              {isLoading ? "Opening thought..." : title}
            </h1>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10 text-[#30343b] transition hover:bg-black/[0.04]"
            type="button"
            aria-label="Close thought preview"
            title="Close thought preview"
            onClick={onClose}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <p className="mt-10 text-sm text-[#737984]">Retrieving the original thought...</p>
        ) : errorMessage ? (
          <p className="mt-10 text-sm leading-6 text-[#bb454f]">{errorMessage}</p>
        ) : thought ? (
          <div className="mt-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9099]">
              {thought.thought_type} · {formatDate(thought.created_at)}
            </p>
            <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-[#343840]">{thought.body}</p>
            {thought.source_title || thought.source_author || thought.book_title ? (
              <dl className="mt-8 grid gap-4 border-t border-black/[0.08] pt-6 text-sm">
                {thought.book_title ? <div><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b9099]">Book</dt><dd className="mt-1 text-[#343840]">{thought.book_title}{thought.book_author ? ` · ${thought.book_author}` : ""}</dd></div> : null}
                {thought.source_title ? <div><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b9099]">Source</dt><dd className="mt-1 text-[#343840]">{thought.source_title}{thought.source_author ? ` · ${thought.source_author}` : ""}</dd></div> : null}
              </dl>
            ) : null}
            <div className="mt-7">
              <CompactLabelList labels={manualThoughtLabels(thought)} maxVisible={8} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
