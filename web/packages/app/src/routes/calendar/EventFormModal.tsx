import { useState } from "react";
import {
  useCreateEvent,
  useDeleteEvent,
  useHousehold,
  useUpdateEvent,
  type CalendarEventDto,
} from "@chaos-coordinator/core";
import type { EventCategory } from "@chaos-coordinator/shared";

const CATEGORIES: EventCategory[] = ["Work", "School", "Doctor", "Home", "Personal", "Activities"];

interface EventFormModalProps {
  event: CalendarEventDto | null; // null = creating a new event
  defaultDate: Date;
  onClose: () => void;
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormModal({ event, defaultDate, onClose }: EventFormModalProps) {
  const { data: household } = useHousehold();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [title, setTitle] = useState(event?.title ?? "");
  const [start, setStart] = useState(toLocalInputValue(event ? new Date(event.start) : defaultDate));
  const [end, setEnd] = useState(event?.end ? toLocalInputValue(new Date(event.end)) : "");
  const [category, setCategory] = useState<EventCategory>(event?.category ?? "Personal");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(event?.attendees.map((a) => a.id) ?? []);

  const busy = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  function toggleAttendee(id: string) {
    setAttendeeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleSave() {
    const req = {
      title,
      start: new Date(start).toISOString(),
      end: end ? new Date(end).toISOString() : null,
      category,
      notes: null,
      attendeeUserIds: attendeeIds,
    };
    if (event) {
      await updateEvent.mutateAsync({ id: event.id, req });
    } else {
      await createEvent.mutateAsync(req);
    }
    onClose();
  }

  async function handleDelete() {
    if (!event) return;
    await deleteEvent.mutateAsync(event.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onClose}>
      <div
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-t-card-lg bg-app p-6 sm:rounded-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-extrabold text-ink">{event ? "Edit event" : "New event"}</div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            placeholder="Team standup"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Start</span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">End</span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  category === c ? "bg-ink text-white" : "bg-chip text-ink-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Attendees</span>
          <div className="flex flex-wrap gap-2">
            {household?.users.map((u) => (
              <button
                key={u.id}
                onClick={() => toggleAttendee(u.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  attendeeIds.includes(u.id) ? "bg-ink text-white" : "bg-chip text-ink-muted"
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex gap-3">
          {event && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 rounded-2xl border border-cat-doctor py-3 text-sm font-bold text-cat-doctor"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={busy || !title.trim()}
            className="flex-1 rounded-2xl bg-ink py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
