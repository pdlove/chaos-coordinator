import { addDays, useEvents } from "@chaos-coordinator/core";
import { AvatarStack } from "../components/AvatarStack";

export function WallTimeline() {
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000);
  const to = addDays(from, 1);
  const { data: events } = useEvents(from, to);

  const sorted = [...(events ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  const nowMs = now.getTime();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
        Today · {from.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – {from.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} tomorrow
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {sorted.map((e, i) => {
          const start = new Date(e.start).getTime();
          const end = e.end ? new Date(e.end).getTime() : start;
          const isPast = end < nowMs;
          const isNow = start <= nowMs && nowMs <= end;
          const nextStart = sorted[i + 1] ? new Date(sorted[i + 1].start).getTime() : null;
          const gapAfter = nextStart && nextStart - end > 30 * 60 * 1000;

          return (
            <div key={e.id}>
              <div className={`flex gap-3.5 ${isPast ? "opacity-55" : ""}`}>
                <div className={`w-[58px] flex-none pt-3.5 text-xs font-bold ${isNow ? "text-cat-activities" : "text-ink-faint"}`}>
                  {isNow ? "NOW" : new Date(e.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
                <div
                  className="flex flex-1 items-center justify-between rounded-2xl p-3.5"
                  style={isNow ? { background: "#FFEDE9", borderLeft: "4px solid #FF6B57" } : { background: "#fff", borderLeft: `4px solid ${e.category.color}`, boxShadow: "0 1px 2px rgba(33,29,24,.05)" }}
                >
                  <div>
                    <div className="text-[15px] font-bold text-ink">{e.title}</div>
                    <div className="text-xs font-medium text-ink-muted">
                      {new Date(e.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {e.end && ` – ${new Date(e.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                    </div>
                  </div>
                  <AvatarStack people={e.attendees.map((a) => ({ initials: a.initials, color: a.color }))} size={30} />
                </div>
              </div>
              {gapAfter && (
                <div className="flex gap-3.5">
                  <div className="w-[58px] flex-none" />
                  <div className="flex-1 rounded-2xl bg-chip p-2.5 text-sm font-bold text-ink-muted">Free time</div>
                </div>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && <div className="text-sm font-medium text-ink-fainter">Nothing scheduled</div>}
      </div>
    </div>
  );
}
