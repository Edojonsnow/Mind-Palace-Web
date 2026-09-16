import type { FormEvent } from "react";

import {
  activeRecallFilterLabels,
  type ArchiveFilter,
  type RecallFilters,
} from "@/components/mind-palace-shell-helpers";

type RecallSearchPanelProps = {
  draftFilters: RecallFilters;
  activeFilters: RecallFilters;
  hasFilters: boolean;
  onDraftFiltersChange: (update: (current: RecallFilters) => RecallFilters) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

export function RecallSearchPanel({
  draftFilters,
  activeFilters,
  hasFilters,
  onDraftFiltersChange,
  onSubmit,
  onReset,
}: RecallSearchPanelProps) {
  const update = (field: keyof RecallFilters, value: string) =>
    onDraftFiltersChange((current) => ({ ...current, [field]: value }));

  return (
    <>
      <form onSubmit={onSubmit}>
        <label className="block">
          <span className="sr-only">Search your thoughts</span>
          <input
            autoFocus
            className="h-auto w-full border-0 border-b border-black/10 bg-transparent px-0 pb-5 font-display text-2xl tracking-[-0.035em] text-[#202329] outline-none placeholder:text-[#a5a8af] sm:text-4xl"
            placeholder="What do you remember?"
            value={draftFilters.q}
            onChange={(event) => update("q", event.target.value)}
          />
        </label>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select className="modern-control" aria-label="Thought type" value={draftFilters.thought_type} onChange={(event) => update("thought_type", event.target.value)}>
            <option value="">All thought types</option><option value="thought">Thought</option><option value="journal">Journal</option><option value="quote">Quote</option><option value="book_excerpt">Book excerpt</option>
          </select>
          <select className="modern-control" aria-label="Source" value={draftFilters.source_type} onChange={(event) => update("source_type", event.target.value)}>
            <option value="">Every source</option><option value="manual">Manual</option><option value="book">Book</option><option value="article">Article</option><option value="website">Website</option><option value="audio">Audio</option><option value="import">Import</option>
          </select>
          <select className="modern-control" aria-label="Archive" value={draftFilters.archive} onChange={(event) => update("archive", event.target.value as ArchiveFilter)}>
            <option value="all">All thoughts</option><option value="active">Active only</option><option value="archived">Archived only</option>
          </select>
          <input className="modern-control" aria-label="Tag" placeholder="Tag" value={draftFilters.tag} onChange={(event) => update("tag", event.target.value)} />
          <input className="modern-control sm:col-span-2" aria-label="Book or author" placeholder="Book or author" value={draftFilters.book} onChange={(event) => update("book", event.target.value)} />
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button className="h-11 rounded-full bg-[#24272d] px-6 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-black" type="submit">Search memory</button>
          <button className="h-11 px-3 text-xs font-semibold text-[#777c86] hover:text-black disabled:opacity-35" type="button" disabled={!hasFilters} onClick={onReset}>Clear filters</button>
        </div>
      </form>
      {activeRecallFilterLabels(activeFilters).length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[10px] text-[#777c86]">
          <span className="mr-1 font-semibold uppercase tracking-[0.12em]">Active filters</span>
          {activeRecallFilterLabels(activeFilters).map((label) => (
            <span key={label} className="rounded-full bg-[#f3f3f0] px-2 py-1 text-[#68738a]">{label}</span>
          ))}
        </div>
      ) : null}
    </>
  );
}
