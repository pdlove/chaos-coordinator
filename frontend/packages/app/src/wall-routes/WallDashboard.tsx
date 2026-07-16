import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@chaos-coordinator/core";
import { WallTimeline } from "./WallTimeline";
import { WallChoresColumn } from "./WallChoresColumn";
import { WallMenuColumn } from "./WallMenuColumn";
import { WallPinUnlock } from "./WallPinUnlock";

export function WallDashboard() {
  const [now, setNow] = useState(new Date());
  const [showUnlock, setShowUnlock] = useState(false);
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-app">
      <div className="flex flex-none items-center justify-between px-9 pb-4.5 pt-6">
        <div>
          <div className="text-[30px] font-extrabold text-ink">
            {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-ink-muted">{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/wall/calendar")} className="rounded-full bg-card px-4 py-2.5 text-xs font-bold text-ink-muted shadow-sm">
            Full calendar
          </button>
          <button
            onClick={() => !pinElevated && setShowUnlock(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold shadow-sm ${pinElevated ? "bg-ink text-white" : "bg-card text-ink-muted"}`}
          >
            {pinElevated ? "Edit mode on" : "Edit (PIN)"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6.5 overflow-hidden px-9 pb-7">
        <div className="flex flex-[1.5] flex-col overflow-hidden">
          <WallTimeline />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <WallChoresColumn />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <WallMenuColumn />
        </div>
      </div>

      {showUnlock && <WallPinUnlock onCancel={() => setShowUnlock(false)} onSuccess={() => setShowUnlock(false)} />}
    </div>
  );
}
