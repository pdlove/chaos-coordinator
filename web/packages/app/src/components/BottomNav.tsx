import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useHousehold } from "@chaos-coordinator/core";

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2.5" y="3.5" width="15" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M2.5 7.5h15M6.5 2v3M13.5 2v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10l3.5 3.5L16 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ShoppingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 7h12l-1 9.5a1.5 1.5 0 0 1-1.5 1.3h-7a1.5 1.5 0 0 1-1.5-1.3L4 7z" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M7 7V5.5a3 3 0 0 1 6 0V7" stroke="currentColor" strokeWidth="1.7"/>
    </svg>
  );
}

function BillsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.3" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M10 6.3v4l2.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

function FoodIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="6" width="14" height="10.5" rx="2.2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="10" cy="11" r="3" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="7" y="3.5" width="6" height="2.6" rx="1" fill="currentColor"/>
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="4.5" cy="10" r="1.6" fill="currentColor"/>
      <circle cx="10" cy="10" r="1.6" fill="currentColor"/>
      <circle cx="15.5" cy="10" r="1.6" fill="currentColor"/>
    </svg>
  );
}

const TAB_META: Record<string, { to: string; label: string; icon: ReactNode }> = {
  calendar: { to: "/calendar", label: "Calendar", icon: <CalendarIcon /> },
  chores: { to: "/chores", label: "Tasks", icon: <TasksIcon /> },
  shopping: { to: "/shopping", label: "Shopping", icon: <ShoppingIcon /> },
  bills: { to: "/bills", label: "Bills", icon: <BillsIcon /> },
  food: { to: "/food", label: "Food", icon: <FoodIcon /> },
};

const DEFAULT_TABS = ["calendar", "chores", "shopping", "bills"];

/** The 5th slot ("more") is always fixed — see the household's `bottomBarTabs` for the configurable 4. */
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
            {meta.icon}
            {meta.label}
          </NavLink>
        );
      })}
      <NavLink
        to="/more"
        className={({ isActive }) => `flex flex-col items-center gap-1 text-[10px] font-bold ${isActive ? "text-ink" : "text-ink opacity-40"}`}
      >
        <MoreIcon />
        More
      </NavLink>
    </nav>
  );
}
