import { categoryTint, type CategoryDto } from "@chaos-coordinator/shared";

export function CategoryPill({ category, size = "sm" }: { category: CategoryDto; size?: "sm" | "xs" }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full font-bold ${size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]"}`}
      style={{ background: categoryTint(category.color), color: category.color }}
    >
      {category.name}
    </span>
  );
}
