import { useMemo, useState } from "react";
import {
  addDays,
  eventMatchesCategoryFilter,
  startOfDay,
  useEvents,
  type CalendarEventDto,
} from "@chaos-coordinator/core";
import { CategoryFilterPills } from "../../components/CategoryFilterPills";
import { TimeGridView } from "./TimeGridView";

interface DayViewProps {
  date: Date;
  onView: (event: CalendarEventDto) => void;
  onAdd: () => void;
}

export function DayView({ date, onView, onAdd }: DayViewProps) {
  const [filter, setFilter] = useState<Set<string>>(new Set());
  const from = startOfDay(date);
  const to = addDays(from, 1);
  const { data: events } = useEvents(from, to);

  const filtered = useMemo(
    () => (events ?? []).filter((e) => eventMatchesCategoryFilter(e, filter)),
    [events, filter]
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <CategoryFilterPills selected={filter} onChange={setFilter} />

      <TimeGridView days={[date]} events={filtered} onView={onView} onAddForDay={onAdd} />

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
