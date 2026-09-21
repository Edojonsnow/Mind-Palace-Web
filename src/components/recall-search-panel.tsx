import type { FormEvent } from "react";

import {
  activeRecallFilterLabels,
  type ArchiveFilter,
  type RecallFilters,
} from "@/components/mind-palace-shell-helpers";
import styles from "./recall-search-panel.module.css";

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
      <form className={styles.form} onSubmit={onSubmit}>
        <label className="block">
          <span className="sr-only">Search your thoughts</span>
          <input
            autoFocus
            className={styles.searchInput}
            placeholder="What do you remember?"
            value={draftFilters.q}
            onChange={(event) => update("q", event.target.value)}
          />
        </label>
        <div className={styles.filters}>
          <select className={`${styles.control} ${styles.select}`} aria-label="Thought type" value={draftFilters.thought_type} onChange={(event) => update("thought_type", event.target.value)}>
            <option value="">All thought types</option><option value="thought">Thought</option><option value="journal">Journal</option><option value="quote">Quote</option><option value="book_excerpt">Book excerpt</option>
          </select>
          <select className={`${styles.control} ${styles.select}`} aria-label="Archive" value={draftFilters.archive} onChange={(event) => update("archive", event.target.value as ArchiveFilter)}>
            <option value="all">All thoughts</option><option value="active">Active only</option><option value="archived">Archived only</option>
          </select>
          <input className={styles.control} aria-label="Tag" placeholder="Tag" value={draftFilters.tag} onChange={(event) => update("tag", event.target.value)} />
          <input className={styles.control} aria-label="Book or author" placeholder="Book or author" value={draftFilters.book} onChange={(event) => update("book", event.target.value)} />
        </div>
        <div className={styles.actions}>
          <button className={styles.submit} type="submit">Search memory</button>
          <button className={styles.reset} type="button" disabled={!hasFilters} onClick={onReset}>Clear filters</button>
        </div>
      </form>
      {activeRecallFilterLabels(activeFilters).length > 0 ? (
        <div className={styles.activeFilters}>
          <span className={styles.activeLabel}>Active filters</span>
          {activeRecallFilterLabels(activeFilters).map((label) => (
            <span key={label} className={styles.filterTag}>{label}</span>
          ))}
        </div>
      ) : null}
    </>
  );
}
