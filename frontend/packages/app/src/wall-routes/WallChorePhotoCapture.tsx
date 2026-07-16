import { useEffect, useRef, useState } from "react";
import { useCompleteChore, useUploadChorePhoto, type ChoreDto } from "@chaos-coordinator/core";

interface WallChorePhotoCaptureProps {
  chore: ChoreDto;
  onDone: () => void;
  onCancel: () => void;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** The wall display's full-screen camera capture — "Say cheese in 3…2…1" — attaching a photo of
 * whoever taps the chore, as the enforcement mechanism for the photoRequired flag. Uses
 * getUserMedia directly (this is a fixed kiosk device, not a phone with a native camera picker). */
export function WallChorePhotoCapture({ chore, onDone, onCancel }: WallChorePhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const uploadPhoto = useUploadChorePhoto();
  const completeChore = useCompleteChore();

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError("Couldn't access the camera."));

    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function capture() {
    if (!videoRef.current) return;
    setCountdown(3);
    for (const n of [2, 1, 0]) {
      await new Promise((r) => setTimeout(r, 700));
      setCountdown(n > 0 ? n : null);
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const { url } = await uploadPhoto.mutateAsync({ file: blob, fileName: `chore-${chore.id}.jpg` });
      await completeChore.mutateAsync({ id: chore.id, req: { date: todayIso(), photoUrl: url } });
      onDone();
    }, "image/jpeg");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5.5 bg-[#0F0E0C] p-7.5">
      <div className="absolute left-6.5 top-5.5 text-[13px] font-bold text-white/70">Marking "{chore.title}" complete</div>

      <div className="relative flex h-[340px] w-[340px] items-center justify-center overflow-hidden rounded-3xl border-[3px] border-white/25 bg-[radial-gradient(circle_at_50%_40%,#2b2924,#0F0E0C)]">
        {error ? (
          <span className="px-6 text-center text-sm font-semibold text-white/60">{error}</span>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        )}
        {countdown !== null && (
          <div className="absolute bottom-3.5 left-0 right-0 text-center text-[12.5px] font-semibold text-white/55">
            Say cheese in {countdown}…
          </div>
        )}
      </div>

      <div className="max-w-[340px] text-center text-[13px] font-semibold text-white/70">
        This photo attaches to this chore so parents can see it was done.
      </div>

      <button
        onClick={capture}
        disabled={!stream || countdown !== null || completeChore.isPending}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white disabled:opacity-40"
      >
        <div className="h-13 w-13 rounded-full border-[2.5px] border-[#211D18]" style={{ width: 52, height: 52 }} />
      </button>

      <button onClick={onCancel} className="text-[13px] font-semibold text-white/50">
        Cancel
      </button>
    </div>
  );
}
