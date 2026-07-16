import { useCalendarCategories } from "@chaos-coordinator/core";
import { CategoryPill } from "./CategoryPill";

interface CategoryFilterPillsProps {
  /** Empty set = show all (the additive-multi-select default). Values are category ids. */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/** Additive multi-select category filter, shared across the Day/Week/Month calendar views. */
export function CategoryFilterPills({ selected, onChange }: CategoryFilterPillsProps) {
  const { data: categories } = useCalendarCategories();

  function toggle(categoryId: string) {
    const next = new Set(selected);
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    onChange(next);
  }

  return (
    <div className="flex flex-none gap-2 overflow-x-auto px-5 pb-3.5">
      <button
        onClick={() => onChange(new Set())}
        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-bold ${
          selected.size === 0 ? "bg-ink text-white" : "bg-chip text-ink-muted"
        }`}
      >
        All
      </button>
      {categories?.map((c) => (
        <button
          key={c.id}
          onClick={() => toggle(c.id)}
          className={selected.size === 0 || selected.has(c.id) ? "opacity-100" : "opacity-50"}
        >
          <CategoryPill category={c} />
        </button>
      ))}
    </div>
  );
}
