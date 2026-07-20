import { useMemo, useRef, useState } from "react";
import {
  addDays,
  eventMatchesCategoryFilter,
  eventSpansDay,
  getEventDaySegment,
  isSameDay,
  startOfMonth,
  startOfMonthGrid,
  useEvents,
  type CalendarEventDto,
} from "@chaos-coordinator/core";
import { categoryTint } from "@chaos-coordinator/shared";
import { CategoryFilterPills } from "../../components/CategoryFilterPills";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const LONG_PRESS_MS = 500;
const MAX_SNIPPETS = 2;
const MAX_OVERFLOW_DOTS = 4;

function formatEventLine(e: CalendarEventDto, day: Date) {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const segment = getEventDaySegment(e, day);
  if (segment === "middle") return `All Day · ${e.title}`;
  if (segment === "end") return `Ends at ${fmt(e.end!)} · ${e.title}`;
  return `${fmt(e.start)} · ${e.title}`;
}

interface MonthViewProps {
  date: Date;
  onViewEvent: (event: CalendarEventDto) => void;
  onAddForDay: (day: Date) => void;
  onSelectDay: (day: Date) => void;
}

export function MonthView({ date, onViewEvent, onAddForDay, onSelectDay }: MonthViewProps) {
  const [filter, setFilter] = useState<Set<string>>(new Set());
  const selectedDay = date;
  const gridStart = startOfMonthGrid(date);
  const gridDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const rangeEnd = addDays(gridStart, 42);
  const { data: events } = useEvents(gridStart, rangeEnd);
  const today = new Date();
  const month = startOfMonth(date).getMonth();

  // Long-press (not single tap) starts a new entry, since single tap is already spoken for by day
  // selection in this view — see plan_001.md decision #10.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  function handlePointerDown(day: Date) {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onAddForDay(day);
    }, LONG_PRESS_MS);
  }

  function clearPressTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function handleDayClick(day: Date) {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onSelectDay(day);
  }

  const filtered = useMemo(
    () => (events ?? []).filter((e) => eventMatchesCategoryFilter(e, filter)),
    [events, filter]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDto[]>();
    for (let i = 0; i < 42; i++) {
      const day = addDays(gridStart, i);
      map.set(
        day.toDateString(),
        filtered.filter((e) => eventSpansDay(e, day)).sort((a, b) => a.start.localeCompare(b.start))
      );
    }
    return map;
  }, [filtered, gridStart]);

  const selectedEvents = eventsByDay.get(selectedDay.toDateString()) ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CategoryFilterPills selected={filter} onChange={setFilter} />

      <div className="grid grid-cols-7 px-5 text-center">
        {DAY_LETTERS.map((l, i) => (
          <span key={i} className="py-1.5 text-[10.5px] font-bold text-ink-fainter">
            {l}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-5">
        {gridDays.map((day) => {
          const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
          const snippetEvents = dayEvents.slice(0, MAX_SNIPPETS);
          const overflow = dayEvents.slice(MAX_SNIPPETS, MAX_SNIPPETS + MAX_OVERFLOW_DOTS);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDay);
          const inMonth = day.getMonth() === month;

          return (
            <button
              key={day.toISOString()}
              onPointerDown={() => handlePointerDown(day)}
              onPointerUp={clearPressTimer}
              onPointerLeave={clearPressTimer}
              onPointerCancel={clearPressTimer}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => handleDayClick(day)}
              className={`flex min-h-[68px] flex-col items-stretch gap-0.5 rounded-xl p-1 pt-1 text-left ${
                isSelected ? "bg-chip" : ""
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isSelected ? "bg-ink text-white font-bold" : inMonth ? "text-ink" : "text-ink-fainter"
                } ${isToday && !isSelected ? "ring-1 ring-ink" : ""}`}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {snippetEvents.map((e) => (
                  <span
                    key={e.id}
                    className="truncate rounded px-1 py-[1px] text-[9px] font-bold leading-tight"
                    style={{ background: categoryTint(e.category.color), color: e.category.color }}
                  >
                    {e.title}
                  </span>
                ))}
              </div>
              {overflow.length > 0 && (
                <div className="mt-auto flex gap-0.5 px-0.5 pb-0.5">
                  {overflow.map((e) => (
                    <span key={e.id} className="h-1 w-1 rounded-full" style={{ background: e.category.color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex-1 overflow-y-auto border-t border-border px-5 pt-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
            {selectedDay.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          </span>
          <button
            onClick={() => onAddForDay(selectedDay)}
            aria-label="Add event"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-chip text-sm font-bold text-ink"
          >
            +
          </button>
        </div>
        {selectedEvents.length === 0 ? (
          <div className="text-xs font-medium text-ink-fainter">No events</div>
        ) : (
          <div className="flex flex-col gap-1.5 pb-4">
            {selectedEvents.map((e) => (
              <button
                key={e.id}
                onClick={() => onViewEvent(e)}
                className="rounded-xl bg-card px-3 py-2.5 text-left text-xs font-semibold text-ink shadow-sm"
                style={{ borderLeft: `3px solid ${e.category.color}` }}
              >
                {formatEventLine(e, selectedDay)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
