import { useEffect, useRef, useState } from "react";
import { ApiError, useExtractBillPhoto, type ExtractBillPhotoResponse } from "@chaos-coordinator/core";
import { FormHeader } from "../../../components/FormHeader";

interface BillPhotoCaptureScreenProps {
  onCancel: () => void;
  onExtracted: (result: ExtractBillPhotoResponse, images: File[]) => void;
}

function describeExtractError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return "The server can't reach the AI service configured for this — check its setup on the server, then try again.";
    }
    return `Something went wrong (server returned ${err.status}). Try again, or check the server logs.`;
  }
  return "Couldn't reach the server at all — check your connection and that the app's backend is running.";
}

/** Capture step of "scan a bill": take (or pick) one or more photos, all of the *same* bill —
 * multiple pages get combined into a single reading. Mirrors the Photo-mode half of the
 * calendar's ImportDefaultsScreen (same dual hidden-input + thumbnail-strip pattern), minus the
 * category/attendee/timezone/text-mode bits bills don't need. */
export function BillPhotoCaptureScreen({ onCancel, onExtracted }: BillPhotoCaptureScreenProps) {
  const extract = useExtractBillPhoto();
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraInputKey, setCameraInputKey] = useState(0);
  const [libraryInputKey, setLibraryInputKey] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setThumbnailUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImages((prev) => [...prev, ...Array.from(files)]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = images.length > 0 && !extract.isPending;

  async function handleExtract() {
    setError(null);
    try {
      const result = await extract.mutateAsync(images.map((file) => ({ blob: file, fileName: file.name })));
      onExtracted(result, images);
    } catch (err) {
      setError(describeExtractError(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <FormHeader title="Scan a bill" onCancel={onCancel} onSave={handleExtract} saveLabel="Read bill" saveDisabled={!canSubmit} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <div className="text-sm font-medium text-ink-muted">
          Take a photo of the bill — if it's more than one page, add all the pages here first. They'll be
          read together as one bill.
        </div>

        {/* Two separate inputs, not one — see ImportDefaultsScreen for why `capture` and `multiple`
         * can't share an input on mobile, and why each needs a key-remount after every use. */}
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

        {error && <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{error}</div>}

        {extract.isPending && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-chip px-4 py-6 text-center">
            <div className="text-sm font-bold text-ink">Reading with AI…</div>
            <div className="text-xs font-medium text-ink-muted">This can take up to a minute — hang tight.</div>
          </div>
        )}
      </div>
    </div>
  );
}
