import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  useCalendarCategories,
  useExtractEventImport,
  useHousehold,
  type ExtractEventsResponse,
} from "@chaos-coordinator/core";
import { FormHeader } from "../../../components/FormHeader";
import { FloatingTextarea } from "../../../components/FloatingLabelInput";
import { CategorySelectPills } from "../../../components/CategorySelectPills";
import { AttendeePillPicker } from "../../../components/AttendeePillPicker";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import { RemindersPickerScreen, formatReminderMinutes } from "../RemindersPickerScreen";

type Mode = "Photo" | "Text";

interface ImportDefaultsScreenProps {
  onCancel: () => void;
  onExtracted: (result: ExtractEventsResponse, images: File[]) => void;
}

function remindersSummary(minutes: number[]): string {
  return minutes.length === 0 ? "None" : minutes.map(formatReminderMinutes).join(", ");
}

function describeExtractError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return "The server can't reach the AI service configured for this — check its setup on the server, then try again.";
    }
    if (err.status === 404) {
      return "This feature isn't available on the server you're connected to — it may need to be rebuilt/redeployed with the latest update.";
    }
    return `Something went wrong (server returned ${err.status}). Try again, or check the server logs.`;
  }
  return "Couldn't reach the server at all — check your connection and that the app's backend is running.";
}

/** Single-screen "create events from a photo" flow: pick the defaults every extracted candidate
 * starts with (still editable per-candidate on the review screen), then submit a photo/pasted
 * text and wait on the local Ollama extraction call. That call can take up to a minute or so
 * on-device, so the wait state sets real expectations rather than looking stuck. */
export function ImportDefaultsScreen({ onCancel, onExtracted }: ImportDefaultsScreenProps) {
  const { data: household } = useHousehold();
  const { data: categories } = useCalendarCategories();
  const extract = useExtractEventImport();

  const [categoryId, setCategoryId] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([]);
  const [showRemindersPicker, setShowRemindersPicker] = useState(false);

  const [mode, setMode] = useState<Mode>("Photo");
  const [images, setImages] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Bumped after every file selection to force the (hidden) file inputs to fully remount —
  // some mobile browsers don't reliably fire another `change` event on a reused <input> after a
  // camera capture, even after resetting `.value`.
  const [cameraInputKey, setCameraInputKey] = useState(0);
  const [libraryInputKey, setLibraryInputKey] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!categoryId && categories && categories.length > 0) setCategoryId(categories[0].id);
  }, [categoryId, categories]);

  // Object URLs for thumbnails, kept stable across renders and revoked when no longer needed —
  // creating a fresh one on every render (e.g. inline in JSX) leaks a blob URL per render.
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setThumbnailUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  function toggleAttendee(userId: string) {
    setAttendeeIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImages((prev) => [...prev, ...Array.from(files)]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit =
    !!categoryId && (mode === "Photo" ? images.length > 0 : text.trim().length > 0) && !extract.isPending;

  async function handleExtract() {
    setError(null);
    try {
      const result = await extract.mutateAsync({
        images: images.map((file) => ({ blob: file, fileName: file.name })),
        text: mode === "Text" ? text.trim() : undefined,
        defaultCategoryId: categoryId,
        defaultAttendeeUserIds: attendeeIds,
        defaultReminders: reminderMinutes.length > 0 ? reminderMinutes.join(",") : undefined,
      });
      onExtracted(result, images);
    } catch (err) {
      setError(describeExtractError(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <FormHeader
        title="Create from a photo"
        onCancel={onCancel}
        onSave={handleExtract}
        saveLabel="Extract"
        saveDisabled={!canSubmit}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <div className="text-sm font-medium text-ink-muted">
          Pick the defaults new events should start with — you can still edit each one before creating.
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Category</span>
          <CategorySelectPills categories={categories ?? []} value={categoryId} onChange={setCategoryId} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Participants</span>
          <AttendeePillPicker users={household?.users ?? []} selectedIds={attendeeIds} onToggle={toggleAttendee} />
        </div>

        <button
          onClick={() => setShowRemindersPicker(true)}
          className="flex items-center justify-between rounded-xl bg-card px-3.5 py-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Reminders</span>
          <span className="text-sm font-semibold text-ink">{remindersSummary(reminderMinutes)}</span>
        </button>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <SegmentedToggle
            value={mode}
            onChange={setMode}
            options={[
              { value: "Photo", label: "Photo" },
              { value: "Text", label: "Paste text" },
            ]}
          />

          {mode === "Photo" ? (
            <div className="flex flex-col gap-3">
              {/* Two separate inputs, not one — `capture` forces a single-shot live-camera flow
               * on iOS Safari and most Android browsers, which silently defeats `multiple` if
               * combined on the same input. Visually-hidden-but-not-display:none (rather than
               * Tailwind's `hidden`), plus a key bump forcing a full remount after each use, work
               * around known mobile-browser flakiness where a reused file input doesn't reliably
               * fire another `change` event after a camera capture. */}
              <input
                key={cameraInputKey}
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                capture="environment"
                style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
                onChange={(e) => {
                  addFiles(e.target.files);
                  setCameraInputKey((k) => k + 1);
                }}
              />
              <input
                key={libraryInputKey}
                ref={libraryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
                onChange={(e) => {
                  addFiles(e.target.files);
                  setLibraryInputKey((k) => k + 1);
                }}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 rounded-2xl border-2 border-dashed border-border-strong py-8 text-center text-sm font-bold text-ink-muted"
                >
                  📷 Take a photo
                </button>
                <button
                  onClick={() => libraryInputRef.current?.click()}
                  className="flex-1 rounded-2xl border-2 border-dashed border-border-strong py-8 text-center text-sm font-bold text-ink-muted"
                >
                  🖼️ Choose photo(s)
                </button>
              </div>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((file, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl bg-chip">
                      <a href={thumbnailUrls[i]} target="_blank" rel="noreferrer">
                        <img src={thumbnailUrls[i]} alt="" className="h-full w-full object-cover" />
                      </a>
                      <button
                        onClick={() => removeImage(i)}
                        aria-label="Remove"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs font-bold text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <FloatingTextarea label="Paste text" value={text} onChange={(e) => setText(e.target.value)} rows={8} />
          )}

          {error && (
            <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{error}</div>
          )}

          {extract.isPending && (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-chip px-4 py-6 text-center">
              <div className="text-sm font-bold text-ink">Reading with AI…</div>
              <div className="text-xs font-medium text-ink-muted">
                This can take up to a minute — hang tight.
              </div>
            </div>
          )}
        </div>
      </div>

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
