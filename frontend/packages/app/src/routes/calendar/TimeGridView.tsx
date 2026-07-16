import { useEffect, useRef, useState } from "react";
import {
  eventSpansDay,
  getEventDaySegment,
  isSameDay,
  layoutTimedEventBlocks,
  type CalendarEventDto,
} from "@chaos-coordinator/core";
import { categoryTint } from "@chaos-coordinator/shared";

const ROW_HEIGHT = 28; // px per hour
const GUTTER_WIDTH = 40; // px
const SCROLL_TO_HOUR = 7; // schedule opens scrolled to 7 AM rather than midnight
const SWIPE_THRESHOLD_PX = 50; // minimum horizontal drag before it counts as a swipe, not a tap
const MIN_BLOCK_HEIGHT = 16; // px — short events still get a visible sliver
const MIN_HEIGHT_FOR_TIME_LABEL = 26; // px — below this, only the title fits

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function formatEventTimeRange(start: string, end: string | null) {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

interface TimeGridViewProps {
  days: Date[];
  events: CalendarEventDto[];
  onView: (event: CalendarEventDto) => void;
  onAddForDay: (day: Date) => void;
  /** Swipe left = forward in time, swipe right = back — both optional since callers may not have
   * paging to offer. */
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

/** Traditional block-style schedule grid (hour rows down the side, events as positioned blocks) —
 * shared by the single-day Day view and the multi-day Week view, which differ only in how many
 * `days` they pass in. */
export function TimeGridView({ days, events, onView, onAddForDay, onSwipeLeft, onSwipeRight }: TimeGridViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const today = new Date();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * ROW_HEIGHT });
  }, []);

  const bannerEventsByDay = days.map((day) =>
    events.filter((e) => eventSpansDay(e, day) && getEventDaySegment(e, day) !== "single")
  );
  const hasBanners = bannerEventsByDay.some((list) => list.length > 0);

  function handlePointerDown(e: React.PointerEvent) {
    touchStart.current = { x: e.clientX, y: e.clientY };
  }

  // Horizontal drag beyond the threshold, and clearly more horizontal than vertical (so it
  // doesn't fire while the user is just scrolling the grid up/down), pages the view.
  function handlePointerUp(e: React.PointerEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  }

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="flex border-b border-border" style={{ paddingLeft: GUTTER_WIDTH }}>
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onAddForDay(day)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
              aria-label={`Add an entry for ${day.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}`}
            >
              <span className={`text-[11px] font-bold ${isToday ? "text-ink" : "text-ink-faint"}`}>
                {day.toLocaleDateString([], { weekday: "short" })}
              </span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-extrabold ${
                  isToday ? "bg-ink text-white" : "text-ink"
                }`}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {hasBanners && (
        <div className="flex gap-1 border-b border-border py-1.5" style={{ paddingLeft: GUTTER_WIDTH }}>
          {days.map((day, i) => (
            <div key={day.toISOString()} className="flex flex-1 flex-col gap-1 px-1">
              {bannerEventsByDay[i].map((e) => (
                <button
                  key={e.id}
                  onClick={() => onView(e)}
                  className="truncate rounded px-1.5 py-0.5 text-left text-[10px] font-bold leading-tight"
                  style={{ background: categoryTint(e.category.color), color: e.category.color }}
                >
                  {e.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
        <div className="flex-none" style={{ width: GUTTER_WIDTH }}>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} style={{ height: ROW_HEIGHT }} className="relative">
              <span className="absolute -top-1.5 right-1 text-[9.5px] font-semibold text-ink-fainter">
                {formatHourLabel(hour)}
              </span>
            </div>
          ))}
        </div>

        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const dayEvents = events.filter((e) => eventSpansDay(e, day) && getEventDaySegment(e, day) === "single");
            const blocks = layoutTimedEventBlocks(dayEvents);
            const nowMin = now.getHours() * 60 + now.getMinutes();

            return (
              <div key={day.toISOString()} className="relative border-l border-border" style={{ height: 24 * ROW_HEIGHT }}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="absolute inset-x-0 border-t border-border" style={{ top: hour * ROW_HEIGHT }} />
                ))}

                {isToday && (
                  <div className="absolute inset-x-0 z-10 flex items-center" style={{ top: (nowMin / 60) * ROW_HEIGHT }}>
                    <div className="h-1.5 w-1.5 rounded-full bg-cat-doctor" />
                    <div className="h-px flex-1 bg-cat-doctor" />
                  </div>
                )}

                {blocks.map(({ event, startMin, endMin, col, totalCols }) => {
                  const height = Math.max(MIN_BLOCK_HEIGHT, ((endMin - startMin) / 60) * ROW_HEIGHT - 1);
                  return (
                    <button
                      key={event.id}
                      onClick={() => onView(event)}
                      className="absolute overflow-hidden rounded-lg px-1.5 py-0.5 text-left shadow-sm"
                      style={{
                        top: (startMin / 60) * ROW_HEIGHT,
                        height,
                        left: `${(col / totalCols) * 100}%`,
                        width: `${100 / totalCols}%`,
                        background: categoryTint(event.category.color),
                        borderLeft: `3px solid ${event.category.color}`,
                      }}
                    >
                      <div className="truncate text-[10px] font-bold leading-tight text-ink">{event.title}</div>
                      {height >= MIN_HEIGHT_FOR_TIME_LABEL && (
                        <div className="truncate text-[8.5px] font-semibold leading-tight text-ink-muted">
                          {formatEventTimeRange(event.start, event.end)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
