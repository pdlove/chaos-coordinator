import { useRef } from "react";
import { addDays, isSameDay, startOfWeek, useEvents, type CalendarEventDto } from "@chaos-coordinator/core";
import { CATEGORY_ACCENT } from "@chaos-coordinator/shared";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOUBLE_TAP_MS = 300;

interface WeekViewProps {
  date: Date;
  onViewEvent: (event: CalendarEventDto) => void;
  onAddForDay: (day: Date) => void;
}

export function WeekView({ date, onViewEvent, onAddForDay }: WeekViewProps) {
  const from = startOfWeek(date);
  const to = addDays(from, 7);
  const { data: events } = useEvents(from, to);
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  const lastTapRef = useRef<{ key: string; time: number } | null>(null);

  function handleDayTap(day: Date) {
    const key = day.toDateString();
    const now = Date.now();
    if (lastTapRef.current?.key === key && now - lastTapRef.current.time < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      onAddForDay(day);
    } else {
      lastTapRef.current = { key, time: now };
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-5">
      {days.map((day) => {
        const dayEvents = (events ?? [])
          .filter((e) => isSameDay(new Date(e.start), day))
          .sort((a, b) => a.start.localeCompare(b.start));
        const isToday = isSameDay(day, today);

        return (
          <div key={day.toISOString()}>
            <button
              className="mb-1.5 flex items-baseline gap-2"
              onClick={() => handleDayTap(day)}
              aria-label={`${day.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} — double-tap to add`}
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
                    {new Date(e.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {e.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
