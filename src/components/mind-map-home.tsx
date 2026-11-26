import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, ChevronDown, Cloud, CornerDownLeft, Feather, FolderOpen, History, LayoutGrid, List, NotebookPen, Pencil, Plus, Quote, RefreshCw, Search, StickyNote, Tag, WandSparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { AIUsage, Collection, Thought } from "@/lib/api";
import { formatDate, hasRecallFilterValues, type LoadState, type RecallFilters } from "./mind-palace-shell-helpers";
import { RecallSearchPanel } from "./recall-search-panel";
import styles from "./mind-map-home.module.css";

type MindMapHomeProps = {
  name: string;
  thoughts: Thought[];
  total: number;
  libraryTotal: number;
  collectionCount: number | null;
  loadState: LoadState;
  errorMessage?: string;
  page: number;
  totalPages: number;
  aiUsage: AIUsage | null;
  draftFilters: RecallFilters;
  activeFilters: RecallFilters;
  hasFilters: boolean;
  onDraftFiltersChange: (update: (current: RecallFilters) => RecallFilters) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onApplyFilters: (filters: RecallFilters) => void;
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
  onAskMind: (draft?: string) => void;
  onReminisce: () => void;
  onBooks: () => void;
  recentCollections: Collection[];
  collectionsLoadState: LoadState;
  onOpenCollection: (collectionId: string) => void;
  onViewAllCollections: () => void;
  onCreateCollection: () => void;
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
        <span>{isBook ? <BookOpen size={12} /> : isQuote ? <Quote size={12} /> : thought.thought_type === "journal" ? <NotebookPen size={12} /> : <StickyNote size={12} />}{typeLabels[thought.thought_type]}</span>
        <small className={styles.cardStatus}>{thought.use_with_ask_my_mind ? <><WandSparkles size={12} />Ask Omini</> : <><Cloud size={12} />Saved</>}</small>
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
      {thought.use_with_ask_my_mind && thought.ai_processing_status === "failed" ? (
        <div className={styles.organizationBanner} data-status="failed" role="status">
          <span>Organization couldn&apos;t finish.</span>
          <button className={styles.retryOrganization} type="button" onClick={onOrganize} disabled={organizationBusy}>{isOrganizing ? "Retrying organization..." : "Retry organization"}</button>
        </div>
      ) : null}
      {thought.use_with_ask_my_mind && ["pending", "processing"].includes(thought.ai_processing_status) ? (
        <p className={styles.organizationBanner} data-status="processing" role="status">Organizing...</p>
      ) : null}
      <div className={styles.cardFooter}><time dateTime={thought.created_at}>{formatDate(thought.created_at)}</time></div>
    </article>
  );
}

export function MindMapHome({
  name, thoughts, total, libraryTotal, collectionCount, loadState, errorMessage, page, totalPages, aiUsage, draftFilters, activeFilters, hasFilters,
  onDraftFiltersChange, onSearchSubmit, onApplyFilters, onClearQuery, onResetFilters, onPageChange,
  editingThoughtId, editor, isUpdating, organizingThoughtId, onOrganizeThought,
  showAskAction, onSaveThought, onAskMind, onReminisce, onBooks, recentCollections, collectionsLoadState,
  onOpenCollection, onViewAllCollections, onCreateCollection, onOpenThought, onEditThought, onTagSelect, onRefresh,
}: MindMapHomeProps) {
  const search = useRef<HTMLInputElement>(null);
  const editorPanel = useRef<HTMLElement>(null);
  const [isCollectionsMenuOpen, setIsCollectionsMenuOpen] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [askDraft, setAskDraft] = useState("");
  const firstName = name.trim().split(/\s+/)[0] || "you";
  const isFiltered = hasRecallFilterValues(activeFilters);
  const revisit = !isFiltered && page === 1 && thoughts.length > 1 ? thoughts[thoughts.length - 1] : null;
  const isLoading = loadState === "loading";
  const actions = [
    { label: "Ask Omini", icon: WandSparkles, action: "ask", handler: () => onAskMind() },
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
        <button className={styles.captureAction} type="button" onClick={onSaveThought}><Feather size={16} aria-hidden="true" />Save a thought</button>
        <nav className={styles.navigation} aria-label="Mind Palace">
          <span className={styles.groupLabel}>Library</span>
          <span className={styles.currentView} aria-current="page"><Search size={16} aria-hidden="true" />Recall</span>
          {actions.filter(action => action.action !== "ask" || showAskAction).map(action => {
            const Icon = action.icon;
            return <button className={styles.navAction} data-action={action.action} key={action.action} type="button" onClick={action.handler}>
              <Icon size={16} aria-hidden="true" />{action.label}{action.action === "ask" ? <small aria-hidden="true" className={styles.aiTag}>AI</small> : null}
            </button>;
          })}
          <button className={styles.navAction} type="button" onClick={onBooks}><BookOpen size={18} aria-hidden="true" />Books<ArrowUpRight size={14} className={styles.navArrow} aria-hidden="true" /></button>
          <div className={styles.collectionMenu}>
            <button
              className={styles.navAction}
              type="button"
              aria-expanded={isCollectionsMenuOpen}
              aria-controls="collections-menu"
              onClick={() => setIsCollectionsMenuOpen((current) => !current)}
            >
              <FolderOpen size={18} aria-hidden="true" />Collections<ChevronDown size={15} className={styles.collectionChevron} aria-hidden="true" />
            </button>
            {isCollectionsMenuOpen ? (
              <div id="collections-menu" className={styles.collectionDropdown} role="menu">
                <p className={styles.collectionDropdownLabel}>Recently used</p>
                {collectionsLoadState === "loading" ? <span className={styles.collectionDropdownState}>Loading...</span> : null}
                {collectionsLoadState !== "loading" && recentCollections.length === 0 ? <span className={styles.collectionDropdownState}>No collections yet</span> : null}
                {recentCollections.map((collection) => (
                  <button key={collection.id} type="button" role="menuitem" onClick={() => { setIsCollectionsMenuOpen(false); onOpenCollection(collection.id); }}>
                    <span>{collection.name}</span><small>{collection.thought_count}</small>
                  </button>
                ))}
                <div className={styles.collectionDropdownRule} />
                <button type="button" role="menuitem" onClick={() => { setIsCollectionsMenuOpen(false); onViewAllCollections(); }}>View all collections<ArrowUpRight size={14} aria-hidden="true" /></button>
                <button type="button" role="menuitem" onClick={() => { setIsCollectionsMenuOpen(false); onCreateCollection(); }}><Plus size={14} aria-hidden="true" />New collection</button>
              </div>
            ) : null}
            {!isCollectionsMenuOpen && recentCollections.length > 0 ? <div className={styles.collectionShortcuts}>
              {recentCollections.slice(0,5).map(c => <button key={c.id} type="button" onClick={() => onOpenCollection(c.id)}>{c.name}</button>)}
            </div> : null}
          </div>
        </nav>
        <div className={styles.railFoot}>
          {aiUsage ? <section className={styles.allowancePanel}>
            <h2>AI allowance today <strong>{aiUsage.remaining_units}/{aiUsage.daily_limit}</strong></h2>
            <progress max={aiUsage.daily_limit || 1} value={aiUsage.remaining_units} aria-label="AI units remaining" />
            <p>Keyword search is always free.</p>
          </section> : null}
          <div className={styles.personal}><span className={styles.avatar} aria-hidden="true">{firstName.charAt(0).toUpperCase()}</span><div><span>{firstName}</span><p>Private library</p></div></div>
        </div>
      </aside>
      <div className={styles.library}>
        <h1 className="sr-only">Your thoughts</h1>
        <p className={styles.dateLine}>{new Intl.DateTimeFormat("en-GB", {weekday:"long", day:"numeric", month:"long"}).format(new Date())}</p>
        <label htmlFor="library-search" className={styles.searchLabel}>Search your mind<span aria-hidden="true">.</span></label>
        <p className={styles.searchDescription}>Describe what you remember: a word, a person, a feeling. Find your way back to the thought.</p>
        <div className={styles.searchBox}>
        <form className={styles.searchForm} onSubmit={onSearchSubmit} role="search">
          <div className={styles.searchSurface}>
          <div className={styles.searchToolbar}>
            <fieldset className={styles.searchModes}>
              <legend>Search mode</legend>
              <label className={styles.searchMode}>
                <input
                  type="radio"
                  name="search-mode"
                  value="keyword" aria-label="Search words"
                  checked={draftFilters.search_mode === "keyword"}
                  onChange={() => onDraftFiltersChange(current => ({ ...current, search_mode: "keyword" }))}
                />
                <span>Words</span>
              </label>
              <label className={styles.searchMode}>
                <input
                  type="radio"
                  name="search-mode"
                  value="semantic" aria-label="Search by meaning"
                  checked={draftFilters.search_mode === "semantic"}
                  onChange={() => onDraftFiltersChange(current => ({ ...current, search_mode: "semantic" }))}
                />
                <span><WandSparkles size={12} />By meaning</span>
              </label>
            </fieldset>
          </div>
          <div className={styles.searchRow}>
            <Search size={19} aria-hidden="true" className={styles.searchIcon} />
            <input id="library-search" ref={search} type="search" value={draftFilters.q}
              onChange={event => onDraftFiltersChange(current => ({ ...current, q: event.target.value }))}
              placeholder="A word, a person, a thought..." autoComplete="off" />
            {draftFilters.q ? <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={() => { onClearQuery(); search.current?.focus(); }}><X size={18} aria-hidden="true" /></button> : null}
            <small className={styles.searchCost}>{draftFilters.search_mode === "keyword" ? "Free · no AI" : "Uses AI units"}</small>
            <button className={styles.searchSubmit} type="submit" aria-label="Search memory" title="Search memory" disabled={isLoading}><CornerDownLeft size={15} aria-hidden="true" /></button>
          </div>
          </div>
        </form>
        <div className={styles.filterShelf}>
          <div className={styles.typeFilters} aria-label="Filter by thought type">
            {Object.entries({ "": "All", journal: "Journal", thought: "Thought", quote: "Quote", book_excerpt: "Book excerpt" }).map(([type, label]) =>
              <button key={type} type="button" aria-pressed={draftFilters.thought_type === type} disabled={isLoading} onClick={() => {
                const filters = { ...draftFilters, thought_type: type };
                if (filters.search_mode === "semantic" && filters.q.trim()) onDraftFiltersChange(() => filters);
                else onApplyFilters(filters);
              }}>{label}</button>)}
          </div>
        <RecallSearchPanel draftFilters={draftFilters} activeFilters={activeFilters} hasFilters={hasFilters}
          onDraftFiltersChange={onDraftFiltersChange} onSubmit={onSearchSubmit} onReset={onResetFilters} isLoading={isLoading} />
        </div></div>
        <div className={styles.suggestions}><span>Try</span>{["a conversation", "a line from a book", "a small win"].map(q =>
          <button key={q} type="button" onClick={() => { onDraftFiltersChange(f => ({ ...f, q })); search.current?.focus(); }}>{q}</button>)}</div>
        <div className={styles.libraryLayout}>
        <div className={styles.libraryMain}>
        {editor ? <section ref={editorPanel} className={styles.editorPanel} aria-label="Edit thought"><h2>Edit thought</h2>{editor}</section> : null}
        <div className={styles.libraryHeader}>
          <h2>{isFiltered ? "Search results" : page === 1 ? "Recently saved" : "Your thoughts"}<span>{total} {total === 1 ? "thought" : "thoughts"}</span></h2>
          <div className={styles.libraryTools}>
            <button type="button" aria-label="Grid view" title="Grid view" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><LayoutGrid size={14} /></button>
            <button type="button" aria-label="List view" title="List view" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={16} /></button>
            {isFiltered || page > 1 ? <button className={styles.refreshButton} type="button" onClick={onSaveThought} aria-label="Save a thought" title="Save a thought"><Plus size={18} aria-hidden="true" /></button> : null}
            <button className={styles.refreshButton} type="button" onClick={onRefresh} disabled={isLoading} aria-label="Refresh thoughts" title="Refresh thoughts"><RefreshCw size={16} aria-hidden="true" /></button>
          </div>
        </div>
        {loadState === "error" ? <div className={styles.loadError} role="alert"><div><p>Your thoughts could not be loaded.</p>{errorMessage ? <p className="mt-2 max-w-prose break-words text-sm">{errorMessage}</p> : null}</div><button type="button" onClick={onRefresh}>Try again</button></div> : null}
        <div className={styles.thoughtGrid} data-layout={layout} aria-busy={isLoading}>
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
        <aside className={styles.libraryAside} aria-label="Library tools">
          {showAskAction ? <section className={styles.askPanel}>
            <div className={styles.asideLabel}><WandSparkles size={14} aria-hidden="true" />Ask Omini</div>
            <h2>What patterns show up in my thoughts?</h2>
            <p>Explore connections in the thoughts you choose to share with AI.</p>
            <form className={styles.askField} onSubmit={e => { e.preventDefault(); onAskMind(askDraft.trim() || undefined); }}>
              <input aria-label="Draft a question for Ask Omini" placeholder="Ask your own question..." value={askDraft} onChange={e => setAskDraft(e.target.value)} />
              <button type="submit" aria-label="Open Ask Omini" title="Open Ask Omini"><ArrowUp size={16}/></button>
            </form>
          </section> : null}
          {revisit ? <section className={styles.revisitPanel}>
            <h2>Worth revisiting <History size={14}/></h2>
            <p>{revisit.title || revisit.body}</p>
            <footer><time dateTime={revisit.created_at}>{formatDate(revisit.created_at)}</time><button type="button" onClick={() => onOpenThought(revisit)}>Revisit <ArrowRight size={13}/></button></footer>
          </section> : null}
          {loadState === "ready" ? <section className={styles.statsPanel}><h2>Your library</h2>
            <dl><div><dt>Thoughts</dt><dd>{libraryTotal}</dd></div>
              {collectionCount !== null ? <div><dt>Collections</dt><dd>{collectionCount}</dd></div> : null}
            </dl>
          </section> : null}
        </aside>
        </div>
      </div>
    </div>
  );
}
