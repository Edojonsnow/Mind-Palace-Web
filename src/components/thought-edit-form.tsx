import type { FormEvent } from "react";
import { ValidatedForm } from "./ui";

import type { Book, ThoughtType } from "@/lib/api";
import { parseThoughtType } from "@/components/mind-palace-shell-helpers";
import { Check, X } from "lucide-react";

type ThoughtEditFormProps = {
  title: string;
  body: string;
  thoughtType: ThoughtType;
  books: Book[];
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  manualTags: string;
  useWithAsk: boolean;
  isUpdating: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onThoughtTypeChange: (value: ThoughtType) => void;
  onBookIdChange: (value: string) => void;
  onBookTitleChange: (value: string) => void;
  onBookAuthorChange: (value: string) => void;
  onManualTagsChange: (value: string) => void;
  onUseWithAskChange: (value: boolean) => void;
  onCancel: () => void;
};

export function ThoughtEditForm({
  title,
  body,
  thoughtType,
  books,
  bookId,
  bookTitle,
  bookAuthor,
  manualTags,
  useWithAsk,
  isUpdating,
  onSubmit,
  onTitleChange,
  onBodyChange,
  onThoughtTypeChange,
  onBookIdChange,
  onBookTitleChange,
  onBookAuthorChange,
  onManualTagsChange,
  onUseWithAskChange,
  onCancel,
}: ThoughtEditFormProps) {
  return (
    <ValidatedForm className="mp-edit mt-3 grid gap-3" onSubmit={onSubmit}>
      <label className="grid gap-1 text-xs text-[var(--mp-text-3)]">
        Title
        <input
          className="modern-control"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs text-[var(--mp-text-3)]">
        Thought
        <textarea
          className="min-h-28 resize-y rounded-xl border border-[var(--mp-line-strong)] bg-[var(--mp-surface)] p-3 text-sm leading-6 text-[var(--mp-text)] outline-none focus:border-[var(--mp-lumen-text)]"
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-[var(--mp-text-3)]">
          Type
          <select
            className="modern-control"
            value={thoughtType}
            onChange={(event) =>
              onThoughtTypeChange(parseThoughtType(event.target.value))
            }
          >
            <option value="thought">Thought</option>
            <option value="journal">Journal</option>
            <option value="quote">Quote</option>
            <option value="book_excerpt">Book excerpt</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[var(--mp-text-3)]">
          Manual tags
          <input
            className="modern-control"
            placeholder="e.g. work, ideas"
            value={manualTags}
            onChange={(event) => onManualTagsChange(event.target.value)}
          />
        </label>
      </div>
      {thoughtType === "book_excerpt" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-[var(--mp-text-3)]">
            Book
            <select
              className="modern-control"
              value={bookId}
              onChange={(event) => onBookIdChange(event.target.value)}
              required
            >
              <option value="">Select a saved book</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} · {book.author}
                </option>
              ))}
              <option value="__new__">+ Add a new book</option>
            </select>
          </label>
          {bookId === "__new__" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-[var(--mp-text-3)]">
                Book title
                <input
                  className="modern-control"
                  value={bookTitle}
                  onChange={(event) => onBookTitleChange(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1 text-xs text-[var(--mp-text-3)]">
                Author
                <input
                  className="modern-control"
                  value={bookAuthor}
                  onChange={(event) => onBookAuthorChange(event.target.value)}
                  required
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-xs text-[var(--mp-text-3)]">
        <input
          type="checkbox"
          checked={useWithAsk}
          onChange={(event) => onUseWithAskChange(event.target.checked)}
        />
        Use with Ask My Mind
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="mp-button mp-button-primary"
          type="submit"
          disabled={isUpdating || !body.trim()}
        >
          <Check size={15} aria-hidden="true" />
          {isUpdating ? "Saving..." : "Save changes"}
        </button>
        <button
          className="mp-button mp-button-secondary"
          type="button"
          onClick={onCancel}
          disabled={isUpdating}
        >
          <X size={15} aria-hidden="true" />
          Cancel
        </button>
      </div>
    </ValidatedForm>
  );
}
