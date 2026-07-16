import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateProject, useProjects } from "@chaos-coordinator/core";
import { AvatarStack } from "../../components/AvatarStack";

export function ProjectsList() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5">
      {isLoading && <div className="text-sm font-medium text-ink-muted">Loading…</div>}
      {projects?.map((p) => {
        const pct = p.totalCount === 0 ? 0 : Math.round((p.doneCount / p.totalCount) * 100);
        const complete = p.totalCount > 0 && p.doneCount === p.totalCount;
        return (
          <button
            key={p.id}
            onClick={() => navigate(`/chores/projects/${p.id}`)}
            className="rounded-card-lg bg-card p-4 text-left shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="text-[15px] font-bold text-ink">{p.name}</div>
              <span className="text-[11px] font-bold text-ink-faint">
                {p.doneCount} / {p.totalCount}
              </span>
            </div>
            <div className="my-2.5 h-1.5 overflow-hidden rounded-full bg-chip">
              <div className="h-full bg-cat-work" style={{ width: `${pct}%` }} />
            </div>
            {complete ? (
              <div className="text-[11px] font-semibold text-cat-home">Complete</div>
            ) : (
              <AvatarStack people={p.contributors.map((u) => ({ initials: u.initials, color: u.color }))} size={20} />
            )}
          </button>
        );
      })}

      {showNew ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="flex-1 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
          />
          <button
            onClick={() => {
              if (!name.trim()) return;
              createProject.mutate({ name: name.trim() });
              setName("");
              setShowNew(false);
            }}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-card-lg border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
        >
          + New project list
        </button>
      )}
    </div>
  );
}
