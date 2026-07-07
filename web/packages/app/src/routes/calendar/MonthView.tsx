import { useMemo, useState } from "react";
import {
  addDays,
  isSameDay,
  startOfMonth,
  startOfMonthGrid,
  useEvents,
  type CalendarEventDto,
} from "@chaos-coordinator/core";
import { CATEGORY_ACCENT } from "@chaos-coordinator/shared";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

interface MonthViewProps {
  date: Date;
  onSelectEvent: (event: CalendarEventDto) => void;
}

export function MonthView({ date, onSelectEvent }: MonthViewProps) {
  const [selectedDay, setSelectedDay] = useState(date);
  const gridStart = startOfMonthGrid(date);
  const gridDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const rangeEnd = addDays(gridStart, 42);
  const { data: events } = useEvents(gridStart, rangeEnd);
  const today = new Date();
  const month = date.getMonth();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDto[]>();
    for (const e of events ?? []) {
      const key = new Date(e.start).toDateString();
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const selectedEvents = (eventsByDay.get(selectedDay.toDateString()) ?? []).sort((a, b) =>
    a.start.localeCompare(b.start)
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="grid grid-cols-7 px-5 text-center">
        {DAY_LETTERS.map((l, i) => (
          <span key={i} className="py-1.5 text-[10.5px] font-bold text-ink-fainter">
            {l}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 px-5">
        {gridDays.map((day) => {
          const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
          const categories = [...new Set(dayEvents.map((e) => e.category))];
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDay);
          const inMonth = day.getMonth() === month;

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isSelected ? "bg-ink text-white font-bold" : inMonth ? "text-ink" : "text-ink-fainter"
                } ${isToday && !isSelected ? "ring-1 ring-ink" : ""}`}
              >
                {day.getDate()}
              </span>
              <div className="flex h-1 gap-0.5">
                {categories.slice(0, 3).map((c) => (
                  <span key={c} className="h-1 w-1 rounded-full" style={{ background: CATEGORY_ACCENT[c] }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex-1 overflow-y-auto border-t border-border px-5 pt-2.5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          {selectedDay.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
        </div>
        {selectedEvents.length === 0 ? (
          <div className="text-xs font-medium text-ink-fainter">No events</div>
        ) : (
          <div className="flex flex-col gap-1.5 pb-4">
            {selectedEvents.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelectEvent(e)}
                className="rounded-xl bg-card px-3 py-2.5 text-left text-xs font-semibold text-ink shadow-sm"
                style={{ borderLeft: `3px solid ${CATEGORY_ACCENT[e.category]}` }}
              >
                {new Date(e.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {e.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
