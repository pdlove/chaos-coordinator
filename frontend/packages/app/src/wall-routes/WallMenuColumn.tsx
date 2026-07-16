import { useMenu, type MealType } from "@chaos-coordinator/core";

const MEALS: MealType[] = ["Breakfast", "Lunch", "Dinner"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function WallMenuColumn() {
  const today = todayIso();
  const { data: entries } = useMenu(today, today);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Today's menu</div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
        {MEALS.map((meal) => {
          const entry = entries?.find((e) => e.mealType === meal);
          return (
            <div key={meal} className="rounded-2xl bg-card p-3.5 shadow-sm">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{meal}</div>
              <div className="mt-0.5 text-[14.5px] font-bold text-ink">{entry?.dish ?? "—"}</div>
              {entry?.substitutions.map((s) => (
                <div key={s.id} className="mt-0.5 text-[11.5px] font-semibold text-[#C97F16]">
                  {s.forUserName}: {s.dish}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
