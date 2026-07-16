import { useState } from "react";
import {
  useCreateEvent,
  useDeleteEvent,
  useHousehold,
  useUpdateEvent,
  type CalendarEventDto,
} from "@chaos-coordinator/core";
import type { EventCategory } from "@chaos-coordinator/shared";
import { CategoryPill } from "../../components/CategoryPill";
import { FormHeader } from "../../components/FormHeader";
import { FloatingInput, FloatingTextarea } from "../../components/FloatingLabelInput";
import { RepeatPickerScreen } from "./RepeatPickerScreen";
import { RemindersPickerScreen, formatReminderMinutes } from "./RemindersPickerScreen";

const CATEGORIES: EventCategory[] = ["Work", "School", "Doctor", "Home", "Personal", "Activities"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface EventFormScreenProps {
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

function parseCsvInts(csv: string | null | undefined): number[] {
  if (!csv) return [];
  return csv.split(",").map(Number).filter((n) => !isNaN(n));
}

function travelMinutesFromLeaveBy(start: string, leaveBy: string | null): number | null {
  if (!leaveBy) return null;
  return Math.round((new Date(start).getTime() - new Date(leaveBy).getTime()) / 60000);
}

function repeatSummary(days: number[], end: string): string {
  if (days.length === 0) return "Does not repeat";
  const labels = days.map((d) => DAY_SHORT[d]).join(", ");
  if (!end) return `Weekly on ${labels}`;
  return `Weekly on ${labels}, until ${new Date(end).toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function remindersSummary(minutes: number[]): string {
  return minutes.length === 0 ? "None" : minutes.map(formatReminderMinutes).join(", ");
}

export function EventFormScreen({ event, defaultDate, onClose }: EventFormScreenProps) {
  const { data: household } = useHousehold();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [category, setCategory] = useState<EventCategory>(event?.category ?? "Activities");
  const [title, setTitle] = useState(event?.title ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(event?.attendees.map((a) => a.id) ?? []);
  const [startDate, setStartDate] = useState(
    event ? toDateValue(new Date(event.start)) : toDateValue(defaultDate)
  );
  const [startTime, setStartTime] = useState(event ? toTimeValue(new Date(event.start)) : "");
  const [endDate, setEndDate] = useState(event?.end ? toDateValue(new Date(event.end)) : "");
  const [endTime, setEndTime] = useState(event?.end ? toTimeValue(new Date(event.end)) : "");
  const [travelMinutes, setTravelMinutes] = useState<number | null>(
    event ? travelMinutesFromLeaveBy(event.start, event.travelTimeLeaveBy) : null
  );
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(parseCsvInts(event?.recurrenceDays));
  const [recurrenceEnd, setRecurrenceEnd] = useState<string>(
    event?.recurrenceEnd ? toDateValue(new Date(event.recurrenceEnd)) : ""
  );
  const [reminderMinutes, setReminderMinutes] = useState<number[]>(parseCsvInts(event?.reminders));
  const [notes, setNotes] = useState(event?.notes ?? "");

  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [showRemindersPicker, setShowRemindersPicker] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const busy = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  function toggleAttendee(id: string) {
    setAttendeeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleSave() {
    setSaveError(null);
    const startIso = toISOString(startDate, startTime);
    const req = {
      title,
      start: startIso,
      end: endDate ? toISOString(endDate, endTime) : null,
      category,
      location: location.trim() || null,
      notes: notes.trim() || null,
      attendeeUserIds: attendeeIds,
      recurrenceDays: recurrenceDays.length > 0 ? recurrenceDays.join(",") : null,
      recurrenceEnd: recurrenceDays.length > 0 && recurrenceEnd ? new Date(recurrenceEnd).toISOString() : null,
      // Recomputed from the current Start + fixed minutes offset every save, so editing Start
      // keeps the offset stable instead of leaving leave-by pinned to a stale absolute time.
      travelTimeLeaveBy:
        travelMinutes != null ? new Date(new Date(startIso).getTime() - travelMinutes * 60000).toISOString() : null,
      reminders: reminderMinutes.length > 0 ? reminderMinutes.join(",") : null,
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
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <FormHeader
        title={event ? "Edit event" : "New event"}
        onCancel={onClose}
        onSave={handleSave}
        saveDisabled={busy || !title.trim() || !startDate}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={category === c ? "" : "opacity-50"}>
                <CategoryPill category={c} />
              </button>
            ))}
          </div>
        </div>

        <FloatingInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

        <FloatingInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Participants</span>
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

        <div className="flex items-center gap-2">
          <span className="w-11 shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Start</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[132px] shrink-0 rounded-xl border border-border-strong bg-card px-2.5 py-2.5 text-sm font-semibold text-ink"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex-1 rounded-xl border border-border-strong bg-card px-2.5 py-2.5 text-sm font-semibold text-ink"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-11 shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-faint">End</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[132px] shrink-0 rounded-xl border border-border-strong bg-card px-2.5 py-2.5 text-sm font-semibold text-ink"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="flex-1 rounded-xl border border-border-strong bg-card px-2.5 py-2.5 text-sm font-semibold text-ink"
          />
        </div>

        <FloatingInput
          label="Travel time (minutes before start)"
          type="number"
          min={0}
          value={travelMinutes ?? ""}
          onChange={(e) => setTravelMinutes(e.target.value === "" ? null : Number(e.target.value))}
        />

        <button
          onClick={() => setShowRepeatPicker(true)}
          className="flex items-center justify-between rounded-xl bg-card px-3.5 py-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Repeat</span>
          <span className="text-sm font-semibold text-ink">{repeatSummary(recurrenceDays, recurrenceEnd)}</span>
        </button>

        <button
          onClick={() => setShowRemindersPicker(true)}
          className="flex items-center justify-between rounded-xl bg-card px-3.5 py-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Reminders</span>
          <span className="text-sm font-semibold text-ink">{remindersSummary(reminderMinutes)}</span>
        </button>

        <FloatingTextarea label="Description" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />

        {saveError && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">
            {saveError}
          </div>
        )}

        {event && (
          <button
            onClick={handleDelete}
            disabled={busy}
            className="rounded-2xl border border-cat-doctor py-3 text-sm font-bold text-cat-doctor disabled:opacity-50"
          >
            Delete event
          </button>
        )}
      </div>

      {showRepeatPicker && (
        <RepeatPickerScreen
          initialDays={recurrenceDays}
          initialEnd={recurrenceEnd}
          onCancel={() => setShowRepeatPicker(false)}
          onSave={(days, end) => {
            setRecurrenceDays(days);
            setRecurrenceEnd(days.length > 0 ? end : "");
            setShowRepeatPicker(false);
          }}
        />
      )}

      {showRemindersPicker && (
        <RemindersPickerScreen
          initialMinutes={reminderMinutes}
          onCancel={() => setShowRemindersPicker(false)}
          onSave={(minutes) => {
            setReminderMinutes(minutes);
            setShowRemindersPicker(false);
          }}
        />
      )}
    </div>
  );
}
