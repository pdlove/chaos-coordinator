import { useState } from "react";
import {
  getEventPermissionInfo,
  useCancelEventOccurrence,
  useDeleteEvent,
  useSessionStore,
  useTruncateEventSeries,
  type CalendarEventDto,
  type Role,
} from "@chaos-coordinator/core";
import { AvatarStack } from "../../components/AvatarStack";
import { CategoryPill } from "../../components/CategoryPill";
import { PinPrompt } from "../../components/PinPrompt";
import type { EditScope } from "./EventFormScreen";

interface EventViewModalProps {
  event: CalendarEventDto;
  currentUserId: string | undefined;
  currentUserRole: Role | undefined;
  onClose: () => void;
  onEdit: (event: CalendarEventDto, scope: EditScope) => void;
}

function formatTimeRange(start: string, end: string | null) {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export function EventViewModal({ event, currentUserId, currentUserRole, onClose, onEdit }: EventViewModalProps) {
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const [pinAction, setPinAction] = useState<"edit" | "delete" | null>(null);
  const [showDeleteScope, setShowDeleteScope] = useState(false);
  const [showEditScope, setShowEditScope] = useState(false);
  const [error, setError] = useState(false);

  const deleteEvent = useDeleteEvent();
  const cancelOccurrence = useCancelEventOccurrence();
  const truncateSeries = useTruncateEventSeries();

  const perm = getEventPermissionInfo(event, currentUserId, currentUserRole);
  const accent = event.category.color;
  const canEdit = perm.isOwner || currentUserRole === "Adult" || currentUserRole === "Other";
  const isRecurring = event.instanceDate !== null;
  const busy = deleteEvent.isPending || cancelOccurrence.isPending || truncateSeries.isPending;

  async function doDeleteOccurrence() {
    try {
      await cancelOccurrence.mutateAsync({ id: event.id, req: { date: event.instanceDate! } });
      onClose();
    } catch {
      setError(true);
    }
  }

  async function doDeleteFuture() {
    try {
      await truncateSeries.mutateAsync({ id: event.id, req: { date: event.instanceDate! } });
      onClose();
    } catch {
      setError(true);
    }
  }

  async function doDeleteAll() {
    try {
      await deleteEvent.mutateAsync(event.id);
      onClose();
    } catch {
      setError(true);
    }
  }

  function handleEditTap() {
    if (!perm.isOwner && !pinElevated) {
      setPinAction("edit");
    } else if (isRecurring) {
      setShowEditScope(true);
    } else {
      onEdit(event, "all");
    }
  }

  function handleDeleteTap() {
    if (!perm.isOwner && !pinElevated) {
      setPinAction("delete");
    } else if (isRecurring) {
      setShowDeleteScope(true);
    } else {
      doDeleteAll();
    }
  }

  function handlePinSuccess() {
    const action = pinAction;
    setPinAction(null);
    if (action === "edit") {
      if (isRecurring) setShowEditScope(true);
      else onEdit(event, "all");
    } else if (action === "delete") {
      if (isRecurring) setShowDeleteScope(true);
      else doDeleteAll();
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onClose}>
        <div
          className="flex w-full max-w-[420px] flex-col rounded-t-card-lg bg-app sm:rounded-card-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1.5 w-full rounded-t-card-lg" style={{ background: accent }} />

          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xl font-extrabold text-ink">{event.title}</div>
              <CategoryPill category={event.category} />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-sm font-semibold text-ink-muted">{formatDate(event.start)}</div>
              <div className="text-sm font-semibold text-ink-muted">{formatTimeRange(event.start, event.end)}</div>
              {isRecurring && (
                <div className="text-[11px] font-semibold text-ink-faint">Repeating event</div>
              )}
            </div>

            {event.location && (
              <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
                <span className="text-base">📍</span>
                {event.location}
              </div>
            )}

            {event.notes && (
              <div className="rounded-xl bg-chip px-3.5 py-3 text-sm font-medium text-ink-muted">
                {event.notes}
              </div>
            )}

            {event.attendees.length > 0 && (
              <div className="flex items-center gap-2.5">
                <AvatarStack people={event.attendees.map((a) => ({ initials: a.initials, color: a.color }))} />
                <span className="text-xs font-semibold text-ink-muted">
                  {event.attendees.map((a) => a.name).join(", ")}
                </span>
              </div>
            )}

            {!perm.isOwner && (
              <div className="text-[11px] font-semibold text-ink-faint">Added by {event.ownerName}</div>
            )}

            {error && (
              <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">
                Something went wrong — please try again.
              </div>
            )}

            {canEdit && (
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteTap}
                  disabled={busy}
                  className="flex-1 rounded-2xl border border-cat-doctor py-3 text-sm font-bold text-cat-doctor disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  onClick={handleEditTap}
                  className="flex-1 rounded-2xl bg-ink py-3 text-sm font-bold text-white"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete scope chooser for recurring events */}
      {showDeleteScope && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 sm:items-center"
          onClick={() => setShowDeleteScope(false)}
        >
          <div
            className="flex w-full max-w-[420px] flex-col gap-2 rounded-t-card-lg bg-app p-6 sm:rounded-card-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-base font-extrabold text-ink">Remove recurring event</div>
            <button
              onClick={doDeleteOccurrence}
              disabled={busy}
              className="w-full rounded-2xl bg-chip px-4 py-3 text-left text-sm font-bold text-ink disabled:opacity-50"
            >
              This event only
            </button>
            <button
              onClick={doDeleteFuture}
              disabled={busy}
              className="w-full rounded-2xl bg-chip px-4 py-3 text-left text-sm font-bold text-ink disabled:opacity-50"
            >
              This and following events
            </button>
            <button
              onClick={doDeleteAll}
              disabled={busy}
              className="w-full rounded-2xl border border-cat-doctor px-4 py-3 text-left text-sm font-bold text-cat-doctor disabled:opacity-50"
            >
              All events in series
            </button>
          </div>
        </div>
      )}

      {/* Edit scope chooser for recurring events */}
      {showEditScope && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/55 sm:items-center"
          onClick={() => setShowEditScope(false)}
        >
          <div
            className="flex w-full max-w-[420px] flex-col gap-2 rounded-t-card-lg bg-app p-6 sm:rounded-card-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-base font-extrabold text-ink">Edit recurring event</div>
            <button
              onClick={() => {
                setShowEditScope(false);
                onEdit(event, "this");
              }}
              className="w-full rounded-2xl bg-chip px-4 py-3 text-left text-sm font-bold text-ink"
            >
              This event only
            </button>
            <button
              onClick={() => {
                setShowEditScope(false);
                onEdit(event, "future");
              }}
              className="w-full rounded-2xl bg-chip px-4 py-3 text-left text-sm font-bold text-ink"
            >
              This and following events
            </button>
            <button
              onClick={() => {
                setShowEditScope(false);
                onEdit(event, "all");
              }}
              className="w-full rounded-2xl bg-ink px-4 py-3 text-left text-sm font-bold text-white"
            >
              All events in series
            </button>
          </div>
        </div>
      )}

      {pinAction && (
        <PinPrompt onCancel={() => setPinAction(null)} onSuccess={handlePinSuccess} />
      )}
    </>
  );
}
