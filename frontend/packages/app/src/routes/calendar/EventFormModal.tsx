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
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

interface EventFormModalProps {
  event: CalendarEventDto | null; // null = creating a new event
  defaultDate: Date;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

function toDateValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeValue(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISOString(date: string, time: string): string {
  return new Date(`${date}T${time || "00:00"}`).toISOString();
}

function parseDays(csv: string | null | undefined): number[] {
  if (!csv) return [];
  return csv.split(",").map(Number).filter((n) => !isNaN(n));
}

export function EventFormModal({ event, defaultDate, onClose }: EventFormModalProps) {
  const { data: household } = useHousehold();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [title, setTitle] = useState(event?.title ?? "");
  const [startDate, setStartDate] = useState(
    event ? toDateValue(new Date(event.start)) : toDateValue(defaultDate)
  );
  const [startTime, setStartTime] = useState(event ? toTimeValue(new Date(event.start)) : "");
  const [endDate, setEndDate] = useState(event?.end ? toDateValue(new Date(event.end)) : "");
  const [endTime, setEndTime] = useState(event?.end ? toTimeValue(new Date(event.end)) : "");
  const [category, setCategory] = useState<EventCategory>(event?.category ?? "Personal");
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(event?.attendees.map((a) => a.id) ?? []);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(parseDays(event?.recurrenceDays));
  const [recurrenceEnd, setRecurrenceEnd] = useState<string>(
    event?.recurrenceEnd ? toDateValue(new Date(event.recurrenceEnd)) : ""
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const busy = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;
  const isRecurring = recurrenceDays.length > 0;

  function toggleAttendee(id: string) {
    setAttendeeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function handleStartDateChange(value: string) {
    const prevDay = startDate ? new Date(startDate + "T00:00").getDay() : -1;
    setStartDate(value);
    if (isRecurring && value) {
      const newDay = new Date(value + "T00:00").getDay();
      if (prevDay !== -1 && prevDay !== newDay) {
        setRecurrenceDays((prev) => [...prev.filter((d) => d !== prevDay), newDay].sort((a, b) => a - b));
      }
    }
  }

  function toggleRepeat() {
    if (isRecurring) {
      setRecurrenceDays([]);
      setRecurrenceEnd("");
    } else {
      const day = startDate ? new Date(startDate + "T00:00").getDay() : new Date().getDay();
      setRecurrenceDays([day]);
    }
  }

  function toggleDay(day: number) {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function handleSave() {
    setSaveError(null);
    const req = {
      title,
      start: toISOString(startDate, startTime),
      end: endDate ? toISOString(endDate, endTime) : null,
      category,
      location: location.trim() || null,
      notes: notes.trim() || null,
      attendeeUserIds: attendeeIds,
      recurrenceDays: recurrenceDays.length > 0 ? recurrenceDays.join(",") : null,
      recurrenceEnd: recurrenceDays.length > 0 && recurrenceEnd
        ? new Date(recurrenceEnd).toISOString()
        : null,
    };
    try {
      if (event) {
        await updateEvent.mutateAsync({ id: event.id, req });
      } else {
        await createEvent.mutateAsync(req);
      }
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  async function handleDelete() {
    if (!event) return;
    try {
      await deleteEvent.mutateAsync(event.id);
      onClose();
    } catch {
      setSaveError("Couldn't delete — please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onClose}>
      <div
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-t-card-lg bg-app p-6 sm:rounded-card-lg overflow-y-auto max-h-[90dvh]"
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
            autoFocus
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Start</span>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="flex-1 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-28 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
              placeholder="Time"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">End</span>
          <div className="flex gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-28 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
              placeholder="Time"
            />
          </div>
        </div>

        {/* Recurrence */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Repeats</span>
          <button
            onClick={toggleRepeat}
            className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${
              isRecurring ? "bg-ink text-white" : "bg-chip text-ink-muted"
            }`}
          >
            {isRecurring ? "Weekly" : "Does not repeat"}
          </button>

          {isRecurring && (
            <>
              <div className="flex gap-1.5">
                {DAY_LETTERS.map((label, day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      recurrenceDays.includes(day) ? "bg-ink text-white" : "bg-chip text-ink-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  Ends (optional)
                </span>
                <input
                  type="date"
                  value={recurrenceEnd}
                  onChange={(e) => setRecurrenceEnd(e.target.value)}
                  className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
                />
              </label>
            </>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            placeholder="123 Main St or Zoom"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Description</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            placeholder="Add notes…"
          />
        </label>

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

        {saveError && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">
            {saveError}
          </div>
        )}

        <div className="flex gap-3">
          {event && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 rounded-2xl border border-cat-doctor py-3 text-sm font-bold text-cat-doctor disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={busy || !title.trim() || !startDate}
            className="flex-1 rounded-2xl bg-ink py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
