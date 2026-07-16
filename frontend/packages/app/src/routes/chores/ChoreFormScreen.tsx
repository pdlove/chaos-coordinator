import { useState } from "react";
import {
  useChoreGroups,
  useCreateChore,
  useDeleteChore,
  useHousehold,
  useUpdateChore,
  type ChoreDto,
} from "@chaos-coordinator/core";
import type { RecurrenceType } from "@chaos-coordinator/shared";
import { FormHeader } from "../../components/FormHeader";
import { FloatingInput, FloatingTextarea } from "../../components/FloatingLabelInput";
import { ChoreRepeatPickerScreen, choreRepeatSummary } from "./ChoreRepeatPickerScreen";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface ChoreFormScreenProps {
  chore: ChoreDto | null; // null = creating
  /** Group the new chore starts in — the caller (which already lists the groups) picks a valid one. */
  initialGroupId: string;
  onClose: () => void;
}

export function ChoreFormScreen({ chore, initialGroupId, onClose }: ChoreFormScreenProps) {
  const { data: household } = useHousehold();
  const { data: groups } = useChoreGroups(todayIso());
  const createChore = useCreateChore();
  const updateChore = useUpdateChore();
  const deleteChore = useDeleteChore();

  const [groupId, setGroupId] = useState(chore?.groupId ?? initialGroupId);
  const [title, setTitle] = useState(chore?.title ?? "");
  const [instructions, setInstructions] = useState(chore?.instructions ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(chore?.assignees.map((a) => a.id) ?? []);
  const [photoRequired, setPhotoRequired] = useState(chore?.photoRequired ?? false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(chore?.recurrenceType ?? "Daily");
  const [recurrenceDays, setRecurrenceDays] = useState<string | null>(chore?.recurrenceDays ?? null);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const busy = createChore.isPending || updateChore.isPending || deleteChore.isPending;

  function toggleAssignee(id: string) {
    setAssigneeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleSave() {
    setSaveError(null);
    const req = {
      title: title.trim(),
      instructions: instructions.trim() || null,
      recurrenceType,
      recurrenceDays,
      photoRequired,
      assigneeUserIds: assigneeIds,
    };
    try {
      if (chore) {
        await updateChore.mutateAsync({ id: chore.id, req });
      } else {
        await createChore.mutateAsync({ groupId, ...req });
      }
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  async function handleDelete() {
    if (!chore) return;
    try {
      await deleteChore.mutateAsync(chore.id);
      onClose();
    } catch {
      setSaveError("Couldn't delete — please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <FormHeader
        title={chore ? "Edit chore" : "New chore"}
        onCancel={onClose}
        onSave={handleSave}
        saveDisabled={busy || !title.trim() || !groupId}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Group</span>
          <div className="flex flex-wrap gap-2">
            {groups?.map((g) => (
              <button
                key={g.id}
                onClick={() => setGroupId(g.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  groupId === g.id ? "bg-ink text-white" : "bg-chip text-ink-muted"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <FloatingInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

        <FloatingTextarea
          label="Instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
        />

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Assignees</span>
          <div className="flex flex-wrap gap-2">
            {household?.users.map((u) => (
              <button
                key={u.id}
                onClick={() => toggleAssignee(u.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  assigneeIds.includes(u.id) ? "bg-ink text-white" : "bg-chip text-ink-muted"
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowRepeatPicker(true)}
          className="flex items-center justify-between rounded-xl bg-card px-3.5 py-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Repeat</span>
          <span className="text-sm font-semibold text-ink">{choreRepeatSummary(recurrenceType, recurrenceDays)}</span>
        </button>

        <button
          onClick={() => setPhotoRequired((v) => !v)}
          className="flex items-center justify-between rounded-xl bg-card px-3.5 py-3 text-left"
        >
          <span className="text-sm font-bold text-ink">Photo required</span>
          <span
            className={`flex h-6 w-10 items-center rounded-full px-0.5 transition-colors ${
              photoRequired ? "justify-end bg-ink" : "justify-start bg-chip"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
          </span>
        </button>

        {saveError && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{saveError}</div>
        )}

        {chore && (
          <button
            onClick={handleDelete}
            disabled={busy}
            className="rounded-2xl border border-cat-doctor py-3 text-sm font-bold text-cat-doctor disabled:opacity-50"
          >
            Delete chore
          </button>
        )}
      </div>

      {showRepeatPicker && (
        <ChoreRepeatPickerScreen
          initialRecurrenceType={recurrenceType}
          initialRecurrenceDays={recurrenceDays}
          onCancel={() => setShowRepeatPicker(false)}
          onSave={(type, days) => {
            setRecurrenceType(type);
            setRecurrenceDays(days);
            setShowRepeatPicker(false);
          }}
        />
      )}
    </div>
  );
}
