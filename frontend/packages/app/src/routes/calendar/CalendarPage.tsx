import { useState } from "react";
import { addDays, addMonths, useHousehold, useSessionStore, type CalendarEventDto } from "@chaos-coordinator/core";
import { SegmentedToggle } from "../../components/SegmentedToggle";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { AgendaView, AGENDA_VIEW_DAYS } from "./AgendaView";
import { MonthView } from "./MonthView";
import { EventFormScreen, type EditScope } from "./EventFormScreen";
import { EventViewModal } from "./EventViewModal";
import { ImportEventsFlow } from "./import/ImportEventsFlow";
import { useIsLandscape } from "./useIsLandscape";
import { AgendaIcon, DayIcon, WeekIcon, MonthIcon, CameraIcon } from "./CalendarViewIcons";

type ViewMode = "Day" | "Week" | "Agenda" | "Month";

// The Week schedule grid shows more days at once on a rotated (landscape) phone/tablet, since
// there's the horizontal room for it.
const WEEK_VIEW_DAYS_PORTRAIT = 3;
const WEEK_VIEW_DAYS_LANDSCAPE = 5;

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("Day");
  const [date, setDate] = useState(new Date());
  const [viewingEvent, setViewingEvent] = useState<CalendarEventDto | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | null | undefined>(undefined);
  const [editScope, setEditScope] = useState<EditScope>("all");
  const [showImportFlow, setShowImportFlow] = useState(false);

  const { data: household } = useHousehold();
  const currentUserId = useSessionStore((s) => s.currentUserId) ?? undefined;
  const currentUser = household?.users.find((u) => u.id === currentUserId);

  const isLandscape = useIsLandscape();
  const weekViewDays = isLandscape ? WEEK_VIEW_DAYS_LANDSCAPE : WEEK_VIEW_DAYS_PORTRAIT;

  const fmtShort = (d: Date) => d.toLocaleDateString([], { month: "short", day: "numeric" });

  const headerLabel =
    viewMode === "Day"
      ? date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
      : viewMode === "Month"
        ? date.toLocaleDateString([], { month: "long", year: "numeric" })
        : viewMode === "Week"
          ? `${fmtShort(date)} – ${fmtShort(addDays(date, weekViewDays - 1))}`
          : `${fmtShort(date)} – ${fmtShort(addDays(date, AGENDA_VIEW_DAYS - 1))}`;

  function handlePrev() {
    if (viewMode === "Day") setDate((d) => addDays(d, -1));
    else if (viewMode === "Week") setDate((d) => addDays(d, -weekViewDays));
    else if (viewMode === "Agenda") setDate((d) => addDays(d, -AGENDA_VIEW_DAYS));
    else setDate((d) => addMonths(d, -1));
  }

  function handleNext() {
    if (viewMode === "Day") setDate((d) => addDays(d, 1));
    else if (viewMode === "Week") setDate((d) => addDays(d, weekViewDays));
    else if (viewMode === "Agenda") setDate((d) => addDays(d, AGENDA_VIEW_DAYS));
    else setDate((d) => addMonths(d, 1));
  }

  function handleAddForDay(day: Date) {
    setEditScope("all");
    setEditingEvent(null);
    setDate(day);
  }

  function handleEditFromView(event: CalendarEventDto, scope: EditScope) {
    setViewingEvent(null);
    setEditScope(scope);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportFlow(true)}
            aria-label="Create events from a photo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-chip"
          >
            <CameraIcon />
          </button>
          <SegmentedToggle
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "Agenda", label: "Agenda", icon: <AgendaIcon /> },
              { value: "Day", label: "Day", icon: <DayIcon /> },
              { value: "Week", label: "Week", icon: <WeekIcon /> },
              { value: "Month", label: "Month", icon: <MonthIcon /> },
            ]}
          />
        </div>
      </div>

      {viewMode === "Day" && (
        <DayView
          date={date}
          onView={setViewingEvent}
          onAdd={() => {
            setEditScope("all");
            setEditingEvent(null);
          }}
          onPrevDay={handlePrev}
          onNextDay={handleNext}
        />
      )}
      {viewMode === "Week" && (
        <WeekView
          date={date}
          daysToShow={weekViewDays}
          onViewEvent={setViewingEvent}
          onAddForDay={handleAddForDay}
          onPrevPeriod={handlePrev}
          onNextPeriod={handleNext}
        />
      )}
      {viewMode === "Agenda" && (
        <AgendaView
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
        <EventFormScreen
          event={editingEvent}
          defaultDate={date}
          scope={editScope}
          onClose={() => {
            setEditingEvent(undefined);
            setEditScope("all");
          }}
        />
      )}

      {showImportFlow && <ImportEventsFlow onClose={() => setShowImportFlow(false)} />}
    </div>
  );
}
