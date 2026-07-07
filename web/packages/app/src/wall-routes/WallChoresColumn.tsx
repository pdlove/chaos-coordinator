import { useNavigate } from "react-router-dom";
import { useChoreGroups, useHousehold } from "@chaos-coordinator/core";
import { Avatar } from "../components/Avatar";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function WallChoresColumn() {
  const { data: household } = useHousehold();
  const { data: groups } = useChoreGroups(todayIso());
  const navigate = useNavigate();

  const people = household?.users ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Chores · tap a person for their full list</div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
        {people.map((person) => {
          const counts = (groups ?? []).map((g) => ({
            name: g.name,
            left: g.chores.filter((c) => c.assignees.some((a) => a.id === person.id) && !c.completedToday).length,
          })).filter((_, idx) => (groups ?? [])[idx].chores.some((c) => c.assignees.some((a) => a.id === person.id)));

          if (counts.length === 0) return null;

          return (
            <button
              key={person.id}
              onClick={() => navigate(`/wall/chores/${person.id}`)}
              className="rounded-2xl bg-card p-3.5 text-left shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <Avatar initials={person.initials} color={person.color} size={28} />
                <span className="flex-1 text-[14.5px] font-bold text-ink">{person.name}</span>
                <span className="text-ink-fainter">›</span>
              </div>
              <div className="flex gap-2">
                {counts.map((c) => (
                  <div key={c.name} className={`flex-1 rounded-xl p-1.5 text-center ${c.left > 0 ? "bg-[#FDEBEF]" : "bg-chip"}`}>
                    <div className={`text-[10px] font-bold ${c.left > 0 ? "text-cat-doctor" : "text-ink-muted"}`}>{c.name}</div>
                    <div className="text-[15px] font-extrabold text-ink">{c.left} left</div>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
