import { NavLink } from "react-router-dom";
import { useHousehold } from "@chaos-coordinator/core";

const TAB_META: Record<string, { to: string; label: string }> = {
  calendar: { to: "/calendar", label: "Calendar" },
  chores: { to: "/chores", label: "Tasks" },
  shopping: { to: "/shopping", label: "Shopping" },
  bills: { to: "/bills", label: "Bills" },
  food: { to: "/food", label: "Food" },
};

const DEFAULT_TABS = ["calendar", "chores", "shopping", "bills"];

/** Icons match the design's inline SVGs would be added in a visual polish pass; the 5th slot
 * ("more") is always fixed — see the household's `bottomBarTabs` for the configurable 4. */
export function BottomNav() {
  const { data: household } = useHousehold();
  const tabs = household?.bottomBarTabs ?? DEFAULT_TABS;

  return (
    <nav className="flex h-[78px] flex-none items-center justify-around border-t border-border bg-card pb-3.5">
      {tabs.map((key) => {
        const meta = TAB_META[key];
        if (!meta) return null;
        return (
          <NavLink
            key={key}
            to={meta.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] font-bold ${isActive ? "text-ink" : "text-ink opacity-40"}`
            }
          >
            {meta.label}
          </NavLink>
        );
      })}
      <NavLink
        to="/more"
        className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-bold ${isActive ? "text-ink" : "text-ink opacity-40"}`}
      >
        More
      </NavLink>
    </nav>
  );
}
