import { useState } from "react";
import type { RecurrenceType } from "@chaos-coordinator/shared";
import { FormHeader } from "../../components/FormHeader";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseCsvInts(csv: string | null | undefined): number[] {
  if (!csv) return [];
  return csv.split(",").map(Number).filter((n) => !isNaN(n));
}

export function choreRepeatSummary(recurrenceType: RecurrenceType, recurrenceDays: string | null): string {
  if (recurrenceType === "Daily") return "Daily";
  const days = parseCsvInts(recurrenceDays).map((d) => DAY_LETTERS[d]);
  return days.length > 0 ? `Weekly on ${days.join(", ")}` : "Weekly";
}

interface ChoreRepeatPickerScreenProps {
  initialRecurrenceType: RecurrenceType;
  initialRecurrenceDays: string | null;
  onCancel: () => void;
  onSave: (recurrenceType: RecurrenceType, recurrenceDays: string | null) => void;
}

/** Full-screen recurrence picker shared shape with the calendar's — Chore.RecurrenceType Weekly
 * and CustomDays both just store weekday-CSV in RecurrenceDays (see ChoreScheduling.cs), so one
 * day-of-week multi-select covers both: one day picked saves as Weekly, more than one as
 * CustomDays. Daily is its own mode with no days needed. */
export function ChoreRepeatPickerScreen({
  initialRecurrenceType,
  initialRecurrenceDays,
  onCancel,
  onSave,
}: ChoreRepeatPickerScreenProps) {
  const [daily, setDaily] = useState(initialRecurrenceType === "Daily");
  const [days, setDays] = useState<number[]>(
    initialRecurrenceType === "Daily" ? [] : parseCsvInts(initialRecurrenceDays)
  );

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  function handleSave() {
    if (daily) {
      onSave("Daily", null);
      return;
    }
    const recurrenceType: RecurrenceType = days.length === 1 ? "Weekly" : "CustomDays";
    onSave(recurrenceType, days.join(","));
  }

  const saveDisabled = !daily && days.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-app">
      <FormHeader title="Repeat" onCancel={onCancel} onSave={handleSave} saveDisabled={saveDisabled} saveLabel="Done" />
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <div className="flex gap-2">
          <button
            onClick={() => setDaily(true)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${daily ? "bg-ink text-white" : "bg-chip text-ink-muted"}`}
          >
            Daily
          </button>
          <button
            onClick={() => setDaily(false)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${!daily ? "bg-ink text-white" : "bg-chip text-ink-muted"}`}
          >
            Specific days
          </button>
        </div>

        {!daily && (
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
              <div className="text-xs font-medium text-ink-fainter">Pick at least one day.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
