import { useState } from "react";
import {
  formatDoneByTime,
  isGroupOverdue,
  useChoreGroups,
  useCompleteChore,
  useSessionStore,
  useUncompleteChore,
  type ChoreDto,
} from "@chaos-coordinator/core";
import { AvatarStack } from "../../components/AvatarStack";
import { PinPrompt } from "../../components/PinPrompt";
import { ChoreDetailModal } from "./ChoreDetailModal";
import { ChoreFormScreen } from "./ChoreFormScreen";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ChoresList() {
  const date = todayIso();
  const { data: groups, isLoading } = useChoreGroups(date);
  const completeChore = useCompleteChore();
  const uncompleteChore = useUncompleteChore();
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const [detailChore, setDetailChore] = useState<ChoreDto | null>(null);
  const [editingChore, setEditingChore] = useState<ChoreDto | null | undefined>(undefined); // undefined = closed, null = new
  const [pinRequest, setPinRequest] = useState<"add" | ChoreDto | null>(null);

  function toggle(chore: ChoreDto) {
    if (chore.completedToday) {
      uncompleteChore.mutate({ id: chore.id, date });
    } else if (chore.photoRequired) {
      setDetailChore(chore);
    } else {
      completeChore.mutate({ id: chore.id, req: { date, photoUrl: null } });
    }
  }

  function requestAdd() {
    if (pinElevated) setEditingChore(null);
    else setPinRequest("add");
  }

  function requestEdit(chore: ChoreDto) {
    setDetailChore(null);
    if (pinElevated) setEditingChore(chore);
    else setPinRequest(chore);
  }

  const visibleGroups = (groups ?? []).filter((g) => g.chores.length > 0);
  const firstGroupId = groups?.[0]?.id;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-5 pb-5">
      {isLoading && <div className="text-sm font-medium text-ink-muted">Loading…</div>}
      {visibleGroups.map((group) => {
        const hasIncomplete = group.chores.some((c) => !c.completedToday);
        const overdue = isGroupOverdue(group.doneByTime, hasIncomplete);

        return (
          <div key={group.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{group.name}</span>
              <span className={`text-[10.5px] font-semibold ${overdue ? "text-cat-doctor" : "text-ink-faint"}`}>
                {overdue ? "Overdue · " : ""}Done by {formatDoneByTime(group.doneByTime)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {group.chores.map((chore) => (
                <div
                  key={chore.id}
                  className={`flex items-center gap-2.5 rounded-card bg-card p-3 shadow-sm ${
                    chore.completedToday ? "opacity-55" : overdue ? "border-[1.5px] border-[#F6C9C0]" : ""
                  }`}
                >
                  <button
                    onClick={() => toggle(chore)}
                    className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] ${
                      chore.completedToday ? "bg-cat-home text-white" : "border-2 border-ink-fainter"
                    }`}
                  >
                    {chore.completedToday && "✓"}
                  </button>
                  <button onClick={() => setDetailChore(chore)} className="min-w-0 flex-1 text-left">
                    <div
                      className={`truncate text-[13.5px] font-bold text-ink ${chore.completedToday ? "line-through" : ""}`}
                    >
                      {chore.title}
                    </div>
                    <div className="mt-0.5 text-[10.5px] font-semibold text-ink-faint">
                      {chore.completedToday
                        ? `Done${chore.completedAt ? " " + new Date(chore.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}`
                        : chore.photoRequired
                          ? "Photo required"
                          : chore.recurrenceType === "Daily"
                            ? "Daily"
                            : "Weekly"}
                    </div>
                  </button>
                  <AvatarStack people={chore.assignees.map((a) => ({ initials: a.initials, color: a.color }))} size={20} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!isLoading && visibleGroups.length === 0 && (
        <div className="mt-8 text-center text-sm font-medium text-ink-fainter">No chores today</div>
      )}
      </div>

      {firstGroupId && (
        <button
          onClick={requestAdd}
          className="absolute bottom-5 right-4 flex items-center justify-center rounded-full bg-ink text-2xl text-white shadow-lg"
          style={{ width: 52, height: 52 }}
          aria-label="New chore"
        >
          +
        </button>
      )}

      {detailChore && (
        <ChoreDetailModal chore={detailChore} onClose={() => setDetailChore(null)} onEdit={requestEdit} />
      )}

      {pinRequest && (
        <PinPrompt
          onCancel={() => setPinRequest(null)}
          onSuccess={() => {
            setEditingChore(pinRequest === "add" ? null : pinRequest);
            setPinRequest(null);
          }}
        />
      )}

      {editingChore !== undefined && firstGroupId && (
        <ChoreFormScreen
          chore={editingChore}
          initialGroupId={editingChore?.groupId ?? firstGroupId}
          onClose={() => setEditingChore(undefined)}
        />
      )}
    </div>
  );
}
