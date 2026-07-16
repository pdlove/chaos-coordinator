import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHousehold, useLogout, useSessionStore } from "@chaos-coordinator/core";
import { Avatar } from "../../components/Avatar";
import { PinPrompt } from "../../components/PinPrompt";

const HOUSEHOLD_ROWS = [
  { to: "/more/people", label: "People & roles" },
  // Pure inline-edit list (like Chore Groups) — gate on elevation before entering, rather than
  // per-action inside the screen.
  { to: "/more/calendar-settings", label: "Calendar categories & locations", requiresPin: true },
  { to: "/more/wall-pairing", label: "Wall display pairing" },
  { to: "/more/notifications", label: "Notifications" },
  { to: "/more/settings", label: "Settings" },
];

export function MorePage() {
  const navigate = useNavigate();
  const { data: household } = useHousehold();
  const currentUserId = useSessionStore((s) => s.currentUserId);
  const currentUser = household?.users.find((u) => u.id === currentUserId);
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const logout = useLogout();
  const [pinTargetPath, setPinTargetPath] = useState<string | null>(null);

  function handleLogout() {
    logout.mutate();
  }

  function handleRowClick(row: (typeof HOUSEHOLD_ROWS)[number]) {
    if (row.requiresPin && !pinElevated) setPinTargetPath(row.to);
    else navigate(row.to);
  }

  return (
    <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-5 pb-5 pt-1.5">
      <div className="text-2xl font-extrabold text-ink">More</div>

      {currentUser && (
        <div className="flex items-center justify-between rounded-card bg-card p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar initials={currentUser.initials} color={currentUser.color} size={40} />
            <div>
              <div className="text-[13.5px] font-bold text-ink">{currentUser.name}</div>
              <div className="text-[11px] font-semibold text-ink-muted">{currentUser.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="rounded-xl bg-chip px-3.5 py-2 text-xs font-bold text-ink-muted disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      )}

      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Customize bottom bar</div>
        <button onClick={() => navigate("/more/bottom-bar")} className="flex w-full items-center gap-2.5 rounded-card bg-card p-3.5 shadow-sm">
          <span className="flex-1 text-left text-[13.5px] font-bold text-ink">Choose your 4 tabs</span>
          <span className="text-ink-faint">›</span>
        </button>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Household</div>
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card shadow-sm">
          {HOUSEHOLD_ROWS.map((row) => (
            <button key={row.to} onClick={() => handleRowClick(row)} className="flex items-center gap-2.5 p-3.5">
              <span className="flex-1 text-left text-[13.5px] font-bold text-ink">{row.label}</span>
              <span className="text-ink-faint">›</span>
            </button>
          ))}
        </div>
      </div>

      {pinTargetPath && (
        <PinPrompt
          onCancel={() => setPinTargetPath(null)}
          onSuccess={() => {
            const path = pinTargetPath;
            setPinTargetPath(null);
            navigate(path);
          }}
        />
      )}
    </div>
  );
}
