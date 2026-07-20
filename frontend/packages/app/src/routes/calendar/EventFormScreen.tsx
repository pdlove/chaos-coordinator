import { useEffect, useState } from "react";
import {
  useCalendarCategories,
  useCreateEvent,
  useDeleteEvent,
  useEditEventOccurrence,
  useHousehold,
  useSavedLocations,
  useSplitEventSeries,
  useUpdateEvent,
  type CalendarEventDto,
} from "@chaos-coordinator/core";
import { FormHeader } from "../../components/FormHeader";
import { FloatingInput, FloatingTextarea } from "../../components/FloatingLabelInput";
import { CategorySelectPills } from "../../components/CategorySelectPills";
import { AttendeePillPicker } from "../../components/AttendeePillPicker";
import { RepeatPickerScreen, defaultRecurrence, repeatSummary, type RecurrenceValue } from "./RepeatPickerScreen";
import { RemindersPickerScreen, formatReminderMinutes } from "./RemindersPickerScreen";
import { ImportEventsFlow } from "./import/ImportEventsFlow";
import { CameraIcon } from "./CalendarViewIcons";

/** "this" = one occurrence only, "future" = this and every later occurrence, "all" = the whole
 * series (also used for non-recurring events and brand-new events). */
export type EditScope = "this" | "future" | "all";

interface EventFormScreenProps {
  event: CalendarEventDto | null; // null = creating a new event
  defaultDate: Date;
  scope?: EditScope;
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

function daysBetween(fromDate: string, toDate: string): number {
  const a = new Date(`${fromDate}T00:00`);
  const b = new Date(`${toDate}T00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function shiftDateValue(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T00:00`);
  d.setDate(d.getDate() + deltaDays);
  return toDateValue(d);
}

function minutesSinceMidnight(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function shiftTimeValue(timeStr: string, deltaMinutes: number): string {
  const total = (((minutesSinceMidnight(timeStr) + deltaMinutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function parseCsvInts(csv: string | null | undefined): number[] {
  if (!csv) return [];
  return csv.split(",").map(Number).filter((n) => !isNaN(n));
}

function travelMinutesFromLeaveBy(start: string, leaveBy: string | null): number | null {
  if (!leaveBy) return null;
  return Math.round((new Date(start).getTime() - new Date(leaveBy).getTime()) / 60000);
}

function recurrenceFromEvent(event: CalendarEventDto | null, fallbackDate: Date): RecurrenceValue {
  if (!event?.recurrenceFrequency) return defaultRecurrence(event ? new Date(event.start) : fallbackDate);
  const start = new Date(event.start);
  return {
    frequency: event.recurrenceFrequency,
    interval: event.recurrenceInterval || 1,
    days: parseCsvInts(event.recurrenceDays),
    monthMode: event.recurrenceMonthDay != null ? "date" : "weekday",
    monthDay: event.recurrenceMonthDay ?? start.getDate(),
    weekOrdinal: event.recurrenceWeekOrdinal ?? 1,
    weekday: event.recurrenceWeekday ?? start.getDay(),
    end: event.recurrenceEnd ? toDateValue(new Date(event.recurrenceEnd)) : "",
  };
}

function remindersSummary(minutes: number[]): string {
  return minutes.length === 0 ? "None" : minutes.map(formatReminderMinutes).join(", ");
}

export function EventFormScreen({ event, defaultDate, scope = "all", onClose }: EventFormScreenProps) {
  const { data: household } = useHousehold();
  const { data: categories } = useCalendarCategories();
  const { data: savedLocations } = useSavedLocations();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const editOccurrence = useEditEventOccurrence();
  const splitSeries = useSplitEventSeries();

  const [categoryId, setCategoryId] = useState(event?.category.id ?? "");
  const [title, setTitle] = useState(event?.title ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(event?.attendees.map((a) => a.id) ?? []);
  const [startDate, setStartDate] = useState(
    event ? toDateValue(new Date(event.start)) : toDateValue(defaultDate)
  );
  const [startTime, setStartTime] = useState(event ? toTimeValue(new Date(event.start)) : "");
  // New events default End's date to the same day as Start (existing events keep whatever end
  // date/time they already have, including no end at all).
  const [endDate, setEndDate] = useState(
    event?.end ? toDateValue(new Date(event.end)) : !event ? toDateValue(defaultDate) : ""
  );
  const [endTime, setEndTime] = useState(event?.end ? toTimeValue(new Date(event.end)) : "");
  const [travelMinutes, setTravelMinutes] = useState<number | null>(
    event ? travelMinutesFromLeaveBy(event.start, event.travelTimeLeaveBy) : null
  );
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(recurrenceFromEvent(event, defaultDate));
  const [reminderMinutes, setReminderMinutes] = useState<number[]>(parseCsvInts(event?.reminders));
  const [notes, setNotes] = useState(event?.notes ?? "");

  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [showRemindersPicker, setShowRemindersPicker] = useState(false);
  const [showImportFlow, setShowImportFlow] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // New events default to the household's first configured category once it's loaded.
  useEffect(() => {
    if (!categoryId && categories && categories.length > 0) setCategoryId(categories[0].id);
  }, [categoryId, categories]);

  // Repeat pattern, participants, travel time, and reminders are series-level — editing just one
  // occurrence only touches the basics (title/time/location/category/notes for that date).
  const showSeriesLevelFields = scope !== "this";
  const busy =
    createEvent.isPending || updateEvent.isPending || deleteEvent.isPending ||
    editOccurrence.isPending || splitSeries.isPending;

  // Moving Start carries End along by the same amount, so an existing end date/time (or duration)
  // isn't left stranded relative to the new start.
  function handleStartDateChange(newDate: string) {
    if (endDate) setEndDate(shiftDateValue(endDate, daysBetween(startDate, newDate)));
    setStartDate(newDate);
  }

  function handleStartTimeChange(newTime: string) {
    if (startTime && endTime) {
      setEndTime(shiftTimeValue(endTime, minutesSinceMidnight(newTime) - minutesSinceMidnight(startTime)));
    }
    setStartTime(newTime);
  }

  function toggleAttendee(userId: string) {
    setAttendeeIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  function recurrenceRequestFields(v: RecurrenceValue) {
    return {
      recurrenceFrequency: v.frequency,
      recurrenceInterval: v.interval,
      recurrenceDays: v.frequency === "Weekly" && v.days.length > 0 ? v.days.join(",") : null,
      recurrenceMonthDay: v.frequency === "Monthly" && v.monthMode === "date" ? v.monthDay : null,
      recurrenceWeekOrdinal: v.frequency === "Monthly" && v.monthMode === "weekday" ? v.weekOrdinal : null,
      recurrenceWeekday: v.frequency === "Monthly" && v.monthMode === "weekday" ? v.weekday : null,
    };
  }

  async function handleSave() {
    setSaveError(null);
    const startIso = toISOString(startDate, startTime);
    // endDate defaults to Start's day for new events (see the useState above) even before the
    // user sets an end at all, so an end only actually exists once an end time is given.
    const endIso = endTime ? toISOString(endDate, endTime) : null;
    // Recomputed from the current Start + fixed minutes offset every save, so editing Start keeps
    // the offset stable instead of leaving leave-by pinned to a stale absolute time.
    const travelTimeLeaveBy =
      travelMinutes != null ? new Date(new Date(startIso).getTime() - travelMinutes * 60000).toISOString() : null;
    const reminders = reminderMinutes.length > 0 ? reminderMinutes.join(",") : null;

    try {
      if (event && scope === "this") {
        await editOccurrence.mutateAsync({
          id: event.id,
          req: {
            date: event.instanceDate!,
            title,
            start: startIso,
            end: endIso,
            categoryId,
            location: location.trim() || null,
            notes: notes.trim() || null,
          },
        });
      } else if (event && scope === "future") {
        await splitSeries.mutateAsync({
          id: event.id,
          req: {
            date: event.instanceDate!,
            title,
            start: startIso,
            end: endIso,
            categoryId,
            location: location.trim() || null,
            notes: notes.trim() || null,
            attendeeUserIds: attendeeIds,
            ...recurrenceRequestFields(recurrence),
            travelTimeLeaveBy,
            reminders,
          },
        });
      } else {
        const req = {
          title,
          start: startIso,
          end: endIso,
          categoryId,
          location: location.trim() || null,
          notes: notes.trim() || null,
          attendeeUserIds: attendeeIds,
          ...recurrenceRequestFields(recurrence),
          recurrenceEnd: recurrence.frequency !== null && recurrence.end ? new Date(recurrence.end).toISOString() : null,
          travelTimeLeaveBy,
          reminders,
        };
        if (event) {
          await updateEvent.mutateAsync({ id: event.id, req });
        } else {
          await createEvent.mutateAsync(req);
        }
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

  const formTitle = !event
    ? "New event"
    : scope === "this"
      ? "Edit this event"
      : scope === "future"
        ? "Edit this and following"
        : "Edit event";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <FormHeader
        title={formTitle}
        onCancel={onClose}
        onSave={handleSave}
        saveDisabled={busy || !title.trim() || !startDate}
        titleAction={
          !event ? { icon: <CameraIcon />, label: "Create from a photo", onClick: () => setShowImportFlow(true) } : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Category</span>
          <CategorySelectPills categories={categories ?? []} value={categoryId} onChange={setCategoryId} />
        </div>

        <FloatingInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

        <FloatingInput
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          list="saved-locations"
        />
        <datalist id="saved-locations">
          {savedLocations?.map((l) => (
            <option key={l.id} value={l.name}>
              {l.address}
            </option>
          ))}
        </datalist>

        {showSeriesLevelFields && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Participants</span>
            <AttendeePillPicker users={household?.users ?? []} selectedIds={attendeeIds} onToggle={toggleAttendee} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="w-11 shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Start</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-[168px] shrink-0 rounded-xl border border-border-strong bg-card px-2.5 py-2.5 text-sm font-semibold text-ink"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            className="w-[104px] shrink-0 rounded-xl border border-border-strong bg-card px-2.5 py-2.5 text-sm font-semibold text-ink"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="w-11 shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-faint">End</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[168px] shrink-0 rounded-xl border border-border-strong bg-card px-2.5 py-2.5 text-sm font-semibold text-ink"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-[104px] shrink-0 rounded-xl border border-border-strong bg-card px-2.5 py-2.5 text-sm font-semibold text-ink"
          />
        </div>

        {showSeriesLevelFields && (
          <>
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
              <span className="text-sm font-semibold text-ink">{repeatSummary(recurrence)}</span>
            </button>

            <button
              onClick={() => setShowRemindersPicker(true)}
              className="flex items-center justify-between rounded-xl bg-card px-3.5 py-3 text-left"
            >
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Reminders</span>
              <span className="text-sm font-semibold text-ink">{remindersSummary(reminderMinutes)}</span>
            </button>
          </>
        )}

        <FloatingTextarea label="Description" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />

        {!showSeriesLevelFields && (
          <div className="text-[11px] font-medium text-ink-fainter">
            Participants, travel time, repeat, and reminders apply to the whole series and aren't editable here.
          </div>
        )}

        {saveError && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">
            {saveError}
          </div>
        )}

        {event && scope === "all" && (
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
          initial={recurrence}
          onCancel={() => setShowRepeatPicker(false)}
          onSave={(value) => {
            // A Weekly pattern with no days picked is degenerate — treat it as "does not repeat"
            // rather than silently producing zero occurrences.
            setRecurrence(value.frequency === "Weekly" && value.days.length === 0 ? { ...value, frequency: null } : value);
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

      {showImportFlow && <ImportEventsFlow onClose={() => setShowImportFlow(false)} />}
    </div>
  );
}
