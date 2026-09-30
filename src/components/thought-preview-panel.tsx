import { X } from "lucide-react";
import { useModalFocus, Skeleton } from "./ui";

import type { Thought } from "@/lib/api";
import { formatDate, CompactLabelList } from "@/components/mind-palace-shell-helpers";

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
  const panel = useModalFocus(onClose);
  const title = thought?.title || "Untitled thought";

  return (
    <div
      className="mp-overlay fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Thought preview"
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Close thought preview"
        onClick={onClose}
      />
      <section ref={panel} className="capture-panel-enter relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[var(--mp-surface)] p-6 shadow-e1 sm:p-9">
        <div className="flex items-start justify-between gap-6">
          <div>

            <h1 className="mt-3 font-display text-3xl font-medium tracking-normal text-[var(--mp-text)]">
              {isLoading ? "Opening thought..." : title}
            </h1>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--mp-line)] text-[var(--mp-text)] transition hover:bg-[var(--mp-surface-2)]/[0.04]"
            type="button"
            aria-label="Close thought preview"
            title="Close thought preview"
            onClick={onClose}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <Skeleton label="Retrieving the original thought" />
        ) : errorMessage ? (
          <p className="mt-10 text-sm leading-6 text-[var(--mp-danger)]">{errorMessage}</p>
        ) : thought ? (
          <div className="mt-10">
            <p className="text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text-3)]">
              {thought.thought_type} · {formatDate(thought.created_at)}
            </p>
            <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-[var(--mp-text-2)]">{thought.body}</p>
            {thought.source_title || thought.source_author || thought.book_title ? (
              <dl className="mt-8 grid gap-4 border-t border-[var(--mp-line)] pt-6 text-sm">
                {thought.book_title ? <div><dt className="text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text-3)]">Book</dt><dd className="mt-1 text-[var(--mp-text-2)]">{thought.book_title}{thought.book_author ? ` · ${thought.book_author}` : ""}</dd></div> : null}
                {thought.source_title ? <div><dt className="text-[12px] font-semibold uppercase tracking-normal text-[var(--mp-text-3)]">Source</dt><dd className="mt-1 text-[var(--mp-text-2)]">{thought.source_title}{thought.source_author ? ` · ${thought.source_author}` : ""}</dd></div> : null}
              </dl>
            ) : null}
            <div className="mt-7">
              <CompactLabelList labels={thought.manual_tags} maxVisible={8} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
