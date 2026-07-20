import { useEffect, useMemo, useState } from "react";
import {
  useCalendarCategories,
  useConfirmEventImport,
  useHousehold,
  type ConfirmedEventCandidate,
  type ExtractEventsResponse,
} from "@chaos-coordinator/core";
import { FormHeader } from "../../../components/FormHeader";
import { FloatingInput } from "../../../components/FloatingLabelInput";
import { CategorySelectPills } from "../../../components/CategorySelectPills";
import { AttendeePillPicker } from "../../../components/AttendeePillPicker";
import { isoToZonedParts, listTimeZones, zonedPartsToIso } from "./timezone";

interface EditableCandidate {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timeZoneId: string;
  location: string;
  notes: string;
  categoryId: string;
  attendeeUserIds: string[];
  reminders: string | null;
  duplicateTitle: string | null;
  duplicateDate: string | null;
  included: boolean;
}

function toEditable(response: ExtractEventsResponse): EditableCandidate[] {
  return response.candidates.map((c) => {
    const start = isoToZonedParts(c.start, c.timeZoneId);
    return {
      title: c.title,
      date: start.date,
      startTime: start.time,
      endTime: c.end ? isoToZonedParts(c.end, c.timeZoneId).time : "",
      timeZoneId: c.timeZoneId,
      location: c.location ?? "",
      notes: c.notes ?? "",
      categoryId: c.categoryId,
      attendeeUserIds: c.attendeeUserIds,
      reminders: c.reminders,
      duplicateTitle: c.duplicateOf?.title ?? null,
      duplicateDate: c.duplicateOf ? new Date(c.duplicateOf.start).toLocaleDateString([], { month: "short", day: "numeric" }) : null,
      // Defaults to unchecked when it looks like a duplicate, rather than excluding it outright —
      // the user might still want it (e.g. an updated time for the same recurring practice).
      included: c.duplicateOf === null,
    };
  });
}

interface ImportReviewScreenProps {
  extraction: ExtractEventsResponse;
  sourceImages: File[];
  onBack: () => void;
  onDone: () => void;
}

/** Third step — review, edit, and prune the extracted candidates before creating them for real.
 * Source images are shown from the in-memory files picked in the capture step (object URLs);
 * once created, an event's permanent source link comes from CalendarEventDto.sourceImageUrls
 * instead (see EventViewModal). */
export function ImportReviewScreen({ extraction, sourceImages, onBack, onDone }: ImportReviewScreenProps) {
  const { data: household } = useHousehold();
  const { data: categories } = useCalendarCategories();
  const confirmImport = useConfirmEventImport();

  const [candidates, setCandidates] = useState<EditableCandidate[]>(() => toEditable(extraction));
  const [saveError, setSaveError] = useState<string | null>(null);
  const timeZones = useMemo(() => listTimeZones(), []);

  // Computed once per sourceImages change and revoked on cleanup — calling createObjectURL
  // inline in JSX creates a fresh (and never-revoked) blob URL on every render.
  const [sourceImageUrls, setSourceImageUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = sourceImages.map((file) => URL.createObjectURL(file));
    setSourceImageUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [sourceImages]);

  function update(index: number, patch: Partial<EditableCandidate>) {
    setCandidates((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  const includedCount = candidates.filter((c) => c.included).length;

  async function handleConfirm() {
    setSaveError(null);
    const events: ConfirmedEventCandidate[] = candidates
      .filter((c) => c.included)
      .map((c) => ({
        title: c.title,
        start: zonedPartsToIso(c.date, c.startTime, c.timeZoneId),
        end: c.endTime ? zonedPartsToIso(c.date, c.endTime, c.timeZoneId) : null,
        categoryId: c.categoryId,
        location: c.location.trim() || null,
        notes: c.notes.trim() || null,
        attendeeUserIds: c.attendeeUserIds,
        reminders: c.reminders,
      }));

    try {
      await confirmImport.mutateAsync({ batchId: extraction.batchId, events });
      onDone();
    } catch {
      setSaveError("Something went wrong creating these events — please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <FormHeader
        title="Review events"
        onCancel={onBack}
        onSave={handleConfirm}
        saveLabel={`Create ${includedCount}`}
        saveDisabled={includedCount === 0 || confirmImport.isPending}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {sourceImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {sourceImages.map((_, i) => (
              <a key={i} href={sourceImageUrls[i]} target="_blank" rel="noreferrer">
                <img src={sourceImageUrls[i]} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              </a>
            ))}
          </div>
        )}

        {candidates.length === 0 && (
          <div className="rounded-xl bg-chip px-4 py-6 text-center text-sm font-semibold text-ink-muted">
            Nothing was found — try a clearer photo or add more detail to the pasted text.
          </div>
        )}

        {candidates.map((c, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-card p-4">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={c.included}
                onChange={(e) => update(i, { included: e.target.checked })}
                className="h-5 w-5 shrink-0"
              />
              <FloatingInput
                label="Title"
                value={c.title}
                onChange={(e) => update(i, { title: e.target.value })}
                className="flex-1"
              />
            </div>

            {c.duplicateTitle && (
              <div className="rounded-xl bg-[#FFF3D6] px-3 py-2 text-xs font-semibold text-[#8A6100]">
                Might already exist: "{c.duplicateTitle}" on {c.duplicateDate}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={c.date}
                onChange={(e) => update(i, { date: e.target.value })}
                className="w-[152px] shrink-0 rounded-xl border border-border-strong bg-app px-2.5 py-2.5 text-sm font-semibold text-ink"
              />
              <input
                type="time"
                value={c.startTime}
                onChange={(e) => update(i, { startTime: e.target.value })}
                className="w-[96px] shrink-0 rounded-xl border border-border-strong bg-app px-2.5 py-2.5 text-sm font-semibold text-ink"
              />
              <input
                type="time"
                value={c.endTime}
                onChange={(e) => update(i, { endTime: e.target.value })}
                className="w-[96px] shrink-0 rounded-xl border border-border-strong bg-app px-2.5 py-2.5 text-sm font-semibold text-ink"
              />
            </div>

            {/* Changing this reinterprets the same date/time digits above in a different zone —
             * it doesn't reformat them — so fixing "I picked the wrong timezone for this one
             * event" is a single change, not a recompute-by-hand. */}
            <select
              value={c.timeZoneId}
              onChange={(e) => update(i, { timeZoneId: e.target.value })}
              className="w-full rounded-xl border border-border-strong bg-app px-2.5 py-2 text-xs font-semibold text-ink-muted"
            >
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>

            <FloatingInput label="Location" value={c.location} onChange={(e) => update(i, { location: e.target.value })} />

            <CategorySelectPills
              categories={categories ?? []}
              value={c.categoryId}
              onChange={(categoryId) => update(i, { categoryId })}
            />

            <AttendeePillPicker
              users={household?.users ?? []}
              selectedIds={c.attendeeUserIds}
              onToggle={(userId) =>
                update(i, {
                  attendeeUserIds: c.attendeeUserIds.includes(userId)
                    ? c.attendeeUserIds.filter((id) => id !== userId)
                    : [...c.attendeeUserIds, userId],
                })
              }
            />
          </div>
        ))}

        {saveError && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{saveError}</div>
        )}
      </div>
    </div>
  );
}
