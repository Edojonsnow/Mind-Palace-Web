import type { FormEvent } from "react";

import type { Book, ThoughtType } from "@/lib/api";
import { parseThoughtType } from "@/components/mind-palace-shell-helpers";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17191d]/55 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close thought composer" onClick={onClose} />
      <section className="capture-panel-enter relative z-10 flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-[#f7f7f4] shadow-[0_50px_160px_rgba(0,0,0,0.32)]">
        <header className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-[#35a79f]" /><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#727780]">Private capture / autosaved after submission</p></div>
          <button className="h-10 rounded-full border border-black/10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#565b64] hover:bg-white" type="button" onClick={onClose}>Close</button>
        </header>
        <form className="min-h-0 overflow-y-auto" onSubmit={onSubmit}>
          <div className="px-5 pb-5 pt-7 sm:px-10 sm:pb-8 sm:pt-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f7fd8]">[ New thought ]</p>
            <h1 id="capture-title" className="mt-3 font-display text-4xl font-medium tracking-[-0.05em] text-[#202329] sm:text-5xl">What is moving through your mind?</h1>
            <textarea autoFocus className="mt-7 min-h-52 w-full resize-none border-0 bg-transparent font-display text-xl leading-9 tracking-[-0.025em] text-[#30343b] outline-none placeholder:text-[#a4a7ad] sm:min-h-64 sm:text-2xl" placeholder="Start anywhere. You do not need to organize it." value={body} onChange={(event) => onBodyChange(event.target.value)} required />
          </div>
          <div className="border-t border-black/[0.07] bg-white/70 px-5 py-5 sm:px-8">
            <div className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr]">
              <label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Optional title</span><input className="modern-control w-full" placeholder="Give this thought a name" value={title} onChange={(event) => onTitleChange(event.target.value)} /></label>
              <label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Kind of thought</span><select className="modern-control w-full" value={thoughtType} onChange={(event) => onThoughtTypeChange(parseThoughtType(event.target.value))}><option value="thought">Thought</option><option value="journal">Journal</option><option value="quote">Quote</option><option value="book_excerpt">Book excerpt</option></select></label>
            </div>
            {thoughtType === "book_excerpt" ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Book</span><select className="modern-control w-full" value={selectedBookId} onChange={(event) => onBookChange(event.target.value)} required><option value="">Select a saved book</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title} · {book.author}</option>)}<option value="__new__">+ Add a new book</option></select></label>{selectedBookId === "__new__" ? <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Book title</span><input className="modern-control w-full" value={newBookTitle} onChange={(event) => onNewBookTitleChange(event.target.value)} required /></label><label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Author</span><input className="modern-control w-full" value={newBookAuthor} onChange={(event) => onNewBookAuthorChange(event.target.value)} required /></label></div> : null}</div> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a8f98]">Context, if useful</span><input className="modern-control w-full" placeholder="Tags separated by commas" value={manualTags} onChange={(event) => onManualTagsChange(event.target.value)} /></label><label className="flex min-h-12 items-center justify-between gap-6 rounded-2xl border border-black/[0.08] bg-[#f3f3f0] px-4 text-xs font-medium text-[#4d525b]"><span>Let Ask My Mind use this</span><input className="h-4 w-4 accent-[#24272d]" type="checkbox" checked={useWithAsk} onChange={(event) => onUseWithAskChange(event.target.checked)} /></label></div>
            <div className="mt-5 flex items-center justify-between gap-4"><p className="hidden max-w-md text-xs leading-5 text-[#8a8f98] sm:block">AI access is off unless you enable it. Your original thought remains visible only inside your account.</p><button className="h-12 shrink-0 rounded-full bg-[#24272d] px-7 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-35" type="submit" disabled={!body.trim() || isSaving}>{isSaving ? "Keeping it…" : "Keep this thought →"}</button></div>
          </div>
        </form>
      </section>
    </div>
  );
}
