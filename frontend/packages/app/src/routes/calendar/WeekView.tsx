import { useMemo, useState } from "react";
import {
  addDays,
  eventMatchesCategoryFilter,
  eventSpansDay,
  getEventDaySegment,
  isSameDay,
  startOfWeek,
  useEvents,
  type CalendarEventDto,
} from "@chaos-coordinator/core";
import { CATEGORY_ACCENT, type EventCategory } from "@chaos-coordinator/shared";
import { CategoryFilterPills } from "../../components/CategoryFilterPills";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatEventLine(e: CalendarEventDto, day: Date) {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const segment = getEventDaySegment(e, day);
  if (segment === "middle") return `All Day · ${e.title}`;
  if (segment === "end") return `Ends at ${fmt(e.end!)} · ${e.title}`;
  return `${fmt(e.start)} · ${e.title}`;
}

interface WeekViewProps {
  date: Date;
  onViewEvent: (event: CalendarEventDto) => void;
  onAddForDay: (day: Date) => void;
}

export function WeekView({ date, onViewEvent, onAddForDay }: WeekViewProps) {
  const [filter, setFilter] = useState<Set<EventCategory>>(new Set());
  const from = startOfWeek(date);
  const to = addDays(from, 7);
  const { data: events } = useEvents(from, to);
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  const filtered = useMemo(
    () => (events ?? []).filter((e) => eventMatchesCategoryFilter(e, filter)),
    [events, filter]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CategoryFilterPills selected={filter} onChange={setFilter} />
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-5">
        {days.map((day) => {
          const dayEvents = filtered
            .filter((e) => eventSpansDay(e, day))
            .sort((a, b) => a.start.localeCompare(b.start));
          const isToday = isSameDay(day, today);

          return (
            <div key={day.toISOString()}>
              {/* Week view has no day-selection concept, so a single tap on the day label adds an
                  entry for that day — no double-tap needed here (see plan_001.md decision #10). */}
              <button
                className="mb-1.5 flex items-baseline gap-2"
                onClick={() => onAddForDay(day)}
                aria-label={`Add an entry for ${day.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}`}
              >
                {isToday ? (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-[13px] font-extrabold text-white">
                    {DAY_LABELS[day.getDay()]}
                  </span>
                ) : (
                  <span className="text-[13px] font-bold text-ink-faint">{DAY_LABELS[day.getDay()]}</span>
                )}
                <span className="text-[11px] font-semibold text-ink-muted">
                  {day.toLocaleDateString([], { month: "short", day: "numeric" })}
                  {isToday && " · Today"}
                </span>
              </button>
              {dayEvents.length === 0 ? (
                <div className="text-xs font-medium text-ink-fainter">No events</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {dayEvents.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onViewEvent(e)}
                      className="rounded-xl bg-card px-3 py-2 text-left text-xs font-semibold text-ink shadow-sm"
                      style={{ borderLeft: `3px solid ${CATEGORY_ACCENT[e.category]}` }}
                    >
                      {formatEventLine(e, day)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
