import { useMemo, useState } from "react";
import {
  addDays,
  eventMatchesCategoryFilter,
  startOfDay,
  useEvents,
  type CalendarEventDto,
  type Role,
} from "@chaos-coordinator/core";
import { CategoryFilterPills } from "../../components/CategoryFilterPills";
import { EventCard } from "./EventCard";

interface DayViewProps {
  date: Date;
  currentUserId: string | undefined;
  currentUserRole: Role | undefined;
  onView: (event: CalendarEventDto) => void;
  onAdd: () => void;
}

export function DayView({ date, currentUserId, currentUserRole, onView, onAdd }: DayViewProps) {
  const [filter, setFilter] = useState<Set<string>>(new Set());
  const from = startOfDay(date);
  const to = addDays(from, 1);
  const { data: events, isLoading } = useEvents(from, to);

  const filtered = useMemo(
    () => (events ?? []).filter((e) => eventMatchesCategoryFilter(e, filter)),
    [events, filter]
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <CategoryFilterPills selected={filter} onChange={setFilter} />

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5">
        {isLoading && <div className="text-sm font-medium text-ink-muted">Loading…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="mt-8 text-center text-sm font-medium text-ink-fainter">No events</div>
        )}
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} currentUserId={currentUserId} currentUserRole={currentUserRole} onView={onView} />
        ))}
      </div>

      <button
        onClick={onAdd}
        className="absolute bottom-5 right-4 flex h-13 w-13 items-center justify-center rounded-full bg-ink text-2xl text-white shadow-lg"
        style={{ width: 52, height: 52 }}
      >
        +
      </button>
    </div>
  );
}
