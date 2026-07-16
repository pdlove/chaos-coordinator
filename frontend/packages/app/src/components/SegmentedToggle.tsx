import type { ReactNode } from "react";

interface SegmentedToggleProps<T extends string> {
  /** `icon`, when given, renders instead of the text label (which becomes the aria-label). */
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}

/** The pill-group toggle pattern used throughout the design (Day/Week/Month, Menu/Recipes, chore sub-tabs). */
export function SegmentedToggle<T extends string>({ options, value, onChange }: SegmentedToggleProps<T>) {
  return (
    <div className="flex gap-1.5 rounded-full bg-chip p-[3px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-label={opt.icon ? opt.label : undefined}
          className={`rounded-full transition-colors ${opt.icon ? "flex h-7 w-7 items-center justify-center" : "px-2.5 py-1.5 text-[11px] font-bold"} ${
            value === opt.value ? "bg-ink text-white" : "text-ink-muted"
          }`}
        >
          {opt.icon ?? opt.label}
        </button>
      ))}
    </div>
  );
}
