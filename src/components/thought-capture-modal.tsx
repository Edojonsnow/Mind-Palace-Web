import type { FormEvent } from "react";

import type { Book, ThoughtType } from "@/lib/api";
import { parseThoughtType } from "@/components/mind-palace-shell-helpers";
import styles from "./thought-capture-modal.module.css";

type ThoughtCaptureModalProps = {
  body: string;
  title: string;
  thoughtType: ThoughtType;
  books: Book[];
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
  onNewBookTitleChange: (value: string) => void;
  onNewBookAuthorChange: (value: string) => void;
  onManualTagsChange: (value: string) => void;
  onUseWithAskChange: (value: boolean) => void;
};

export function ThoughtCaptureModal({
  body, title, thoughtType, books, selectedBookId, newBookTitle, newBookAuthor,
  manualTags, useWithAsk, isSaving, onClose, onSubmit, onBodyChange, onTitleChange,
  onThoughtTypeChange, onBookChange, onNewBookTitleChange, onNewBookAuthorChange,
  onManualTagsChange, onUseWithAskChange,
}: ThoughtCaptureModalProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 ${styles.backdrop}`} role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close thought composer" onClick={onClose} />
      <section className={`capture-panel-enter relative z-10 flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden ${styles.panel}`}>
        <header className={styles.header}>
          <div className={styles.meta}><span className={styles.metaDot} /><p>Private capture · saved after submission</p></div>
          <button className={styles.closeButton} type="button" onClick={onClose}>Close</button>
        </header>
        <form className="min-h-0 overflow-y-auto" onSubmit={onSubmit}>
          <div className={styles.hero}>
            <p className={styles.eyebrow}>Capture a thought</p>
            <h1 id="capture-title" className={styles.title}>Put it down while it’s here.</h1>
            <textarea autoFocus className={styles.bodyInput} placeholder="Start anywhere. You do not need to organize it." value={body} onChange={(event) => onBodyChange(event.target.value)} required />
          </div>
          <div className={styles.fields}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}><span className={styles.fieldLabel}>Optional title</span><input className={styles.control} placeholder="Give this thought a name" value={title} onChange={(event) => onTitleChange(event.target.value)} /></label>
              <label className={styles.field}><span className={styles.fieldLabel}>Kind of thought</span><select className={`${styles.control} ${styles.selectControl}`} value={thoughtType} onChange={(event) => onThoughtTypeChange(parseThoughtType(event.target.value))}><option value="thought">Thought</option><option value="journal">Journal</option><option value="quote">Quote</option><option value="book_excerpt">Book excerpt</option></select></label>
            </div>
            {thoughtType === "book_excerpt" ? <div className={styles.fieldGrid}><label className={styles.field}><span className={styles.fieldLabel}>Book</span><select className={`${styles.control} ${styles.selectControl}`} value={selectedBookId} onChange={(event) => onBookChange(event.target.value)} required><option value="">Select a saved book</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title} · {book.author}</option>)}<option value="__new__">+ Add a new book</option></select></label>{selectedBookId === "__new__" ? <div className={styles.fieldGrid}><label className={styles.field}><span className={styles.fieldLabel}>Book title</span><input className={styles.control} value={newBookTitle} onChange={(event) => onNewBookTitleChange(event.target.value)} required /></label><label className={styles.field}><span className={styles.fieldLabel}>Author</span><input className={styles.control} value={newBookAuthor} onChange={(event) => onNewBookAuthorChange(event.target.value)} required /></label></div> : null}</div> : null}
            <div className={styles.fieldGrid}><label className={styles.field}><span className={styles.fieldLabel}>Context, if useful</span><input className={styles.control} placeholder="Tags separated by commas" value={manualTags} onChange={(event) => onManualTagsChange(event.target.value)} /></label><label className={styles.consent}><span>Let Ask My Mind use this</span><input type="checkbox" checked={useWithAsk} onChange={(event) => onUseWithAskChange(event.target.checked)} /></label></div>
            <div className={styles.formFooter}><p className={styles.privacyNote}>AI access is off unless you enable it. Your original thought remains visible only inside your account.</p><button className={styles.submit} type="submit" disabled={!body.trim() || isSaving}>{isSaving ? "Keeping it…" : "Keep this thought →"}</button></div>
          </div>
        </form>
      </section>
    </div>
  );
}
