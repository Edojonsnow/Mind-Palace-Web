import {
  BookMarked,
  ChevronLeft,
  Tag,
} from "lucide-react";
import { useState } from "react";

import type {
  ExportRequest,
  RememberOverview,
  Thought,
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

export type ThoughtLabel = {
  label: string;
  value: string;
  filterKey: LabelFilterKey;
};

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
    <div className="col-span-full rounded-[26px] border border-black/[0.08] bg-white/80 p-6 shadow-[0_20px_60px_rgba(31,35,45,0.07)] backdrop-blur-xl sm:p-8">
      <button
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#777c86] hover:text-[#345f60]"
        type="button"
        onClick={onBack}
      >
        <ChevronLeft size={14} aria-hidden="true" />
        All categories
      </button>
      <div className="mt-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3ef] text-[#587878]">
          <CategoryIcon size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a9ea7]">
            Category view
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.04em] text-[#24272d]">
            {category.label}
          </h2>
        </div>
      </div>
      {category.items.length === 0 ? (
        <p className="mt-8 text-sm text-[#8b909a]">Still taking shape</p>
      ) : (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {category.items.map((item, index) => (
            <button
              key={item.label}
              className="reminisce-bubble-enter rounded-full border border-[#d9deef] bg-[#f7f8fd] px-4 py-3 text-sm text-[#4f5d7c] shadow-[0_8px_20px_rgba(38,58,103,0.05)] hover:-translate-y-1 hover:border-[#587878] hover:bg-white hover:text-[#345f60] hover:shadow-[0_14px_28px_rgba(38,58,103,0.12)] active:translate-y-0"
              style={{ animationDelay: `${index * 45}ms` }}
              type="button"
              onClick={() => onItemClick(category.key, item.label)}
            >
              {item.label}
              <sup className="ml-1 text-[#969ba4]">{item.count}</sup>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function manualThoughtLabels(thought: Thought): ThoughtLabel[] {
  return thought.manual_tags.map((value) => ({ label: value, value, filterKey: "tag" }));
}

export function CompactLabelList({
  labels,
  maxVisible = 5,
  onLabelClick,
}: {
  labels: ThoughtLabel[];
  maxVisible?: number;
  onLabelClick?: (label: ThoughtLabel) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (labels.length === 0) {
    return null;
  }

  const visibleLabels = isExpanded ? labels : labels.slice(0, maxVisible);
  const hiddenCount = labels.length - visibleLabels.length;
  const labelClassName = "rounded-full border border-[#e0e7e6] px-2 py-1 text-[10px] text-[#68787a]";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {visibleLabels.map((label) => (
        onLabelClick ? (
          <button
            key={`${label.filterKey}:${label.value}`}
            className={`${labelClassName} cursor-pointer hover:border-[#587878] hover:text-[#345f60]`}
            type="button"
            title={`Filter by ${label.label}`}
            onClick={() => onLabelClick(label)}
          >
            {label.label}
          </button>
        ) : (
          <span key={`${label.filterKey}:${label.value}`} className={labelClassName}>
            {label.label}
          </span>
        )
      ))}
      {labels.length > maxVisible ? (
        <button
          className="px-1 text-[10px] font-semibold text-[#587878] hover:text-[#345f60]"
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
export type WorkspaceMode = "hub" | "organizing" | "reminisce" | "search" | "ask" | "books";

export type RecallFilters = {
  q: string;
  thought_type: string;
  tag: string;
  book: string;
  book_id: string;
  archive: ArchiveFilter;
};

export const DEFAULT_RECALL_FILTERS: RecallFilters = {
  q: "",
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
    thought_type: filters.thought_type || undefined,
    tag: filters.tag.trim() || undefined,
    book: filters.book.trim() || undefined,
    book_id: filters.book_id || undefined,
    is_archived: filters.archive === "all" ? undefined : filters.archive === "archived",
    page,
    page_size: RECALL_PAGE_SIZE,
  };
}

export function activeRecallFilterLabels(filters: RecallFilters): string[] {
  return [
    filters.q.trim() ? `Search: ${filters.q.trim()}` : "",
    filters.thought_type ? `Type: ${formatStatus(filters.thought_type)}` : "",
    filters.tag.trim() ? `Tag: ${filters.tag.trim()}` : "",
    filters.book.trim() ? `Book: ${filters.book.trim()}` : filters.book_id ? "Book: selected" : "",
    filters.archive !== "all" ? `Archive: ${filters.archive}` : "",
  ].filter((label): label is string => Boolean(label));
}
