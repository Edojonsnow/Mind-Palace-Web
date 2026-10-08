import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, LayoutGrid, LockKeyhole, MessageCircleQuestion, NotebookPen, Pencil, Plus, RefreshCw, Search, Tag, X } from "lucide-react";
import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { AIUsage, Thought } from "@/lib/api";
import { formatDate, hasRecallFilterValues, type LoadState, type RecallFilters } from "./mind-palace-shell-helpers";
import { RecallSearchPanel } from "./recall-search-panel";
import styles from "./mind-map-home.module.css";

type MindMapHomeProps = {
  name: string;
  thoughts: Thought[];
  total: number;
  loadState: LoadState;
  page: number;
  totalPages: number;
  aiUsage: AIUsage | null;
  draftFilters: RecallFilters;
  activeFilters: RecallFilters;
  hasFilters: boolean;
  onDraftFiltersChange: (update: (current: RecallFilters) => RecallFilters) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClearQuery: () => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  editingThoughtId: string | null;
  editor: ReactNode;
  isUpdating: boolean;
  organizingThoughtId: string | null;
  onOrganizeThought: (thoughtId: string) => void;
  showAskAction: boolean;
  onSaveThought: () => void;
  onAskMind: () => void;
  onReminisce: () => void;
  onBooks: () => void;
  onOpenThought: (thought: Thought) => void;
  onEditThought: (thought: Thought) => void;
  onTagSelect: (tag: string) => void;
  onRefresh: () => void;
};

const typeLabels = { thought: "Thought", journal: "Journal", quote: "Quote", book_excerpt: "Book excerpt" };

function ThoughtCard({ thought, onOpen, onEdit, onTag, isUpdating, isOrganizing, organizationBusy, onOrganize }: {
  thought: Thought; onOpen: () => void; onEdit: () => void; onTag: (tag: string) => void;
  isUpdating: boolean; isOrganizing: boolean; organizationBusy: boolean; onOrganize: () => void;
}) {
  const title = thought.title?.trim();
  const isQuote = thought.thought_type === "quote";
  const isBook = thought.thought_type === "book_excerpt";
  const source = thought.book_title || thought.source_title;
  return (
    <article className={styles.thoughtCard} data-kind={thought.thought_type}>
      <div className={styles.cardMeta}>
        <span>{isBook ? <BookOpen size={14} aria-hidden="true" /> : thought.thought_type === "journal" ? <NotebookPen size={14} aria-hidden="true" /> : null}{typeLabels[thought.thought_type]}</span>
        <button className={styles.editButton} type="button" aria-label="Edit thought" title={`Edit ${title || "thought"}`} onClick={onEdit} disabled={isUpdating}><Pencil size={15} aria-hidden="true" /></button>
      </div>
      <button className={styles.openThought} type="button" aria-label={`Open thought: ${title || thought.body.slice(0, 60)}`} onClick={onOpen}>
        {title ? <span className={styles.cardTitle}>{title}</span> : null}
        <span className={isQuote ? styles.quoteBody : styles.cardBody}>{thought.body}</span>
        {source ? <span className={styles.sourceTitle}>{source}{thought.book_author || thought.source_author ? <span>{thought.book_author || thought.source_author}</span> : null}</span> : null}
      </button>
      {thought.manual_tags.length ? <div className={styles.cardTags}>
        {thought.manual_tags.slice(0, 2).map(tag => <button key={tag} type="button" onClick={() => onTag(tag)} title={`Filter by ${tag}`}>{tag}</button>)}
        {thought.manual_tags.length > 2 ? <span title={thought.manual_tags.slice(2).join(", ")}>+{thought.manual_tags.length - 2}</span> : null}
      </div> : null}
      {thought.use_with_ask_my_mind && thought.ai_processing_status === "failed" ? <button className={styles.retryOrganization} type="button" onClick={onOrganize} disabled={organizationBusy}>{isOrganizing ? "Retrying organization..." : "Retry organization"}</button> : null}
      {thought.use_with_ask_my_mind && ["pending", "processing"].includes(thought.ai_processing_status) ? <p className={styles.organizationStatus}>Organizing...</p> : null}
      <div className={styles.cardFooter}><time dateTime={thought.created_at}>{formatDate(thought.created_at)}</time>{thought.use_with_ask_my_mind ? <span className={styles.aiMark} title="Available to Ask my mind"><MessageCircleQuestion size={14} aria-label="AI enabled" /></span> : <LockKeyhole size={13} aria-label="Not available to AI" />}</div>
    </article>
  );
}

export function MindMapHome({
  name, thoughts, total, loadState, page, totalPages, aiUsage, draftFilters, activeFilters, hasFilters,
  onDraftFiltersChange, onSearchSubmit, onClearQuery, onResetFilters, onPageChange,
  editingThoughtId, editor, isUpdating, organizingThoughtId, onOrganizeThought,
  showAskAction, onSaveThought, onAskMind, onReminisce, onBooks, onOpenThought, onEditThought, onTagSelect, onRefresh,
}: MindMapHomeProps) {
  const search = useRef<HTMLInputElement>(null);
  const editorPanel = useRef<HTMLElement>(null);
  const firstName = name.trim().split(/\s+/)[0] || "you";
  const isFiltered = hasRecallFilterValues(activeFilters);
  const isLoading = loadState === "loading";
  const actions = [
    { label: "Ask my mind", icon: MessageCircleQuestion, action: "ask", handler: onAskMind },
    { label: "View thoughts", icon: Tag, action: "reminisce", handler: onReminisce },
  ] as const;

  useEffect(() => {
    if (!editingThoughtId) return;
    editorPanel.current?.scrollIntoView({ block: "start", behavior: "instant" });
    editorPanel.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, [editingThoughtId]);

  return (
    <div className={styles.home}>
      <aside className={styles.rail}>
        <nav className={styles.navigation} aria-label="Mind Palace">
          <span className={styles.currentView}><LayoutGrid size={18} aria-hidden="true" />Your thoughts</span>
          {actions.filter(action => action.action !== "ask" || showAskAction).map(action => {
            const Icon = action.icon;
            return <button className={styles.navAction} data-action={action.action} key={action.action} type="button" onClick={action.handler}>
              <Icon size={18} aria-hidden="true" />{action.label}<ArrowUpRight size={14} className={styles.navArrow} aria-hidden="true" />
            </button>;
          })}
          <button className={styles.navAction} type="button" onClick={onBooks}><BookOpen size={18} aria-hidden="true" />Books<ArrowUpRight size={14} className={styles.navArrow} aria-hidden="true" /></button>
        </nav>
        <button className={styles.captureAction} type="button" onClick={onSaveThought}><Plus size={18} aria-hidden="true" />Save a thought</button>
        <div className={styles.personal}><span className={styles.avatar} aria-hidden="true">{firstName.charAt(0).toUpperCase()}</span><div><span>Hello, {firstName}.</span><p>Your personal library</p></div></div>
      </aside>
      <div className={styles.library}>
        <h1 className="sr-only">Your thoughts</h1>
        <form className={styles.searchForm} onSubmit={onSearchSubmit} role="search">
          <label htmlFor="library-search" className={styles.searchLabel}>Search your mind</label>
          <fieldset className={styles.searchModes}>
            <legend>Search mode</legend>
            <label className={styles.searchMode}>
              <input
                type="radio"
                name="search-mode"
                value="keyword"
                checked={draftFilters.search_mode === "keyword"}
                onChange={() => onDraftFiltersChange(current => ({ ...current, search_mode: "keyword" }))}
              />
              <span>Search words</span>
            </label>
            <label className={styles.searchMode}>
              <input
                type="radio"
                name="search-mode"
                value="semantic"
                checked={draftFilters.search_mode === "semantic"}
                onChange={() => onDraftFiltersChange(current => ({ ...current, search_mode: "semantic" }))}
              />
              <span>Search by meaning</span>
            </label>
          </fieldset>
          {aiUsage ? <p className={styles.searchAllowance} aria-live="polite">AI allowance: <strong>{aiUsage.remaining_units}</strong> of {aiUsage.daily_limit} units remaining today</p> : null}
          <div className={styles.searchRow}>
            <input id="library-search" ref={search} type="search" value={draftFilters.q}
              onChange={event => onDraftFiltersChange(current => ({ ...current, q: event.target.value }))}
              placeholder="A word, a person, a thought..." autoComplete="off" />
            {draftFilters.q ? <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={() => { onClearQuery(); search.current?.focus(); }}><X size={18} aria-hidden="true" /></button> : null}
            <button className={styles.searchSubmit} type="submit" aria-label="Search memory" title="Search memory" disabled={isLoading}><Search size={20} aria-hidden="true" /></button>
          </div>
        </form>
        <RecallSearchPanel draftFilters={draftFilters} activeFilters={activeFilters} hasFilters={hasFilters}
          onDraftFiltersChange={onDraftFiltersChange} onSubmit={onSearchSubmit} onReset={onResetFilters} isLoading={isLoading} />
        {editor ? <section ref={editorPanel} className={styles.editorPanel} aria-label="Edit thought"><h2>Edit thought</h2>{editor}</section> : null}
        <div className={styles.libraryHeader}>
          <h2>{isFiltered ? "Search results" : page === 1 ? "Recently saved" : "Your thoughts"}<span>{total} {total === 1 ? "thought" : "thoughts"}</span></h2>
          <div className={styles.libraryTools}>
            {isFiltered || page > 1 ? <button className={styles.refreshButton} type="button" onClick={onSaveThought} aria-label="Save a thought" title="Save a thought"><Plus size={18} aria-hidden="true" /></button> : null}
            <button className={styles.refreshButton} type="button" onClick={onRefresh} disabled={isLoading} aria-label="Refresh thoughts" title="Refresh thoughts"><RefreshCw size={16} aria-hidden="true" /></button>
          </div>
        </div>
        {loadState === "error" ? <div className={styles.loadError} role="alert"><p>Your thoughts could not be loaded.</p><button type="button" onClick={onRefresh}>Try again</button></div> : null}
        <div className={styles.thoughtGrid} aria-busy={isLoading}>
          {!isFiltered && page === 1 ? <button className={styles.newThought} type="button" aria-label="Save a thought" onClick={onSaveThought}><Plus size={24} aria-hidden="true" /><span>Save a thought</span><span className={styles.newThoughtHint}>What would you like to keep?</span><ArrowUpRight size={16} className={styles.newThoughtArrow} aria-hidden="true" /></button> : null}
          {loadState !== "ready" && thoughts.length === 0 && loadState !== "error"
            ? Array.from({ length: 5 }, (_, i) => <div key={i} className={styles.cardSkeleton} aria-hidden="true"><div /><div /><div /></div>)
            : thoughts.map(thought => <ThoughtCard key={thought.id} thought={thought} onOpen={() => onOpenThought(thought)}
                onEdit={() => onEditThought(thought)} onTag={onTagSelect} isUpdating={isUpdating}
                isOrganizing={organizingThoughtId === thought.id} organizationBusy={organizingThoughtId !== null} onOrganize={() => onOrganizeThought(thought.id)} />)}
        </div>
        {loadState === "ready" && thoughts.length === 0 ? <div className={styles.empty} role="status">
          <h2>{isFiltered ? "Nothing matches yet." : "A thought is all it takes."}</h2>
          <p>{isFiltered ? "Try another search or clear your filters." : "Your notes, reflections, and book excerpts will gather here."}</p>
          {isFiltered ? <button className="mp-button mp-button-secondary" type="button" onClick={onResetFilters}>Clear search and filters</button> : null}
        </div> : null}
        {isLoading ? <p className="sr-only" role="status">Loading your thoughts</p> : null}
        {totalPages > 1 ? <nav className={styles.pagination} aria-label="Thought pages">
          <button type="button" aria-label="Previous page" disabled={page <= 1 || isLoading} onClick={() => onPageChange(page - 1)}><ArrowLeft size={16} aria-hidden="true" /><span>Previous</span></button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" aria-label="Next page" disabled={page >= totalPages || isLoading} onClick={() => onPageChange(page + 1)}><span>Next</span><ArrowRight size={16} aria-hidden="true" /></button>
        </nav> : null}
      </div>
    </div>
  );
}
