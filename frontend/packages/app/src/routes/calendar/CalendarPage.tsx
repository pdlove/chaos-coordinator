import { useState } from "react";
import { addDays, addMonths, useHousehold, useSessionStore, type CalendarEventDto } from "@chaos-coordinator/core";
import { SegmentedToggle } from "../../components/SegmentedToggle";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { EventFormModal } from "./EventFormModal";
import { EventViewModal } from "./EventViewModal";

type ViewMode = "Day" | "Week" | "Month";

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("Day");
  const [date, setDate] = useState(new Date());
  const [viewingEvent, setViewingEvent] = useState<CalendarEventDto | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | null | undefined>(undefined);

  const { data: household } = useHousehold();
  const currentUserId = useSessionStore((s) => s.currentUserId) ?? undefined;
  const currentUser = household?.users.find((u) => u.id === currentUserId);

  const headerLabel =
    viewMode === "Day"
      ? date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
      : viewMode === "Month"
        ? date.toLocaleDateString([], { month: "long", year: "numeric" })
        : `Week of ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;

  function handlePrev() {
    if (viewMode === "Day") setDate((d) => addDays(d, -1));
    else if (viewMode === "Week") setDate((d) => addDays(d, -7));
    else setDate((d) => addMonths(d, -1));
  }

  function handleNext() {
    if (viewMode === "Day") setDate((d) => addDays(d, 1));
    else if (viewMode === "Week") setDate((d) => addDays(d, 7));
    else setDate((d) => addMonths(d, 1));
  }

  function handleAddForDay(day: Date) {
    setEditingEvent(null);
    setDate(day);
  }

  function handleEditFromView(event: CalendarEventDto) {
    setViewingEvent(null);
    setEditingEvent(event);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center justify-between px-5 pb-3.5 pt-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-chip"
            aria-label="Previous"
          >
            ‹
          </button>
          <div className="text-2xl font-extrabold text-ink">{headerLabel}</div>
          <button
            onClick={handleNext}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-chip"
            aria-label="Next"
          >
            ›
          </button>
        </div>
        <SegmentedToggle
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "Day", label: "Day" },
            { value: "Week", label: "Week" },
            { value: "Month", label: "Month" },
          ]}
        />
      </div>

      {viewMode === "Day" && (
        <DayView
          date={date}
          currentUserId={currentUserId}
          currentUserRole={currentUser?.role}
          onView={setViewingEvent}
          onAdd={() => setEditingEvent(null)}
        />
      )}
      {viewMode === "Week" && (
        <WeekView
          date={date}
          onViewEvent={setViewingEvent}
          onAddForDay={handleAddForDay}
        />
      )}
      {viewMode === "Month" && (
        <MonthView
          date={date}
          onViewEvent={setViewingEvent}
          onAddForDay={handleAddForDay}
        />
      )}

      {viewingEvent && (
        <EventViewModal
          event={viewingEvent}
          currentUserId={currentUserId}
          currentUserRole={currentUser?.role}
          onClose={() => setViewingEvent(null)}
          onEdit={handleEditFromView}
        />
      )}

      {editingEvent !== undefined && (
        <EventFormModal event={editingEvent} defaultDate={date} onClose={() => setEditingEvent(undefined)} />
      )}
    </div>
  );
}
