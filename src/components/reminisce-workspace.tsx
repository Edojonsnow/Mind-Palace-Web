import type { RememberOverview } from "@/lib/api";
import { EMPTY_REMEMBER_CATEGORIES, ReminisceCategoryDetail, type RememberCategoryData } from "@/components/mind-palace-shell-helpers";

type ReminisceWorkspaceProps = {
  overview: RememberOverview | null;
  selectedCategory: RememberCategoryData["key"] | null;
  onSelectCategory: (key: RememberCategoryData["key"]) => void;
  onClearCategory: () => void;
  onCategoryItemClick: (categoryKey: RememberCategoryData["key"], value: string) => void;
};

export function ReminisceWorkspace({ overview, selectedCategory, onSelectCategory, onClearCategory, onCategoryItemClick }: ReminisceWorkspaceProps) {
  const categories = overview?.categories ?? EMPTY_REMEMBER_CATEGORIES;

  return (
    <div className="mind-workspace-enter w-full max-w-6xl"><div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14"><header><p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#35a79f]">[ Reminisce / 04 ]</p><h1 className="mt-5 font-display text-5xl font-medium leading-[0.98] tracking-[-0.055em] text-[#202329] sm:text-7xl">Patterns, without the filing.</h1><p className="mt-6 max-w-sm text-sm leading-6 text-[#747983]">{overview?.thoughts_analyzed ?? 0} AI-enabled thoughts have contributed to this view.</p></header><div className="grid gap-3 sm:grid-cols-2">{selectedCategory ? <ReminisceCategoryDetail category={categories.find((category) => category.key === selectedCategory) ?? categories[0]} onBack={onClearCategory} onItemClick={onCategoryItemClick} /> : categories.map((category, index) => <button key={category.key} className="reminisce-category-card rounded-[26px] border border-black/[0.08] bg-white/80 p-6 text-left shadow-[0_20px_60px_rgba(31,35,45,0.07)] backdrop-blur-xl hover:-translate-y-1 hover:border-[#cfd6ec] hover:bg-white hover:shadow-[0_28px_70px_rgba(31,35,45,0.12)] active:translate-y-0" type="button" aria-label={`Open ${category.label}`} onClick={() => onSelectCategory(category.key)}><span className="text-[10px] font-semibold tracking-[0.18em] text-[#9a9ea7]">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-7 font-display text-2xl font-semibold tracking-[-0.035em] text-[#24272d]">{category.label}</h2><p className="mt-5 text-sm text-[#8b909a]">{category.items.length > 0 ? `${category.items.length} ${category.label.toLowerCase()} identified` : "Still taking shape"}</p></button>)}</div></div></div>
  );
}
