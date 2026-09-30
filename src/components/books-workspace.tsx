import type { Book } from "@/lib/api";
import { ArrowUpRight } from "lucide-react";

type BooksWorkspaceProps = {
  books: Book[];
  onBookSelect: (bookId: string) => void;
};

export function BooksWorkspace({ books, onBookSelect }: BooksWorkspaceProps) {
  return (
    <div className="mind-workspace-enter w-full max-w-5xl">
      <div className="mb-8 max-w-2xl"><h1 className="text-display-lg">Books you have kept close.</h1><p className="mt-4 text-sm leading-6 text-[var(--mp-text-3)]">Open a book to revisit its saved excerpts and thoughts.</p></div>
      {books.length === 0 ? <p className="border-t border-[var(--mp-line)] py-8 text-sm text-[var(--mp-text-3)]">Your saved books will appear here when you add your first book excerpt.</p> : <div className="border-t border-[var(--mp-line)]">{books.map((book) => <button key={book.id} className="flex w-full items-center gap-6 border-b border-[var(--mp-line)] px-2 py-6 text-left transition-colors hover:bg-[var(--mp-surface-2)]" type="button" onClick={() => onBookSelect(book.id)}><span className="min-w-0 flex-1"><span className="block font-display text-2xl text-[var(--mp-text)]">{book.title}</span><span className="mt-1 block text-sm text-[var(--mp-text-3)]">{book.author}</span></span><span className="text-sm text-[var(--mp-text-3)]">{book.thought_count} {book.thought_count === 1 ? "thought" : "thoughts"}</span><ArrowUpRight size={18} className="shrink-0 text-[var(--mp-text-3)]" aria-hidden="true" /></button>)}</div>}
    </div>
  );
}
