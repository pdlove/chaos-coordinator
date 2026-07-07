import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDoneByTime, useChoreGroups, useCompleteChore, useHousehold, type ChoreDto } from "@chaos-coordinator/core";
import { Avatar } from "../components/Avatar";
import { WallChorePhotoCapture } from "./WallChorePhotoCapture";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function WallChoresFull() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { data: household } = useHousehold();
  const { data: groups } = useChoreGroups(todayIso());
  const completeChore = useCompleteChore();
  const [capturingChore, setCapturingChore] = useState<ChoreDto | null>(null);

  const person = household?.users.find((u) => u.id === userId);

  function handleTapChore(chore: ChoreDto) {
    if (chore.completedToday) return;
    if (chore.photoRequired) {
      setCapturingChore(chore);
    } else {
      completeChore.mutate({ id: chore.id, req: { date: todayIso(), photoUrl: null } });
    }
  }

  if (person) {
    return (
      <div className="flex h-screen w-screen flex-col bg-app">
        <div className="flex flex-none items-center gap-3.5 px-9 pb-5 pt-6">
          <button onClick={() => navigate("/wall/chores")} className="text-xl text-ink">
            ←
          </button>
          <Avatar initials={person.initials} color={person.color} size={44} />
          <span className="text-[26px] font-extrabold text-ink">{person.name}'s chores</span>
        </div>
        <div className="flex flex-1 gap-5.5 overflow-hidden px-9 pb-8">
          {(groups ?? []).map((g) => {
            const myChores = g.chores.filter((c) => c.assignees.some((a) => a.id === person.id));
            if (myChores.length === 0) return null;
            return (
              <div key={g.id} className="flex flex-1 flex-col">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{g.name}</span>
                  <span className="text-[11px] font-semibold text-ink-faint">Done by {formatDoneByTime(g.doneByTime)}</span>
                </div>
                {myChores.map((c) => (
                  <button key={c.id} onClick={() => handleTapChore(c)} className={`mb-2 rounded-2xl bg-card p-3.5 text-left shadow-sm ${c.completedToday ? "opacity-55" : ""}`}>
                    <div className={`text-[14.5px] font-bold text-ink ${c.completedToday ? "line-through" : ""}`}>{c.title}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-ink-faint">
                      {c.completedToday ? "Done" : c.photoRequired ? "Needs a photo" : "Not done yet"}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        {capturingChore && (
          <WallChorePhotoCapture chore={capturingChore} onDone={() => setCapturingChore(null)} onCancel={() => setCapturingChore(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-app">
      <div className="flex flex-none items-center justify-between px-9 pb-5 pt-6">
        <div className="flex items-center gap-3.5">
          <button onClick={() => navigate("/wall")} className="text-xl text-ink">
            ←
          </button>
          <span className="text-[28px] font-extrabold text-ink">Chores</span>
        </div>
        <span className="rounded-full bg-card px-4 py-2.5 text-xs font-bold text-ink-muted shadow-sm">
          {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>
      <div className="flex flex-1 gap-6 overflow-hidden px-9 pb-8">
        {household?.users.map((person) => {
          const counts = (groups ?? [])
            .map((g) => ({ name: g.name, left: g.chores.filter((c) => c.assignees.some((a) => a.id === person.id) && !c.completedToday).length }))
            .filter((_, idx) => (groups ?? [])[idx].chores.some((c) => c.assignees.some((a) => a.id === person.id)));
          if (counts.length === 0) return null;

          return (
            <button
              key={person.id}
              onClick={() => navigate(`/wall/chores/${person.id}`)}
              className="flex flex-1 flex-col gap-4 rounded-3xl bg-card p-5.5 text-left shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <Avatar initials={person.initials} color={person.color} size={52} />
                <span className="flex-1 text-[22px] font-extrabold text-ink">{person.name}</span>
                <span className="text-ink-faint">›</span>
              </div>
              <div className="flex gap-3">
                {counts.map((c) => (
                  <div key={c.name} className={`flex-1 rounded-2xl p-3.5 text-center ${c.left > 0 ? "bg-[#FDEBEF]" : "bg-chip"}`}>
                    <div className={`text-xs font-bold ${c.left > 0 ? "text-cat-doctor" : "text-ink-muted"}`}>{c.name}</div>
                    <div className="mt-1 text-[26px] font-extrabold text-ink">{c.left} left</div>
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
