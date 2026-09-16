import type { Book } from "@/lib/api";

type BooksWorkspaceProps = {
  books: Book[];
  onBookSelect: (bookId: string) => void;
};

export function BooksWorkspace({ books, onBookSelect }: BooksWorkspaceProps) {
  return (
    <div className="mind-workspace-enter w-full max-w-5xl">
      <div className="mb-8 max-w-2xl"><p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#35a79f]">[ Books / 05 ]</p><h1 className="mt-4 font-display text-5xl font-medium tracking-[-0.055em] text-[#202329] sm:text-6xl">Books you have kept close.</h1><p className="mt-5 text-sm leading-6 text-[#777c86]">Open a book to revisit its saved excerpts and thoughts.</p></div>
      {books.length === 0 ? <div className="rounded-[24px] border border-black/[0.08] bg-white/80 p-8 text-sm text-[#777c86] shadow-[0_20px_60px_rgba(31,35,45,0.07)]">Your saved books will appear here when you add your first book excerpt.</div> : <div className="grid gap-3 sm:grid-cols-2">{books.map((book, index) => <button key={book.id} className="reminisce-category-card rounded-[24px] border border-black/[0.08] bg-white/80 p-6 text-left shadow-[0_20px_60px_rgba(31,35,45,0.07)] hover:-translate-y-1 hover:border-[#cfd6ec] hover:bg-white hover:shadow-[0_28px_70px_rgba(31,35,45,0.12)] active:translate-y-0" type="button" onClick={() => onBookSelect(book.id)}><span className="text-[10px] font-semibold tracking-[0.18em] text-[#9a9ea7]">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-6 font-display text-2xl font-semibold tracking-[-0.035em] text-[#24272d]">{book.title}</h2><p className="mt-2 text-sm text-[#777c86]">{book.author}</p><p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a9ea7]">{book.thought_count} {book.thought_count === 1 ? "saved thought" : "saved thoughts"}</p></button>)}</div>}
    </div>
  );
}
