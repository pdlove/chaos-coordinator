import { type CalendarEventDto, type Role } from "@chaos-coordinator/core";
import { AvatarStack } from "../../components/AvatarStack";
import { CategoryPill } from "../../components/CategoryPill";

interface EventCardProps {
  event: CalendarEventDto;
  currentUserId: string | undefined;
  currentUserRole: Role | undefined;
  onView: (event: CalendarEventDto) => void;
}

function formatTimeRange(start: string, end: string | null) {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

export function EventCard({ event, currentUserId: _currentUserId, currentUserRole: _currentUserRole, onView }: EventCardProps) {
  const accent = event.category.color;

  return (
    <button
      onClick={() => onView(event)}
      className="rounded-card bg-card p-3.5 text-left shadow-sm w-full"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex items-start justify-between">
        <div className="text-sm font-bold text-ink">{event.title}</div>
        <CategoryPill category={event.category} />
      </div>
      <div className="my-1 text-xs font-medium text-ink-muted">{formatTimeRange(event.start, event.end)}</div>
      {event.attendees.length > 0 && (
        <AvatarStack people={event.attendees.map((a) => ({ initials: a.initials, color: a.color }))} />
      )}
    </button>
  );
}
