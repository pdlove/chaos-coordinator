import { useState } from "react";
import { getEventPermissionInfo, type CalendarEventDto, type Role } from "@chaos-coordinator/core";
import { AvatarStack } from "../../components/AvatarStack";
import { CategoryPill } from "../../components/CategoryPill";
import { PinPrompt } from "../../components/PinPrompt";
import { CATEGORY_ACCENT } from "@chaos-coordinator/shared";

interface EventCardProps {
  event: CalendarEventDto;
  currentUserId: string | undefined;
  currentUserRole: Role | undefined;
  onEdit: (event: CalendarEventDto) => void;
}

function formatTimeRange(start: string, end: string | null) {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

export function EventCard({ event, currentUserId, currentUserRole, onEdit }: EventCardProps) {
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const perm = getEventPermissionInfo(event, currentUserId, currentUserRole);
  const accent = CATEGORY_ACCENT[event.category];

  if (perm.isOwner) {
    return (
      <button
        onClick={() => onEdit(event)}
        className="rounded-card bg-card p-3.5 text-left shadow-sm"
        style={{ borderLeft: `4px solid ${accent}` }}
      >
        <div className="flex items-start justify-between">
          <div className="text-sm font-bold text-ink">{event.title}</div>
          <CategoryPill category={event.category} />
        </div>
        <div className="my-1 text-xs font-medium text-ink-muted">{formatTimeRange(event.start, event.end)}</div>
        <AvatarStack people={event.attendees.map((a) => ({ initials: a.initials, color: a.color }))} />
      </button>
    );
  }

  // Non-owner: children see the design's locked messaging; parents/adults get a PIN override.
  if (currentUserRole === "Child") {
    return (
      <div className="rounded-card border-l-4 border-ink-fainter bg-chip p-3.5">
        <div className="flex items-start justify-between">
          <div className="text-sm font-bold text-ink-muted">{event.title}</div>
          <span aria-hidden>🔒</span>
        </div>
        <div className="my-1 text-xs font-medium text-ink-faint">
          {formatTimeRange(event.start, event.end)} · set by {event.ownerName}
        </div>
        <div className="text-[10.5px] font-semibold text-ink-faint">
          {perm.isAttendee ? `You're going, but ${event.ownerName} owns this entry` : "Read-only — you're not the owner"}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-card p-3.5 shadow-sm" style={{ borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-start justify-between">
        <div className="text-sm font-bold text-ink">{event.title}</div>
        <CategoryPill category={event.category} />
      </div>
      <div className="my-1 text-xs font-medium text-ink-muted">
        {formatTimeRange(event.start, event.end)} · set by {event.ownerName}
      </div>
      <div className="flex items-center justify-between">
        <AvatarStack people={event.attendees.map((a) => ({ initials: a.initials, color: a.color }))} />
        <button onClick={() => setShowPinPrompt(true)} className="text-[11px] font-bold text-ink-muted">
          Edit (PIN)
        </button>
      </div>
      {showPinPrompt && (
        <PinPrompt
          onCancel={() => setShowPinPrompt(false)}
          onSuccess={() => {
            setShowPinPrompt(false);
            onEdit(event);
          }}
        />
      )}
    </div>
  );
}
