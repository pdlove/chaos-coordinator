import { useNavigate } from "react-router-dom";

const HOUSEHOLD_ROWS = [
  { to: "/more/people", label: "People & roles" },
  { to: "/more/wall-pairing", label: "Wall display pairing" },
  { to: "/more/notifications", label: "Notifications" },
  { to: "/more/settings", label: "Settings" },
];

export function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-5 pb-5 pt-1.5">
      <div className="text-2xl font-extrabold text-ink">More</div>

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
            <button key={row.to} onClick={() => navigate(row.to)} className="flex items-center gap-2.5 p-3.5">
              <span className="flex-1 text-left text-[13.5px] font-bold text-ink">{row.label}</span>
              <span className="text-ink-faint">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
