import { useNavigate } from "react-router-dom";
import { useHousehold, useUpdateBottomBarTabs } from "@chaos-coordinator/core";

const ALL_TABS = [
  { key: "calendar", label: "Calendar" },
  { key: "chores", label: "Chores & Tasks" },
  { key: "shopping", label: "Shopping" },
  { key: "bills", label: "Bills" },
  { key: "food", label: "Food" },
];

const MAX_TABS = 4;

export function BottomBarSettings() {
  const navigate = useNavigate();
  const { data: household } = useHousehold();
  const updateTabs = useUpdateBottomBarTabs();
  const selected = household?.bottomBarTabs ?? [];

  function toggle(key: string) {
    if (selected.includes(key)) {
      if (selected.length <= 1) return; // at least one tab required
      updateTabs.mutate(selected.filter((k) => k !== key));
    } else if (selected.length < MAX_TABS) {
      updateTabs.mutate([...selected, key]);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-2.5 px-5 pb-1 pt-1.5">
        <button onClick={() => navigate("/more")} className="text-lg">
          ←
        </button>
        <span className="text-xl font-extrabold text-ink">Customize bottom bar</span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5 pt-2.5">
        <div className="mb-1 text-xs font-medium text-ink-muted">
          Pick up to {MAX_TABS} tabs to show up front — the rest stay reachable from More. ({selected.length}/{MAX_TABS} used)
        </div>
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card shadow-sm">
          {ALL_TABS.map((tab) => {
            const on = selected.includes(tab.key);
            return (
              <button key={tab.key} onClick={() => toggle(tab.key)} className="flex items-center gap-2.5 p-3.5">
                <span className="flex-1 text-left text-[13.5px] font-bold text-ink">{tab.label}</span>
                <div className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-ink" : "bg-chip"}`}>
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
