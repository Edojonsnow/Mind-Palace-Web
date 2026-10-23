import {
  ArrowUpRight,
  ChevronLeft,
  FolderOpen,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Collection, Thought } from "@/lib/api";
import type { LoadState } from "@/components/mind-palace-shell-helpers";

import styles from "./collections-workspace.module.css";

type CollectionsWorkspaceProps = {
  collections: Collection[];
  activeCollection: Collection | null;
  thoughts: Thought[];
  collectionsLoadState: LoadState;
  thoughtsLoadState: LoadState;
  errorMessage: string;
  query: string;
  onQueryChange: (value: string) => void;
  onCollectionSelect: (collectionId: string) => void;
  onBackToCollections: () => void;
  onCreateCollection: (name: string) => Promise<void>;
  onRenameCollection: (collectionId: string, name: string) => Promise<void>;
  onDeleteCollection: (collectionId: string) => Promise<void>;
  onRemoveThought: (collectionId: string, thoughtId: string) => Promise<void>;
  onOpenThought: (thought: Thought) => void;
  onRetry: () => void;
  openCreate?: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "thought" : "thoughts"}`;
}

function CollectionForm({
  initialName = "",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmedName);
      if (!onCancel) setName("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.collectionForm} onSubmit={submit}>
      <label htmlFor="collection-name" className="sr-only">Collection name</label>
      <input
        id="collection-name"
        className={styles.formInput}
        value={name}
        maxLength={100}
        placeholder="Name this collection"
        onChange={(event) => setName(event.target.value)}
        autoFocus
      />
      <button className="mp-button mp-button-primary" type="submit" disabled={!name.trim() || isSubmitting}>
        <Plus size={16} aria-hidden="true" />
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
      {onCancel ? (
        <button className="mp-button mp-button-secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
          <X size={16} aria-hidden="true" />
          Cancel
        </button>
      ) : null}
    </form>
  );
}

function CollectionList({
  collections,
  collectionsLoadState,
  query,
  onQueryChange,
  onCollectionSelect,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onRetry,
  openCreate,
}: Pick<
  CollectionsWorkspaceProps,
  | "collections"
  | "collectionsLoadState"
  | "query"
  | "onQueryChange"
  | "onCollectionSelect"
  | "onCreateCollection"
  | "onRenameCollection"
  | "onDeleteCollection"
  | "onRetry"
  | "openCreate"
>) {
  const [isCreating, setIsCreating] = useState(openCreate ?? false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCollections = normalizedQuery
    ? collections.filter((collection) => collection.name.toLocaleLowerCase().includes(normalizedQuery))
    : collections;

  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Your way of grouping things</p>
          <h1 className={styles.pageTitle}>Collections</h1>
          <p className={styles.pageIntro}>Bring related thoughts together without changing what they are.</p>
        </div>
        <button className="mp-button mp-button-primary" type="button" onClick={() => setIsCreating((current) => !current)}>
          <Plus size={17} aria-hidden="true" />
          New collection
        </button>
      </header>

      {isCreating ? (
        <div className={styles.createPanel}>
          <CollectionForm
            submitLabel="Create"
            onSubmit={async (name) => {
              await onCreateCollection(name);
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      ) : null}

      <div className={styles.searchField}>
        <SearchX size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="collection-search">Search collections</label>
        <input
          id="collection-search"
          type="search"
          value={query}
          placeholder="Search collections"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query ? <button type="button" aria-label="Clear collection search" onClick={() => onQueryChange("")}><X size={16} aria-hidden="true" /></button> : null}
      </div>

      <div className={styles.listHeading}>
        <h2>All collections</h2>
        <span>{collections.length} {collections.length === 1 ? "collection" : "collections"}</span>
      </div>

      {collectionsLoadState === "loading" ? <div className={styles.loadingState}>Loading your collections...</div> : null}
      {collectionsLoadState === "error" ? (
        <div className={styles.stateMessage} role="alert">
          <SearchX size={20} aria-hidden="true" />
          <div><strong>Collections could not be loaded.</strong><button type="button" onClick={onRetry}>Try again</button></div>
        </div>
      ) : null}
      {collectionsLoadState === "ready" && collections.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyMark}><FolderOpen size={22} aria-hidden="true" /></span>
          <h2>Make a place for a thread of thoughts.</h2>
          <p>Collections are private groups you create. A thought can belong to more than one.</p>
          <button className="mp-button mp-button-primary" type="button" onClick={() => setIsCreating(true)}><Plus size={17} aria-hidden="true" />Create your first collection</button>
        </div>
      ) : null}
      {collectionsLoadState === "ready" && collections.length > 0 && filteredCollections.length === 0 ? (
        <div className={styles.stateMessage}><SearchX size={20} aria-hidden="true" /><p>No collections match “{query}”.</p></div>
      ) : null}

      {filteredCollections.length > 0 ? (
        <div className={styles.collectionList}>
          {filteredCollections.map((collection) => (
            editingId === collection.id ? (
              <div className={styles.editRow} key={collection.id}>
                <CollectionForm
                  initialName={collection.name}
                  submitLabel="Save"
                  onSubmit={async (name) => {
                    await onRenameCollection(collection.id, name);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <article className={styles.collectionRow} key={collection.id}>
                <button className={styles.collectionOpen} type="button" onClick={() => onCollectionSelect(collection.id)}>
                  <span className={styles.collectionMark} aria-hidden="true"><FolderOpen size={19} /></span>
                  <span className={styles.collectionInfo}>
                    <span className={styles.collectionName}>{collection.name}</span>
                    <span className={styles.collectionMeta}>{countLabel(collection.thought_count)} · Updated {formatDate(collection.updated_at)}</span>
                  </span>
                  <ArrowUpRight className={styles.collectionArrow} size={18} aria-hidden="true" />
                </button>
                <div className={styles.rowActions}>
                  <button type="button" aria-label={`Rename ${collection.name}`} title="Rename collection" onClick={() => setEditingId(collection.id)}><Pencil size={16} aria-hidden="true" /></button>
                  <button type="button" aria-label={`Delete ${collection.name}`} title="Delete collection" onClick={() => { if (window.confirm(`Delete the collection “${collection.name}”? Your thoughts will stay safe.`)) void onDeleteCollection(collection.id); }}><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              </article>
            )
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CollectionDetail({
  collection,
  thoughts,
  loadState,
  errorMessage,
  onBackToCollections,
  onOpenThought,
  onRemoveThought,
}: {
  collection: Collection;
  thoughts: Thought[];
  loadState: LoadState;
  errorMessage: string;
  onBackToCollections: () => void;
  onOpenThought: (thought: Thought) => void;
  onRemoveThought: (collectionId: string, thoughtId: string) => Promise<void>;
}) {
  return (
    <div className={styles.workspace}>
      <button className={styles.backButton} type="button" onClick={onBackToCollections}><ChevronLeft size={16} aria-hidden="true" />All collections</button>
      <header className={styles.detailHeader}>
        <span className={styles.detailMark} aria-hidden="true"><FolderOpen size={25} /></span>
        <div className={styles.detailTitleBlock}><h1 className={styles.detailTitle}>{collection.name}</h1><p className={styles.detailMeta}>{countLabel(collection.thought_count)}</p></div>
      </header>
      <div className={styles.listHeading}><h2>Thoughts in this collection</h2><span>Private to you</span></div>
      {loadState === "loading" ? <div className={styles.loadingState}>Loading thoughts...</div> : null}
      {loadState === "error" ? <div className={styles.stateMessage} role="alert"><SearchX size={20} aria-hidden="true" /><p>{errorMessage || "These thoughts could not be loaded."}</p></div> : null}
      {loadState === "ready" && thoughts.length === 0 ? <div className={styles.emptyState}><h2>This collection is ready for its first thought.</h2><p>Add thoughts from the thought editor when you are ready.</p></div> : null}
      {thoughts.length > 0 ? (
        <div className={styles.thoughtList}>
          {thoughts.map((thought) => (
            <article className={styles.thoughtRow} key={thought.id}>
              <button className={styles.thoughtOpen} type="button" onClick={() => onOpenThought(thought)}>
                <span className={styles.thoughtTitle}>{thought.title?.trim() || "Untitled thought"}</span>
                <span className={styles.thoughtBody}>{thought.body}</span>
                <span className={styles.thoughtDate}>{formatDate(thought.created_at)}</span>
              </button>
              <button className={styles.removeButton} type="button" aria-label={`Remove ${thought.title || "thought"} from ${collection.name}`} title="Remove from collection" onClick={() => void onRemoveThought(collection.id, thought.id)}><X size={16} aria-hidden="true" /></button>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CollectionsWorkspace({
  collections,
  activeCollection,
  thoughts,
  collectionsLoadState,
  thoughtsLoadState,
  errorMessage,
  query,
  onQueryChange,
  onCollectionSelect,
  onBackToCollections,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onRemoveThought,
  onOpenThought,
  onRetry,
  openCreate,
}: CollectionsWorkspaceProps) {
  return activeCollection ? (
    <CollectionDetail
      collection={activeCollection}
      thoughts={thoughts}
      loadState={thoughtsLoadState}
      errorMessage={errorMessage}
      onBackToCollections={onBackToCollections}
      onOpenThought={onOpenThought}
      onRemoveThought={onRemoveThought}
    />
  ) : (
    <CollectionList
      collections={collections}
      collectionsLoadState={collectionsLoadState}
      query={query}
      onQueryChange={onQueryChange}
      onCollectionSelect={onCollectionSelect}
      onCreateCollection={onCreateCollection}
      onRenameCollection={onRenameCollection}
      onDeleteCollection={onDeleteCollection}
      onRetry={onRetry}
      openCreate={openCreate}
    />
  );
}
