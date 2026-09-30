import type { RememberOverview } from "@/lib/api";
import { ArrowUpRight } from "lucide-react";
import { EMPTY_REMEMBER_CATEGORIES, ReminisceCategoryDetail, type RememberCategoryData } from "@/components/mind-palace-shell-helpers";
import styles from "./reminisce-workspace.module.css";

type Props = {
  overview: RememberOverview | null; selectedCategory: RememberCategoryData["key"] | null;
  onSelectCategory: (key: RememberCategoryData["key"]) => void; onClearCategory: () => void;
  onCategoryItemClick: (key: RememberCategoryData["key"], value: string) => void;
};
export function ReminisceWorkspace({ overview, selectedCategory, onSelectCategory, onClearCategory, onCategoryItemClick }: Props) {
  const categories = overview?.categories ?? EMPTY_REMEMBER_CATEGORIES;
  const count = overview?.thoughts_analyzed ?? 0;
  return <div className={`mind-workspace-enter ${styles.layout}`}>
    <header><h1 className="text-display-lg">Patterns, without the filing.</h1><p className={styles.description}>{count} saved {count === 1 ? "thought contributes" : "thoughts contribute"} to this view.</p></header>
    <div className={styles.categories}>{selectedCategory ? <ReminisceCategoryDetail category={categories.find(c => c.key === selectedCategory) ?? categories[0]} onBack={onClearCategory} onItemClick={onCategoryItemClick} /> : categories.map((category) => {
      const n = category.items.length;
      return <button key={category.key} className={styles.card} type="button" aria-label={`Open ${category.label}`} onClick={() => onSelectCategory(category.key)}>
        <ArrowUpRight size={20} aria-hidden="true" className={styles.arrow} />
        <h2>{category.label}</h2><p className={styles.count}>{n} {n === 1 ? category.key === "tags" ? "tag" : "book" : category.label.toLowerCase()} identified</p>
        <p className={styles.helper}>{category.key === "tags" ? "Tags you add when saving gather here." : "Quotes you save from books appear here."}</p>
      </button>;
    })}</div>
  </div>;
}
