import {
  BookMarked,
  ChevronLeft,
  Tag,
} from "lucide-react";
import { useState } from "react";

import type {
  ExportRequest,
  RememberOverview,
  SearchMode,
  ThoughtListOptions,
  ThoughtType,
} from "@/lib/api";

export function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

export function parseThoughtType(value: string): ThoughtType {
  if (value === "journal" || value === "quote" || value === "book_excerpt") {
    return value;
  }
  return "thought";
}

export type LabelFilterKey = "tag" | "book";

export type RememberCategoryData = RememberOverview["categories"][number];

export function ReminisceCategoryDetail({
  category,
  onBack,
  onItemClick,
}: {
  category: RememberCategoryData;
  onBack: () => void;
  onItemClick: (categoryKey: RememberCategoryData["key"], value: string) => void;
}) {
  const CategoryIcon = category.key === "tags" ? Tag : BookMarked;

  return (
    <div className="col-span-full border-t border-[var(--mp-line)] py-6">
      <button
        className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--mp-text-3)] hover:text-[var(--mp-lumen-text)]"
        type="button"
        onClick={onBack}
      >
        <ChevronLeft size={14} aria-hidden="true" />
        All categories
      </button>
      <div className="mt-6 flex items-center gap-3">
        <span className="text-[var(--mp-text-3)]">
          <CategoryIcon size={21} aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-3xl text-[var(--mp-text)]">
            {category.label}
          </h2>
        </div>
      </div>
      {category.items.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--mp-text-3)]">Still taking shape</p>
      ) : (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {category.items.map((item, index) => (
            <button
              key={item.label}
              className="reminisce-bubble-enter rounded-full border border-[var(--mp-line-strong)] bg-transparent px-4 py-3 text-sm text-[var(--mp-text-2)] transition-colors hover:border-[var(--mp-lumen-text)] hover:bg-[var(--mp-surface-2)] hover:text-[var(--mp-lumen-text)]"
              style={{ animationDelay: `${index * 45}ms` }}
              type="button"
              onClick={() => onItemClick(category.key, item.label)}
            >
              {item.label}
              <sup className="ml-1 text-[var(--mp-text-3)]">{item.count}</sup>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompactLabelList({
  labels,
  maxVisible = 5,
}: {
  labels: string[];
  maxVisible?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (labels.length === 0) {
    return null;
  }

  const visibleLabels = isExpanded ? labels : labels.slice(0, maxVisible);
  const hiddenCount = labels.length - visibleLabels.length;
  const labelClassName = "mp-tag";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {visibleLabels.map((label) => (
        <span key={label} className={labelClassName}>
          {label}
        </span>
      ))}
      {labels.length > maxVisible ? (
        <button
          className="px-1 text-[12px] font-semibold text-[var(--mp-lumen-text)] hover:text-[var(--mp-lumen-text)]"
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? "Show fewer" : `+${hiddenCount} more`}
        </button>
      ) : null}
    </div>
  );
}

export function isExportExpired(exportRequest: ExportRequest): boolean {
  return exportRequest.status === "expired" || new Date(exportRequest.expires_at) <= new Date();
}

export type LoadState = "idle" | "loading" | "ready" | "error";
export type ArchiveFilter = "all" | "active" | "archived";
export type WorkspaceMode = "hub" | "organizing" | "reminisce" | "ask" | "books" | "profile";

export type RecallFilters = {
  q: string;
  search_mode: SearchMode;
  thought_type: string;
  tag: string;
  book: string;
  book_id: string;
  archive: ArchiveFilter;
};

export const DEFAULT_RECALL_FILTERS: RecallFilters = {
  q: "",
  search_mode: "keyword",
  thought_type: "",
  tag: "",
  book: "",
  book_id: "",
  archive: "all",
};

export const RECALL_PAGE_SIZE = 20;
export const EMPTY_REMEMBER_CATEGORIES: RememberOverview["categories"] = [
  { key: "tags", label: "Tags", items: [] },
  { key: "books", label: "Books", items: [] },
];

export function recallQuery(filters: RecallFilters, page: number): ThoughtListOptions {
  return {
    q: filters.q.trim() || undefined,
    search_mode: filters.search_mode,
    thought_type: filters.thought_type || undefined,
    tag: filters.tag.trim() || undefined,
    book: filters.book.trim() || undefined,
    book_id: filters.book_id || undefined,
    is_archived: filters.archive === "all" ? undefined : filters.archive === "archived",
    page,
    page_size: RECALL_PAGE_SIZE,
  };
}

export function hasRecallFilterValues(filters: RecallFilters): boolean {
  return Object.entries(filters).some(([key, value]) =>
    key !== "search_mode" && value !== "" && value !== "all",
  );
}

export function activeRecallFilterLabels(filters: RecallFilters): string[] {
  return [
    filters.q.trim() ? `Search: ${filters.q.trim()}` : "",
    filters.q.trim() && filters.search_mode === "semantic" ? "Mode: meaning" : "",
    filters.thought_type ? `Type: ${formatStatus(filters.thought_type)}` : "",
    filters.tag.trim() ? `Tag: ${filters.tag.trim()}` : "",
    filters.book.trim() ? `Book: ${filters.book.trim()}` : filters.book_id ? "Book: selected" : "",
    filters.archive !== "all" ? `Archive: ${filters.archive}` : "",
  ].filter((label): label is string => Boolean(label));
}
