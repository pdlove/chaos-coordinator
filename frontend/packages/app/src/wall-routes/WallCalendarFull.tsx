import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDays,
  isSameDay,
  startOfDay,
  startOfMonthGrid,
  startOfWeek,
  useEvents,
} from "@chaos-coordinator/core";
import { CATEGORY_ACCENT } from "@chaos-coordinator/shared";
import { SegmentedToggle } from "../components/SegmentedToggle";

type ViewMode = "Day" | "Week" | "Month";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LETTERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WallCalendarFull() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>("Week");
  const [date] = useState(new Date());
  const today = new Date();

  const weekStart = startOfWeek(date);
  const monthGridStart = startOfMonthGrid(date);
  const rangeFrom = mode === "Day" ? startOfDay(date) : mode === "Week" ? weekStart : monthGridStart;
  const rangeTo = mode === "Day" ? addDays(rangeFrom, 1) : mode === "Week" ? addDays(weekStart, 7) : addDays(monthGridStart, 42);
  const { data: events } = useEvents(rangeFrom, rangeTo);

  return (
    <div className="flex h-screen w-screen flex-col bg-app">
      <div className="flex flex-none items-center justify-between px-9 pb-4 pt-5.5">
        <div className="flex items-center gap-3.5">
          <button onClick={() => navigate("/wall")} className="text-xl text-ink">
            ←
          </button>
          <span className="text-[26px] font-extrabold text-ink">
            {mode === "Month"
              ? date.toLocaleDateString([], { month: "long", year: "numeric" })
              : mode === "Week"
                ? `${weekStart.toLocaleDateString([], { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString([], { day: "numeric" })}`
                : date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>
        <SegmentedToggle
          value={mode}
          onChange={setMode}
          options={[
            { value: "Day", label: "Day" },
            { value: "Week", label: "Week" },
            { value: "Month", label: "Month" },
          ]}
        />
      </div>

      {mode === "Week" && (
        <div className="grid flex-1 grid-cols-7 gap-3 overflow-hidden px-9 pb-7.5">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
            const isToday = isSameDay(day, today);
            const dayEvents = (events ?? []).filter((e) => isSameDay(new Date(e.start), day)).sort((a, b) => a.start.localeCompare(b.start));
            return (
              <div key={day.toISOString()} className={`flex flex-col gap-2 overflow-y-auto rounded-2xl ${isToday ? "-m-2 bg-chip p-2" : ""}`}>
                <div className={`text-xs font-bold ${isToday ? "text-ink" : "text-ink-faint"}`}>
                  {DAY_LABELS[day.getDay()]} {day.getDate()}
                  {isToday && " · Today"}
                </div>
                {dayEvents.map((e) => (
                  <div key={e.id} className="rounded-xl bg-card p-2 text-[11px] font-semibold text-ink shadow-sm" style={{ borderLeft: `3px solid ${CATEGORY_ACCENT[e.category]}` }}>
                    {new Date(e.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {e.title}
                  </div>
                ))}
                {dayEvents.length === 0 && <div className="text-[11px] font-medium text-ink-fainter">No events</div>}
              </div>
            );
          })}
        </div>
      )}

      {mode === "Month" && (
        <div className="flex flex-1 flex-col overflow-hidden px-9 pb-7.5">
          <div className="grid grid-cols-7 text-center">
            {DAY_LETTERS.map((l) => (
              <span key={l} className="py-2 text-xs font-bold text-ink-fainter">
                {l}
              </span>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i)).map((day) => {
              const isToday = isSameDay(day, today);
              const dayEvents = (events ?? []).filter((e) => isSameDay(new Date(e.start), day));
              const categories = [...new Set(dayEvents.map((e) => e.category))];
              return (
                <div key={day.toISOString()} className={`rounded-xl p-2 ${isToday ? "bg-ink" : "bg-card shadow-sm"}`}>
                  <div className={`text-[13px] font-bold ${isToday ? "text-white" : "text-ink"}`}>{day.getDate()}</div>
                  <div className="mt-1 flex gap-1">
                    {categories.slice(0, 3).map((c) => (
                      <span key={c} className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_ACCENT[c] }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "Day" && (
        <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-9 pb-7.5">
          {(events ?? [])
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm" style={{ borderLeft: `4px solid ${CATEGORY_ACCENT[e.category]}` }}>
                <div>
                  <div className="text-[15px] font-bold text-ink">{e.title}</div>
                  <div className="text-xs font-medium text-ink-muted">{new Date(e.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
