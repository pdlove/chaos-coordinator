import { useState } from "react";
import { useHousehold, useSessionStore, type CalendarEventDto } from "@chaos-coordinator/core";
import { SegmentedToggle } from "../../components/SegmentedToggle";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { EventFormModal } from "./EventFormModal";
import { useEventEditGate } from "./useEventEditGate";

type ViewMode = "Day" | "Week" | "Month";

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("Day");
  const [date] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | null | undefined>(undefined);

  const { data: household } = useHousehold();
  const currentUserId = useSessionStore((s) => s.currentUserId) ?? undefined;
  const currentUser = household?.users.find((u) => u.id === currentUserId);
  const editGate = useEventEditGate(currentUserId, currentUser?.role, setEditingEvent);

  const headerLabel =
    viewMode === "Day"
      ? date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
      : viewMode === "Month"
        ? date.toLocaleDateString([], { month: "long", year: "numeric" })
        : `Week of ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center justify-between px-5 pb-3.5 pt-1.5">
        <div className="text-2xl font-extrabold text-ink">{headerLabel}</div>
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
          onEdit={setEditingEvent}
          onAdd={() => setEditingEvent(null)}
        />
      )}
      {viewMode === "Week" && <WeekView date={date} onSelectEvent={editGate.requestEdit} />}
      {viewMode === "Month" && <MonthView date={date} onSelectEvent={editGate.requestEdit} />}
      {editGate.gate}

      {editingEvent !== undefined && (
        <EventFormModal event={editingEvent} defaultDate={date} onClose={() => setEditingEvent(undefined)} />
      )}
    </div>
  );
}
