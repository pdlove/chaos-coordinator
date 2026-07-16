import { useMemo, useState } from "react";
import { addDays, eventMatchesCategoryFilter, startOfDay, useEvents, type CalendarEventDto } from "@chaos-coordinator/core";
import { CategoryFilterPills } from "../../components/CategoryFilterPills";
import { TimeGridView } from "./TimeGridView";

interface WeekViewProps {
  date: Date;
  daysToShow: number;
  onViewEvent: (event: CalendarEventDto) => void;
  onAddForDay: (day: Date) => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
}

export function WeekView({ date, daysToShow, onViewEvent, onAddForDay, onPrevPeriod, onNextPeriod }: WeekViewProps) {
  const [filter, setFilter] = useState<Set<string>>(new Set());
  const from = startOfDay(date);
  const to = addDays(from, daysToShow);
  const { data: events } = useEvents(from, to);

  const days = Array.from({ length: daysToShow }, (_, i) => addDays(from, i));

  const filtered = useMemo(
    () => (events ?? []).filter((e) => eventMatchesCategoryFilter(e, filter)),
    [events, filter]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CategoryFilterPills selected={filter} onChange={setFilter} />
      <TimeGridView
        days={days}
        events={filtered}
        onView={onViewEvent}
        onAddForDay={onAddForDay}
        onSwipeLeft={onNextPeriod}
        onSwipeRight={onPrevPeriod}
      />
    </div>
  );
}
