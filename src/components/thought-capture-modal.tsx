import type { FormEvent } from "react";

import type { Book, Collection, ThoughtType } from "@/lib/api";
import { parseThoughtType } from "@/components/mind-palace-shell-helpers";
import styles from "./thought-capture-modal.module.css";
import { ArrowRight, BookOpen, ChevronDown, Feather, LoaderCircle, LockKeyhole, NotebookPen, Quote, StickyNote, WandSparkles, X } from "lucide-react";
import librarySurface from "./library-surface.module.css";
import { ValidatedForm, useModalFocus } from "./ui";
import { ThoughtCollectionPicker } from "./thought-collection-picker";

type ThoughtCaptureModalProps = {
  defaultDark: boolean;
  body: string;
  title: string;
  thoughtType: ThoughtType;
  books: Book[];
  collections: Collection[];
  selectedCollectionIds: string[];
  selectedBookId: string;
  newBookTitle: string;
  newBookAuthor: string;
  manualTags: string;
  useWithAsk: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBodyChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onThoughtTypeChange: (value: ThoughtType) => void;
  onBookChange: (value: string) => void;
  onCollectionIdsChange: (value: string[]) => void;
  onNewBookTitleChange: (value: string) => void;
  onNewBookAuthorChange: (value: string) => void;
  onManualTagsChange: (value: string) => void;
  onUseWithAskChange: (value: boolean) => void;
};

export function ThoughtCaptureModal({
  defaultDark, body, title, thoughtType, books, collections, selectedCollectionIds, selectedBookId, newBookTitle, newBookAuthor,
  manualTags, useWithAsk, isSaving, onClose, onSubmit, onBodyChange, onTitleChange,
  onThoughtTypeChange, onBookChange, onCollectionIdsChange, onNewBookTitleChange, onNewBookAuthorChange,
  onManualTagsChange, onUseWithAskChange,
}: ThoughtCaptureModalProps) {
  const panel = useModalFocus(onClose);
  const TypeIcon = { thought: StickyNote, journal: NotebookPen, quote: Quote, book_excerpt: BookOpen }[thoughtType];
  const length = Array.from(body).length;
  const canSave = !!body.trim() && length <= 1000 && !isSaving;

  return (
    <div className={`${styles.backdrop} ${librarySurface.surface}`} data-theme={defaultDark ? "dark" : undefined}>
      <button className={styles.dismiss} type="button" tabIndex={-1} aria-label="Close thought composer" onClick={onClose} />
      <section className={styles.panel} ref={panel} role="dialog" aria-modal="true" aria-labelledby="capture-title">
        <header className={styles.header}>
          <Feather size={21} aria-hidden="true" />
          <h2 id="capture-title">New thought<span aria-hidden="true">.</span></h2>
          <button type="button" className={styles.close} aria-label="Close" title="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <ValidatedForm className={styles.form} onSubmit={onSubmit} onKeyDown={event => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            if (canSave) event.currentTarget.requestSubmit();
          }
        }}>
          <div className={styles.scrollArea}>
            <div className={styles.paper}>
              <label className={styles.kind}>
                <TypeIcon size={14} aria-hidden="true" />
                <span className="sr-only">Kind of thought</span>
                <select aria-label="Kind of thought" value={thoughtType} onChange={event => onThoughtTypeChange(parseThoughtType(event.target.value))}>
                  <option value="thought">Thought</option><option value="journal">Journal</option>
                  <option value="quote">Quote</option><option value="book_excerpt">Book excerpt</option>
                </select>
                <ChevronDown size={13} aria-hidden="true" />
              </label>
              <input className={styles.titleInput} aria-label="Optional title" placeholder="Untitled thought" value={title} onChange={e => onTitleChange(e.target.value)} />
              <label className="sr-only" htmlFor="capture-body">Your thought</label>
              <textarea id="capture-body" autoFocus required className={styles.bodyInput}
                placeholder="Start anywhere. You do not need to organize it." value={body} onChange={e => onBodyChange(e.target.value)}
                aria-describedby="capture-count" aria-invalid={length > 1000 || undefined} />
              <small id="capture-count" className={styles.count} data-over={length > 1000}>
                {length > 1000 ? `Shorten by ${length - 1000} · ` : ""}{length.toLocaleString()} / 1,000
              </small>
            </div>
            {thoughtType === "book_excerpt" ? <div className={styles.bookFields}>
              <label className={styles.field}>Book
                <select aria-label="Book" className={styles.control} value={selectedBookId} onChange={event => onBookChange(event.target.value)} required>
                  <option value="">Select a saved book</option>
                  {books.map(book => <option key={book.id} value={book.id}>{book.title} · {book.author}</option>)}
                  <option value="__new__">+ Add a new book</option>
                </select>
              </label>
              {selectedBookId === "__new__" ? <div className={styles.pair}>
                <label className={styles.field}>Book title<input className={styles.control} value={newBookTitle} onChange={e => onNewBookTitleChange(e.target.value)} required /></label>
                <label className={styles.field}>Author<input className={styles.control} value={newBookAuthor} onChange={e => onNewBookAuthorChange(e.target.value)} required /></label>
              </div> : null}
            </div> : null}
            <div className={styles.organization}>
              <label className={styles.field}>Tags<input className={styles.control} placeholder="Tags separated by commas" value={manualTags} onChange={e => onManualTagsChange(e.target.value)} /></label>
              <ThoughtCollectionPicker collections={collections} selectedIds={selectedCollectionIds} onChange={onCollectionIdsChange} />
            </div>
            <div className={styles.consentRow}>
              <WandSparkles size={17} aria-hidden="true" />
              <div><label htmlFor="capture-ai">Let Ask Omini use this</label>
                <p id="capture-ai-info">{useWithAsk ? "This thought will be sent for AI processing." : "This thought won’t be sent for AI processing."}</p>
              </div>
              <input className={styles.switch} id="capture-ai" type="checkbox" aria-describedby="capture-ai-info" checked={useWithAsk} onChange={e => onUseWithAskChange(e.target.checked)} />
            </div>
          </div>
          <footer className={styles.footer}>
            <span><LockKeyhole size={13} aria-hidden="true" />Private library</span>
            <button className={styles.submit} type="submit" disabled={!canSave}>
              {isSaving ? <>Saving… <LoaderCircle size={15} className={styles.spinner} /></> : <>Keep this thought <ArrowRight size={16} /></>}
            </button>
          </footer>
        </ValidatedForm>
      </section>
    </div>
  );
}
