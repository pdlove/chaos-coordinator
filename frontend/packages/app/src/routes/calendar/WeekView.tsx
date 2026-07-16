import { useMemo, useState } from "react";
import { addDays, eventMatchesCategoryFilter, startOfDay, useEvents, type CalendarEventDto } from "@chaos-coordinator/core";
import { CategoryFilterPills } from "../../components/CategoryFilterPills";
import { TimeGridView } from "./TimeGridView";

/** Number of days shown at once in the Week schedule grid. */
export const WEEK_VIEW_DAYS = 3;

interface WeekViewProps {
  date: Date;
  onViewEvent: (event: CalendarEventDto) => void;
  onAddForDay: (day: Date) => void;
}

export function WeekView({ date, onViewEvent, onAddForDay }: WeekViewProps) {
  const [filter, setFilter] = useState<Set<string>>(new Set());
  const from = startOfDay(date);
  const to = addDays(from, WEEK_VIEW_DAYS);
  const { data: events } = useEvents(from, to);

  const days = Array.from({ length: WEEK_VIEW_DAYS }, (_, i) => addDays(from, i));

  const filtered = useMemo(
    () => (events ?? []).filter((e) => eventMatchesCategoryFilter(e, filter)),
    [events, filter]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CategoryFilterPills selected={filter} onChange={setFilter} />
      <TimeGridView days={days} events={filtered} onView={onViewEvent} onAddForDay={onAddForDay} />
    </div>
  );
}
