import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Search,
  SearchX,
} from "lucide-react";
import { useMemo } from "react";

import type { Book, Thought } from "@/lib/api";
import type { LoadState } from "@/components/mind-palace-shell-helpers";

import styles from "./books-workspace.module.css";

type BooksWorkspaceProps = {
  books: Book[];
  activeBook: Book | null;
  thoughts: Thought[];
  booksLoadState: LoadState;
  bookLoadState: LoadState;
  bookPage: number;
  bookTotalPages: number;
  errorMessage: string;
  query: string;
  onQueryChange: (value: string) => void;
  onBookSelect: (bookId: string) => void;
  onBackToBooks: () => void;
  onSaveExcerpt: () => void;
  onOpenThought: (thought: Thought) => void;
  onBookPageChange: (page: number) => void;
  onRetryBooks: () => void;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "excerpt" : "excerpts"}`;
}

function BookListSkeleton() {
  return (
    <div className={styles.skeletonList} role="status" aria-label="Loading your books">
      {[0, 1, 2].map((item) => (
        <div className={styles.skeletonRow} key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function ExcerptListSkeleton() {
  return (
    <div className={styles.excerptSkeletonList} role="status" aria-label="Loading book excerpts">
      {[0, 1, 2].map((item) => (
        <div className={styles.excerptSkeleton} key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function BookList({
  books,
  booksLoadState,
  query,
  onQueryChange,
  onBookSelect,
  onSaveExcerpt,
  onRetryBooks,
}: Pick<
  BooksWorkspaceProps,
  | "books"
  | "booksLoadState"
  | "query"
  | "onQueryChange"
  | "onBookSelect"
  | "onSaveExcerpt"
  | "onRetryBooks"
>) {
  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return books;
    }
    return books.filter((book) =>
      `${book.title} ${book.author}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [books, query]);

  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Books</h1>
          <p className={styles.pageIntro}>
            The passages and ideas you chose to keep close.
          </p>
        </div>
        <button className="mp-button mp-button-primary" type="button" onClick={onSaveExcerpt}>
          <FilePlus2 size={17} aria-hidden="true" />
          Save an excerpt
        </button>
      </header>

      <div className={styles.searchField}>
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="book-search">Search books</label>
        <input
          id="book-search"
          type="search"
          value={query}
          placeholder="Search by title or author"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query ? (
          <button
            className={styles.clearSearch}
            type="button"
            aria-label="Clear book search"
            onClick={() => onQueryChange("")}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className={styles.listHeading}>
        <h2>Your shelf</h2>
        <span>{books.length} {books.length === 1 ? "book" : "books"}</span>
      </div>

      {booksLoadState === "loading" ? <BookListSkeleton /> : null}

      {booksLoadState === "error" ? (
        <div className={styles.stateMessage} role="alert">
          <SearchX size={20} aria-hidden="true" />
          <div>
            <strong>Books could not be loaded.</strong>
            <button type="button" onClick={onRetryBooks}>Try again</button>
          </div>
        </div>
      ) : null}

      {booksLoadState === "ready" && books.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyMark}><BookOpen size={22} aria-hidden="true" /></span>
          <h2>Start a shelf of your own.</h2>
          <p>Save a passage from a book and it will appear here for the next time you want to return to it.</p>
          <button className="mp-button mp-button-primary" type="button" onClick={onSaveExcerpt}>
            <FilePlus2 size={17} aria-hidden="true" />
            Save your first excerpt
          </button>
        </div>
      ) : null}

      {booksLoadState === "ready" && books.length > 0 && filteredBooks.length === 0 ? (
        <div className={styles.stateMessage}>
          <SearchX size={20} aria-hidden="true" />
          <p>No books match “{query}”.</p>
        </div>
      ) : null}

      {booksLoadState === "ready" && filteredBooks.length > 0 ? (
        <div className={styles.bookList}>
          {filteredBooks.map((book) => (
            <button
              className={styles.bookRow}
              key={book.id}
              type="button"
              onClick={() => onBookSelect(book.id)}
            >
              <span className={styles.bookMark} aria-hidden="true"><BookOpen size={19} /></span>
              <span className={styles.bookInfo}>
                <span className={styles.bookTitle}>{book.title}</span>
                <span className={styles.bookAuthor}>{book.author}</span>
              </span>
              <span className={styles.bookCount}>{countLabel(book.thought_count)}</span>
              <ArrowUpRight className={styles.bookArrow} size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BookDetail({
  book,
  thoughts,
  loadState,
  bookPage,
  bookTotalPages,
  errorMessage,
  onBackToBooks,
  onSaveExcerpt,
  onOpenThought,
  onBookPageChange,
}: {
  book: Book;
  thoughts: Thought[];
  loadState: LoadState;
  bookPage: number;
  bookTotalPages: number;
  errorMessage: string;
  onBackToBooks: () => void;
  onSaveExcerpt: () => void;
  onOpenThought: (thought: Thought) => void;
  onBookPageChange: (page: number) => void;
}) {
  return (
    <div className={styles.workspace}>
      <button className={styles.backButton} type="button" onClick={onBackToBooks}>
        <ChevronLeft size={16} aria-hidden="true" />
        All books
      </button>

      <header className={styles.detailHeader}>
        <span className={styles.detailMark} aria-hidden="true"><BookOpen size={25} /></span>
        <div className={styles.detailTitleBlock}>
          <h1 className={styles.detailTitle}>{book.title}</h1>
          <p className={styles.detailAuthor}>{book.author}</p>
        </div>
        <button className="mp-button mp-button-primary" type="button" onClick={onSaveExcerpt}>
          <FilePlus2 size={17} aria-hidden="true" />
          Save an excerpt
        </button>
      </header>

      <div className={styles.detailMeta}>
        <span>{countLabel(book.thought_count)}</span>
        <span>Added {formatDate(book.created_at)}</span>
      </div>

      <div className={styles.excerptHeader}>
        <h2>Saved excerpts</h2>
        <span>Open one to read it in full</span>
      </div>

      {loadState === "loading" ? <ExcerptListSkeleton /> : null}

      {loadState === "error" ? (
        <div className={styles.stateMessage} role="alert">
          <SearchX size={20} aria-hidden="true" />
          <p>{errorMessage || "These excerpts could not be loaded."}</p>
        </div>
      ) : null}

      {loadState === "ready" && thoughts.length === 0 ? (
        <div className={styles.emptyDetail}>
          <p>This book does not have any saved excerpts yet.</p>
          <button className="mp-button mp-button-primary" type="button" onClick={onSaveExcerpt}>
            <FilePlus2 size={17} aria-hidden="true" />
            Save the first excerpt
          </button>
        </div>
      ) : null}

      {loadState === "ready" && thoughts.length > 0 ? (
        <div className={styles.excerptList}>
          {thoughts.map((thought) => (
            <button
              className={styles.excerptRow}
              key={thought.id}
              type="button"
              onClick={() => onOpenThought(thought)}
            >
              <span className={styles.excerptIndex} aria-hidden="true">“</span>
              <span className={styles.excerptContent}>
                <span className={styles.excerptTitle}>{thought.title || "Untitled excerpt"}</span>
                <span className={styles.excerptBody}>{thought.body}</span>
                <span className={styles.excerptMeta}>
                  <CalendarDays size={14} aria-hidden="true" />
                  {thought.page_reference ? `Page ${thought.page_reference}` : formatDate(thought.created_at)}
                </span>
              </span>
              <ArrowUpRight className={styles.excerptArrow} size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {loadState === "ready" && bookTotalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Book excerpts pagination">
          <button
            type="button"
            disabled={bookPage <= 1}
            onClick={() => onBookPageChange(bookPage - 1)}
          >
            <ChevronLeft size={15} aria-hidden="true" />
            Previous
          </button>
          <span>Page {bookPage} of {bookTotalPages}</span>
          <button
            type="button"
            disabled={bookPage >= bookTotalPages}
            onClick={() => onBookPageChange(bookPage + 1)}
          >
            Next
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

export function BooksWorkspace({
  books,
  activeBook,
  thoughts,
  booksLoadState,
  bookLoadState,
  bookPage,
  bookTotalPages,
  errorMessage,
  query,
  onQueryChange,
  onBookSelect,
  onBackToBooks,
  onSaveExcerpt,
  onOpenThought,
  onBookPageChange,
  onRetryBooks,
}: BooksWorkspaceProps) {
  if (activeBook) {
    return (
      <BookDetail
        book={activeBook}
        thoughts={thoughts}
        loadState={bookLoadState}
        bookPage={bookPage}
        bookTotalPages={bookTotalPages}
        errorMessage={errorMessage}
        onBackToBooks={onBackToBooks}
        onSaveExcerpt={onSaveExcerpt}
        onOpenThought={onOpenThought}
        onBookPageChange={onBookPageChange}
      />
    );
  }

  return (
    <BookList
      books={books}
      booksLoadState={booksLoadState}
      query={query}
      onQueryChange={onQueryChange}
      onBookSelect={onBookSelect}
      onSaveExcerpt={onSaveExcerpt}
      onRetryBooks={onRetryBooks}
    />
  );
}
