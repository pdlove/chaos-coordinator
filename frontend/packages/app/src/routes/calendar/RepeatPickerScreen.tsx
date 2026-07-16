import { useState } from "react";
import { FormHeader } from "../../components/FormHeader";
import { FloatingInput } from "../../components/FloatingLabelInput";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface RepeatPickerScreenProps {
  initialDays: number[];
  initialEnd: string;
  onCancel: () => void;
  onSave: (days: number[], end: string) => void;
}

/** Full-screen picker for recurrence (days of week + optional end date) — opened from a summary
 * row in EventFormScreen rather than staying inline in the main form (plan_001.md Workstream 5). */
export function RepeatPickerScreen({ initialDays, initialEnd, onCancel, onSave }: RepeatPickerScreenProps) {
  const [days, setDays] = useState<number[]>(initialDays);
  const [end, setEnd] = useState(initialEnd);

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-app">
      <FormHeader title="Repeat" onCancel={onCancel} onSave={() => onSave(days, end)} saveLabel="Done" />
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Repeats on</span>
          <div className="flex gap-1.5">
            {DAY_LETTERS.map((label, day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                aria-label={DAY_NAMES[day]}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                  days.includes(day) ? "bg-ink text-white" : "bg-chip text-ink-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {days.length === 0 && (
            <div className="text-xs font-medium text-ink-fainter">
              Pick at least one day, or Cancel to leave this event as a one-time entry.
            </div>
          )}
        </div>

        {days.length > 0 && (
          <FloatingInput label="Ends (optional)" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        )}
      </div>
    </div>
  );
}
