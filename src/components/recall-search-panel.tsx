import type { FormEvent } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
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
  isLoading: boolean;
  onDraftFiltersChange: (update: (current: RecallFilters) => RecallFilters) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

export function RecallSearchPanel({
  draftFilters, activeFilters, hasFilters, isLoading, onDraftFiltersChange, onSubmit, onReset,
}: RecallSearchPanelProps) {
  const labels = activeRecallFilterLabels(activeFilters);
  const filterCount = activeRecallFilterLabels({ ...activeFilters, q: "" }).length;
  const update = (field: keyof RecallFilters, value: string) =>
    onDraftFiltersChange(current => ({ ...current, [field]: value, ...(field === "book" ? { book_id: "" } : {}) }));

  return (
    <div className={styles.refinements}>
      <details className={styles.refine}>
        <summary><SlidersHorizontal size={16} aria-hidden="true" />Filters{filterCount ? <span className={styles.count}>{filterCount}</span> : null}<ChevronDown size={15} aria-hidden="true" /></summary>
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.filters}>
            <label>Thought type<select className={styles.control} aria-label="Thought type" value={draftFilters.thought_type} onChange={event => update("thought_type", event.target.value)}>
              <option value="">All thought types</option><option value="thought">Thought</option><option value="journal">Journal</option><option value="quote">Quote</option><option value="book_excerpt">Book excerpt</option>
            </select></label>
            <label>Archive<select className={styles.control} aria-label="Archive" value={draftFilters.archive} onChange={event => update("archive", event.target.value as ArchiveFilter)}>
              <option value="all">All thoughts</option><option value="active">Active only</option><option value="archived">Archived only</option>
            </select></label>
            <label>Tag<input className={styles.control} placeholder="e.g. work" value={draftFilters.tag} onChange={event => update("tag", event.target.value)} /></label>
            <label>Book or author<input className={styles.control} placeholder="e.g. Circe" value={draftFilters.book} onChange={event => update("book", event.target.value)} /></label>
          </div>
          <div className={styles.actions}>
            <button className="mp-button mp-button-primary" type="submit" disabled={isLoading}>Apply filters</button>
            <button className="mp-button mp-button-ghost" type="button" disabled={!hasFilters || isLoading} onClick={onReset}>Reset</button>
          </div>
        </form>
      </details>
      {labels.length ? <div className={styles.activeFilters} aria-label="Active search and filters">
        {labels.map(label => <span key={label} className={styles.filterTag}>{label}</span>)}
        <button type="button" className={styles.clearFilters} onClick={onReset}>Clear all</button>
      </div> : null}
    </div>
  );
}
