import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAddProjectTask, useHousehold, useProject, useUpdateProjectTask } from "@chaos-coordinator/core";
import { Avatar } from "../../components/Avatar";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(id);
  const { data: household } = useHousehold();
  const addTask = useAddProjectTask();
  const updateTask = useUpdateProjectTask();
  const [newTitle, setNewTitle] = useState("");

  // Pasting several lines at once adds one task per non-blank line instead of dumping the whole
  // block into a single task title — see the identical helper in HouseholdTasksList.tsx.
  // Sequential awaits, not Promise.all — the backend assigns Order from the current task count,
  // so concurrent creates could race onto the same order value.
  async function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const lines = e.clipboardData.getData("text").split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1 || !id) return;
    e.preventDefault();
    for (const line of lines) {
      await addTask.mutateAsync({ projectId: id, req: { title: line, assigneeId: null } });
    }
    setNewTitle("");
  }

  if (!project) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-2.5 px-5 pb-3.5 pt-1.5">
        <button onClick={() => navigate("/chores/projects")} className="text-lg">
          ←
        </button>
        <span className="text-xl font-extrabold text-ink">{project.name}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-5">
        {project.tasks.map((task) => {
          const assignee = household?.users.find((u) => u.id === task.assigneeId);
          return (
            <div key={task.id} className="flex items-center gap-2.5 rounded-card bg-card p-3 shadow-sm">
              <button
                onClick={() => updateTask.mutate({ id: task.id, req: { title: task.title, done: !task.done, assigneeId: task.assigneeId, order: task.order } })}
                className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] ${
                  task.done ? "bg-cat-home text-white" : "border-2 border-ink-fainter"
                }`}
              >
                {task.done && "✓"}
              </button>
              <div className={`flex-1 text-[13.5px] font-bold text-ink ${task.done ? "line-through opacity-60" : ""}`}>
                {task.title}
              </div>
              {assignee && <Avatar initials={assignee.initials} color={assignee.color} size={20} />}
            </div>
          );
        })}

        <div className="mt-2 flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onPaste={handlePaste}
            placeholder="Add task to this list (paste a list to add several)"
            className="flex-1 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
          />
          <button
            onClick={() => {
              if (!newTitle.trim() || !id) return;
              addTask.mutate({ projectId: id, req: { title: newTitle.trim(), assigneeId: null } });
              setNewTitle("");
            }}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
