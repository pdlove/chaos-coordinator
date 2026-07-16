import { useRef, useState } from "react";
import {
  useCompleteChore,
  useUncompleteChore,
  useUploadChorePhoto,
  type ChoreDto,
} from "@chaos-coordinator/core";
import { Avatar } from "../../components/Avatar";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const RECURRENCE_LABEL: Record<string, string> = {
  Daily: "Daily",
  Weekly: "Weekly",
  CustomDays: "Custom days",
};

interface ChoreDetailModalProps {
  chore: ChoreDto;
  onClose: () => void;
  onEdit: (chore: ChoreDto) => void;
}

export function ChoreDetailModal({ chore, onClose, onEdit }: ChoreDetailModalProps) {
  const completeChore = useCompleteChore();
  const uncompleteChore = useUncompleteChore();
  const uploadPhoto = useUploadChorePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);

  const needsPhoto = chore.photoRequired && !chore.completedToday;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await uploadPhoto.mutateAsync({ file, fileName: file.name });
    setPendingPhotoUrl(url);
  }

  async function handleMarkComplete() {
    await completeChore.mutateAsync({ id: chore.id, req: { date: todayIso(), photoUrl: pendingPhotoUrl } });
    onClose();
  }

  async function handleUncomplete() {
    await uncompleteChore.mutateAsync({ id: chore.id, date: todayIso() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[420px] flex-col gap-4 overflow-y-auto rounded-t-card-lg bg-app p-6 sm:rounded-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-lg font-extrabold text-ink">{chore.title}</div>
          <button onClick={() => onEdit(chore)} className="text-xs font-bold text-ink-muted">
            Edit
          </button>
        </div>

        <div className="flex gap-6">
          <div>
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Assigned</div>
            <div className="flex gap-1">
              {chore.assignees.map((a) => (
                <Avatar key={a.id} initials={a.initials} color={a.color} size={26} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Recurrence</div>
            <div className="text-sm font-bold text-ink">{RECURRENCE_LABEL[chore.recurrenceType] ?? chore.recurrenceType}</div>
          </div>
        </div>

        {chore.instructions && (
          <div className="rounded-card bg-card p-4 shadow-sm">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">How to do it</div>
            <div className="whitespace-pre-line text-[13px] leading-relaxed text-ink">{chore.instructions}</div>
          </div>
        )}

        {chore.completedToday ? (
          <div className="rounded-card bg-chip p-4 text-sm font-semibold text-ink-muted">
            Done{chore.completedByName ? ` by ${chore.completedByName}` : ""}
            {chore.photoUrl && <img src={chore.photoUrl} alt="" className="mt-2 h-32 w-full rounded-xl object-cover" />}
          </div>
        ) : (
          needsPhoto && (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-card bg-[#FEF3E2] p-4">
                <div>
                  <div className="text-sm font-bold text-ink">Photo evidence required</div>
                  <div className="mt-0.5 text-xs font-medium text-ink-muted">
                    Take a photo of the finished result to mark this complete.
                  </div>
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[150px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-ink-fainter"
              >
                {pendingPhotoUrl ? (
                  <img src={pendingPhotoUrl} alt="" className="h-full w-full rounded-card object-cover" />
                ) : (
                  <span className="text-xs font-bold text-ink-faint">Tap to take photo</span>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </div>
          )
        )}

        <button
          onClick={chore.completedToday ? handleUncomplete : handleMarkComplete}
          disabled={(needsPhoto && !pendingPhotoUrl) || completeChore.isPending || uncompleteChore.isPending}
          className="rounded-2xl bg-ink py-3.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {chore.completedToday ? "Mark Incomplete" : "Mark Complete"}
        </button>
      </div>
    </div>
  );
}
