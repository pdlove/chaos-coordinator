import { useRef, useState } from "react";
import { useExtractEventImport, type ExtractEventsResponse } from "@chaos-coordinator/core";
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

/** Second step — submit a photo (one or more) and/or pasted text, then wait on the local Ollama
 * extraction call. That call can take up to a minute or so on-device, so the wait state sets real
 * expectations rather than looking stuck. */
export function ImportCaptureScreen({ defaults, onBack, onExtracted }: ImportCaptureScreenProps) {
  const [mode, setMode] = useState<Mode>("Photo");
  const [images, setImages] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extract = useExtractEventImport();

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
    } catch {
      setError(
        "Couldn't read that — make sure the local AI (Ollama) is running and reachable, then try again."
      );
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-border-strong py-8 text-center text-sm font-bold text-ink-muted"
            >
              📷 Add photo(s)
            </button>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((file, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl bg-chip">
                    <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
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
