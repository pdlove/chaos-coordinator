import { CATEGORY_COLORS, type EventCategory } from "@chaos-coordinator/shared";

const LABELS: Record<EventCategory, string> = {
  Work: "Work",
  School: "School",
  Doctor: "Doctor",
  Home: "Home",
  Personal: "Personal",
  Activities: "Activities",
};

export function CategoryPill({ category, size = "sm" }: { category: EventCategory; size?: "sm" | "xs" }) {
  const { bg, fg } = CATEGORY_COLORS[category];
  return (
    <span
      className={`whitespace-nowrap rounded-full font-bold ${size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]"}`}
      style={{ background: bg, color: fg }}
    >
      {LABELS[category]}
    </span>
  );
}
