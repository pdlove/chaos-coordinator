import { useMemo, useState } from "react";
import { addDays, startOfDay, useEvents, type CalendarEventDto, type Role } from "@chaos-coordinator/core";
import type { EventCategory } from "@chaos-coordinator/shared";
import { CategoryPill } from "../../components/CategoryPill";
import { EventCard } from "./EventCard";

const CATEGORIES: EventCategory[] = ["Work", "School", "Doctor", "Home", "Personal", "Activities"];

interface DayViewProps {
  date: Date;
  currentUserId: string | undefined;
  currentUserRole: Role | undefined;
  onEdit: (event: CalendarEventDto) => void;
  onAdd: () => void;
}

export function DayView({ date, currentUserId, currentUserRole, onEdit, onAdd }: DayViewProps) {
  const [filter, setFilter] = useState<EventCategory | "All">("All");
  const from = startOfDay(date);
  const to = addDays(from, 1);
  const { data: events, isLoading } = useEvents(from, to);

  const filtered = useMemo(
    () => (events ?? []).filter((e) => filter === "All" || e.category === filter),
    [events, filter]
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none gap-2 overflow-x-auto px-5 pb-3.5">
        <button
          onClick={() => setFilter("All")}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-bold ${
            filter === "All" ? "bg-ink text-white" : "bg-chip text-ink-muted"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={filter === c ? "opacity-100" : "opacity-50"}>
            <CategoryPill category={c} />
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5">
        {isLoading && <div className="text-sm font-medium text-ink-muted">Loading…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="mt-8 text-center text-sm font-medium text-ink-fainter">No events</div>
        )}
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} currentUserId={currentUserId} currentUserRole={currentUserRole} onEdit={onEdit} />
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
