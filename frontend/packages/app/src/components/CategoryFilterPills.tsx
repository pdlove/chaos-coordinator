import type { EventCategory } from "@chaos-coordinator/shared";
import { CategoryPill } from "./CategoryPill";

const CATEGORIES: EventCategory[] = ["Work", "School", "Doctor", "Home", "Personal", "Activities"];

interface CategoryFilterPillsProps {
  /** Empty set = show all (the additive-multi-select default). */
  selected: Set<EventCategory>;
  onChange: (next: Set<EventCategory>) => void;
}

/** Additive multi-select category filter, shared across the Day/Week/Month calendar views. */
export function CategoryFilterPills({ selected, onChange }: CategoryFilterPillsProps) {
  function toggle(category: EventCategory) {
    const next = new Set(selected);
    if (next.has(category)) next.delete(category);
    else next.add(category);
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
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => toggle(c)}
          className={selected.size === 0 || selected.has(c) ? "opacity-100" : "opacity-50"}
        >
          <CategoryPill category={c} />
        </button>
      ))}
    </div>
  );
}
