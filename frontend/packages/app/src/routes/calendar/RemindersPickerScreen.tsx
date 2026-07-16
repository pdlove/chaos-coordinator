import { useState } from "react";
import { FormHeader } from "../../components/FormHeader";

export const REMINDER_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "At time of event" },
  { minutes: 10, label: "10 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 1440, label: "1 day before" },
];

export function formatReminderMinutes(minutes: number): string {
  return REMINDER_PRESETS.find((p) => p.minutes === minutes)?.label ?? `${minutes} minutes before`;
}

interface RemindersPickerScreenProps {
  initialMinutes: number[];
  onCancel: () => void;
  onSave: (minutes: number[]) => void;
}

/** Full-screen picker for reminders (storage/display only — no delivery infra yet, see decision
 * #8 in plan_001.md). Opened from a summary row in EventFormScreen. */
export function RemindersPickerScreen({ initialMinutes, onCancel, onSave }: RemindersPickerScreenProps) {
  const [selected, setSelected] = useState<number[]>(initialMinutes);

  function toggle(minutes: number) {
    setSelected((prev) =>
      prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes].sort((a, b) => a - b)
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-app">
      <FormHeader title="Reminders" onCancel={onCancel} onSave={() => onSave(selected)} saveLabel="Done" />
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-5 py-5">
        {REMINDER_PRESETS.map((p) => {
          const active = selected.includes(p.minutes);
          return (
            <button
              key={p.minutes}
              onClick={() => toggle(p.minutes)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                active ? "bg-ink text-white" : "bg-card text-ink"
              }`}
            >
              {p.label}
              {active && <span aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
