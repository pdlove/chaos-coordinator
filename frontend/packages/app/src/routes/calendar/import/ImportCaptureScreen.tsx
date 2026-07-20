import { useEffect, useRef, useState } from "react";
import { ApiError, useExtractEventImport, type ExtractEventsResponse } from "@chaos-coordinator/core";
import { FormHeader } from "../../../components/FormHeader";
import { FloatingTextarea } from "../../../components/FloatingLabelInput";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import type { ImportDefaults } from "./ImportDefaultsScreen";

type Mode = "Photo" | "Text";

interface ImportCaptureScreenProps {
  defaults: ImportDefaults;
  onBack: () => void;
  onExtracted: (result: ExtractEventsResponse, images: File[]) => void;
}

function describeExtractError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return "The server can't reach the local AI (Ollama) — make sure it's running and OLLAMA_BASE_URL is set correctly on the server, then try again.";
    }
    if (err.status === 404) {
      return "This feature isn't available on the server you're connected to — it may need to be rebuilt/redeployed with the latest update.";
    }
    return `Something went wrong (server returned ${err.status}). Try again, or check the server logs.`;
  }
  return "Couldn't reach the server at all — check your connection and that the app's backend is running.";
}

/** Second step — submit a photo (one or more) and/or pasted text, then wait on the local Ollama
 * extraction call. That call can take up to a minute or so on-device, so the wait state sets real
 * expectations rather than looking stuck. */
export function ImportCaptureScreen({ defaults, onBack, onExtracted }: ImportCaptureScreenProps) {
  const [mode, setMode] = useState<Mode>("Photo");
  const [images, setImages] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const extract = useExtractEventImport();

  // Object URLs for thumbnails, kept stable across renders and revoked when no longer needed —
  // creating a fresh one on every render (e.g. inline in JSX) leaks a blob URL per render.
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setThumbnailUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = mode === "Photo" ? images.length > 0 : text.trim().length > 0;

  async function handleSubmit() {
    setError(null);
    try {
      const result = await extract.mutateAsync({
        images: images.map((file) => ({ blob: file, fileName: file.name })),
        text: mode === "Text" ? text.trim() : undefined,
        defaultCategoryId: defaults.categoryId,
        defaultAttendeeUserIds: defaults.attendeeUserIds,
        defaultReminders: defaults.reminderMinutes.length > 0 ? defaults.reminderMinutes.join(",") : undefined,
      });
      onExtracted(result, images);
    } catch (err) {
      setError(describeExtractError(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <FormHeader title="Create from a photo" onCancel={onBack} onSave={handleSubmit} saveLabel="Extract" saveDisabled={!canSubmit || extract.isPending} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
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
            {/* Two separate inputs, not one — `capture` forces a single-shot live-camera flow on
             * iOS Safari and most Android browsers, which silently defeats `multiple` if they're
             * combined on the same input. Splitting them is the only reliable way to support both
             * "take one photo now" and "pick several existing photos at once". */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
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
          <FloatingTextarea
            label="Paste text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            autoFocus
          />
        )}

        {error && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{error}</div>
        )}

        {extract.isPending && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-chip px-4 py-6 text-center">
            <div className="text-sm font-bold text-ink">Reading with local AI…</div>
            <div className="text-xs font-medium text-ink-muted">
              This runs on your own device and can take up to a minute — hang tight.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
