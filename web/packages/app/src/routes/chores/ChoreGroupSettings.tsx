import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChoreGroups, useCreateChoreGroup, useUpdateChoreGroup } from "@chaos-coordinator/core";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Parent-only settings — route entry is PIN-gated by ChoresLayout before navigating here. */
export function ChoreGroupSettings() {
  const navigate = useNavigate();
  const { data: groups } = useChoreGroups(todayIso());
  const createGroup = useCreateChoreGroup();
  const updateGroup = useUpdateChoreGroup();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [doneBy, setDoneBy] = useState("18:00");

  const atMax = (groups?.length ?? 0) >= 4;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-2.5 px-5 pb-1 pt-1.5">
        <button onClick={() => navigate("/chores/list")} className="text-lg">
          ←
        </button>
        <span className="text-xl font-extrabold text-ink">Chore Groups</span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5 pt-2.5">
        <div className="mb-1 text-xs font-medium text-ink-muted">
          Group daily &amp; weekly chores into up to 4 named blocks with a done-by time.
        </div>

        {groups?.map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-card bg-card p-3.5 shadow-sm">
            <input
              defaultValue={g.name}
              onBlur={(e) => e.target.value !== g.name && updateGroup.mutate({ id: g.id, req: { name: e.target.value, doneByTime: g.doneByTime, order: g.order } })}
              className="flex-1 bg-transparent text-sm font-bold text-ink outline-none"
            />
            <input
              type="time"
              defaultValue={g.doneByTime}
              onBlur={(e) => e.target.value !== g.doneByTime && updateGroup.mutate({ id: g.id, req: { name: g.name, doneByTime: e.target.value, order: g.order } })}
              className="rounded-lg bg-chip px-3 py-1.5 text-sm font-bold text-ink-muted"
            />
          </div>
        ))}

        {showNew ? (
          <div className="flex items-center gap-2 rounded-card bg-card p-3.5 shadow-sm">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="flex-1 bg-transparent text-sm font-bold text-ink outline-none"
            />
            <input type="time" value={doneBy} onChange={(e) => setDoneBy(e.target.value)} className="rounded-lg bg-chip px-3 py-1.5 text-sm font-bold text-ink-muted" />
            <button
              onClick={() => {
                if (!name.trim()) return;
                createGroup.mutate({ name: name.trim(), doneByTime: doneBy, order: groups?.length ?? 0 });
                setName("");
                setShowNew(false);
              }}
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white"
            >
              Add
            </button>
          </div>
        ) : (
          !atMax && (
            <button
              onClick={() => setShowNew(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
            >
              + Add group ({groups?.length ?? 0} of 4 used)
            </button>
          )
        )}
      </div>
    </div>
  );
}
