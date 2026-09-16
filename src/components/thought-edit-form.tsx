import type { FormEvent } from "react";

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
    <form className="mt-3 grid gap-3" onSubmit={onSubmit}>
      <label className="grid gap-1 text-xs text-[#68738a]">
        Title
        <input
          className="h-10 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs text-[#68738a]">
        Thought
        <textarea
          className="min-h-28 resize-y rounded-xl border border-[#dde2ee] bg-[#f6f8fc] p-3 text-sm leading-6 text-[#172033] outline-none focus:border-[#263a67]"
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-[#68738a]">
          Type
          <select
            className="h-10 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
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
        <label className="grid gap-1 text-xs text-[#68738a]">
          Manual tags
          <input
            className="h-10 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
            placeholder="e.g. work, ideas"
            value={manualTags}
            onChange={(event) => onManualTagsChange(event.target.value)}
          />
        </label>
      </div>
      {thoughtType === "book_excerpt" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-[#68738a]">
            Book
            <select
              className="h-10 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
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
              <label className="grid gap-1 text-xs text-[#68738a]">
                Book title
                <input
                  className="h-10 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
                  value={bookTitle}
                  onChange={(event) => onBookTitleChange(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1 text-xs text-[#68738a]">
                Author
                <input
                  className="h-10 rounded-xl border border-[#dde2ee] bg-[#f6f8fc] px-3 text-sm text-[#172033] outline-none focus:border-[#263a67]"
                  value={bookAuthor}
                  onChange={(event) => onBookAuthorChange(event.target.value)}
                  required
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-xs text-[#68738a]">
        <input
          type="checkbox"
          checked={useWithAsk}
          onChange={(event) => onUseWithAskChange(event.target.checked)}
        />
        Use with Ask My Mind
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#263a67] px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={isUpdating || !body.trim()}
        >
          <Check size={15} aria-hidden="true" />
          {isUpdating ? "Saving..." : "Save changes"}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dde2ee] px-3 text-xs text-[#263a67] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={onCancel}
          disabled={isUpdating}
        >
          <X size={15} aria-hidden="true" />
          Cancel
        </button>
      </div>
    </form>
  );
}
