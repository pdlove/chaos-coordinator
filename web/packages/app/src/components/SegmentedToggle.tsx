interface SegmentedToggleProps<T extends string> {
  options: { value: T; label: string }[];
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
          className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
            value === opt.value ? "bg-ink text-white" : "text-ink-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
