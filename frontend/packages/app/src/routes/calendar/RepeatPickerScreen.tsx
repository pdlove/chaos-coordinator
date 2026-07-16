import { useState } from "react";
import { FormHeader } from "../../components/FormHeader";
import { FloatingInput } from "../../components/FloatingLabelInput";
import type { RecurrenceFrequency } from "@chaos-coordinator/shared";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FREQUENCIES: ("Never" | RecurrenceFrequency)[] = ["Never", "Daily", "Weekly", "Monthly"];
const ORDINALS: { value: number; label: string }[] = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
];
const ORDINAL_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", "-1": "last" };

export interface RecurrenceValue {
  frequency: RecurrenceFrequency | null; // null = does not repeat
  interval: number;
  days: number[]; // Weekly only
  monthMode: "date" | "weekday"; // Monthly only
  monthDay: number; // Monthly "date" mode: 1-31, or -1 for last day
  weekOrdinal: number; // Monthly "weekday" mode: 1-4, or -1 for last
  weekday: number; // Monthly "weekday" mode: DayOfWeek int
  end: string; // date input value, "" = open-ended
}

/** A one-time event's sensible starting point if the user turns on repeating — weekly on the
 * event's own day, monthly on the event's own date/nth-weekday. */
export function defaultRecurrence(referenceDate: Date): RecurrenceValue {
  return {
    frequency: null,
    interval: 1,
    days: [referenceDate.getDay()],
    monthMode: "date",
    monthDay: referenceDate.getDate(),
    weekOrdinal: Math.min(4, Math.ceil(referenceDate.getDate() / 7)),
    weekday: referenceDate.getDay(),
    end: "",
  };
}

export function repeatSummary(v: RecurrenceValue): string {
  if (!v.frequency) return "Does not repeat";
  const until = v.end ? `, until ${new Date(v.end).toLocaleDateString([], { month: "short", day: "numeric" })}` : "";

  if (v.frequency === "Daily") {
    return (v.interval === 1 ? "Daily" : `Every ${v.interval} days`) + until;
  }
  if (v.frequency === "Weekly") {
    const labels = v.days.map((d) => DAY_SHORT[d]).join(", ") || "no days picked";
    return (v.interval === 1 ? `Weekly on ${labels}` : `Every ${v.interval} weeks on ${labels}`) + until;
  }
  const monthlyBase =
    v.monthMode === "date"
      ? `on day ${v.monthDay === -1 ? "last" : v.monthDay}`
      : `on the ${ORDINAL_LABEL[v.weekOrdinal]} ${DAY_NAMES[v.weekday]}`;
  return (v.interval === 1 ? `Monthly ${monthlyBase}` : `Every ${v.interval} months ${monthlyBase}`) + until;
}

interface RepeatPickerScreenProps {
  initial: RecurrenceValue;
  onCancel: () => void;
  onSave: (value: RecurrenceValue) => void;
}

/** Full-screen picker for recurrence — opened from a summary row in EventFormScreen rather than
 * staying inline in the main form (plan_001.md Workstream 5). */
export function RepeatPickerScreen({ initial, onCancel, onSave }: RepeatPickerScreenProps) {
  const [value, setValue] = useState<RecurrenceValue>(initial);

  function patch(p: Partial<RecurrenceValue>) {
    setValue((v) => ({ ...v, ...p }));
  }

  function toggleDay(day: number) {
    patch({
      days: value.days.includes(day) ? value.days.filter((d) => d !== day) : [...value.days, day].sort((a, b) => a - b),
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-app">
      <FormHeader title="Repeat" onCancel={onCancel} onSave={() => onSave(value)} saveLabel="Done" />
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Frequency</span>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((f) => {
              const active = f === "Never" ? value.frequency === null : value.frequency === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => patch({ frequency: f === "Never" ? null : f })}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    active ? "bg-ink text-white" : "bg-chip text-ink-muted"
                  }`}
                >
                  {f === "Never" ? "Does not repeat" : f}
                </button>
              );
            })}
          </div>
        </div>

        {value.frequency !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Every</span>
            <input
              type="number"
              min={1}
              value={value.interval}
              onChange={(e) => patch({ interval: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 rounded-xl border border-border-strong bg-card px-2.5 py-2 text-sm font-semibold text-ink"
            />
            <span className="text-sm font-semibold text-ink-muted">
              {value.frequency === "Daily" ? "day(s)" : value.frequency === "Weekly" ? "week(s)" : "month(s)"}
            </span>
          </div>
        )}

        {value.frequency === "Weekly" && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Repeats on</span>
            <div className="flex gap-1.5">
              {DAY_LETTERS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-label={DAY_NAMES[day]}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                    value.days.includes(day) ? "bg-ink text-white" : "bg-chip text-ink-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {value.days.length === 0 && (
              <div className="text-xs font-medium text-ink-fainter">Pick at least one day.</div>
            )}
          </div>
        )}

        {value.frequency === "Monthly" && (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Repeats on</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => patch({ monthMode: "date" })}
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold ${
                  value.monthMode === "date" ? "bg-ink text-white" : "bg-chip text-ink-muted"
                }`}
              >
                Specific date
              </button>
              <button
                type="button"
                onClick={() => patch({ monthMode: "weekday" })}
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold ${
                  value.monthMode === "weekday" ? "bg-ink text-white" : "bg-chip text-ink-muted"
                }`}
              >
                Day of week
              </button>
            </div>

            {value.monthMode === "date" ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Day of month</span>
                <select
                  value={value.monthDay}
                  onChange={(e) => patch({ monthDay: Number(e.target.value) })}
                  className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value={-1}>Last day</option>
                </select>
              </label>
            ) : (
              <div className="flex gap-2">
                <select
                  value={value.weekOrdinal}
                  onChange={(e) => patch({ weekOrdinal: Number(e.target.value) })}
                  className="flex-1 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                >
                  {ORDINALS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={value.weekday}
                  onChange={(e) => patch({ weekday: Number(e.target.value) })}
                  className="flex-1 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                >
                  {DAY_NAMES.map((name, day) => (
                    <option key={day} value={day}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {value.frequency !== null && (
          <FloatingInput
            label="Ends (optional)"
            type="date"
            value={value.end}
            onChange={(e) => patch({ end: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}
