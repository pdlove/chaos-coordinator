import { useState } from "react";
import {
  useClaimHouseholdTask,
  useCreateHouseholdTask,
  useHouseholdTasks,
  useSessionStore,
  useUnclaimHouseholdTask,
} from "@chaos-coordinator/core";
import { AvatarStack } from "../../components/AvatarStack";

export function HouseholdTasksList() {
  const { data: tasks, isLoading } = useHouseholdTasks();
  const claim = useClaimHouseholdTask();
  const unclaim = useUnclaimHouseholdTask();
  const createTask = useCreateHouseholdTask();
  const currentUserId = useSessionStore((s) => s.currentUserId);
  const [newTitle, setNewTitle] = useState("");

  // Pasting several lines at once (e.g. from a Notes app) adds one task per non-blank line
  // instead of dumping the whole block into a single task title. A single-line paste falls
  // through to the input's normal behavior. Sequential awaits, not Promise.all — the backend
  // assigns Order from the current task count, so concurrent creates could race onto the same
  // order value.
  async function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const lines = e.clipboardData.getData("text").split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return;
    e.preventDefault();
    for (const line of lines) {
      await createTask.mutateAsync({ title: line, note: null });
    }
    setNewTitle("");
  }

  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5">
      <div className="mb-1 text-xs font-medium text-ink-muted">Anyone can claim — parents, kids or Tina.</div>

      {isLoading && <div className="text-sm font-medium text-ink-muted">Loading…</div>}
      {tasks?.map((task) => {
        const iClaimed = task.claimedBy.some((u) => u.id === currentUserId);
        return (
          <div key={task.id} className="flex items-center gap-2.5 rounded-card bg-card p-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink">{task.title}</div>
              <div className="mt-0.5 text-[11px] font-medium text-ink-faint">
                {task.note ? `${task.note} · ` : ""}
                {task.status === "Unclaimed"
                  ? "unclaimed"
                  : task.claimedBy.length > 1
                    ? "claimed together"
                    : task.status === "Done"
                      ? "done"
                      : "in progress"}
              </div>
            </div>
            {task.status === "Unclaimed" ? (
              <button
                onClick={() => claim.mutate(task.id)}
                className="whitespace-nowrap rounded-full border-[1.5px] border-ink px-3.5 py-1.5 text-[11.5px] font-bold text-ink"
              >
                Claim
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <AvatarStack people={task.claimedBy.map((u) => ({ initials: u.initials, color: u.color }))} />
                {iClaimed && (
                  <button onClick={() => unclaim.mutate(task.id)} className="text-[11px] font-bold text-ink-muted">
                    Unclaim
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-2 flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onPaste={handlePaste}
          placeholder="New household task (paste a list to add several)"
          className="flex-1 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
        />
        <button
          onClick={() => {
            if (!newTitle.trim()) return;
            createTask.mutate({ title: newTitle.trim(), note: null });
            setNewTitle("");
          }}
          className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"
        >
          Add
        </button>
      </div>
    </div>
  );
}
