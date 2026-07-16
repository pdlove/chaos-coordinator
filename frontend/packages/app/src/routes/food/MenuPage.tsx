import { useState } from "react";
import { addDays, isSameDay, startOfWeek, useMenu, type MealType, type MenuEntryDto } from "@chaos-coordinator/core";
import { AvatarStack } from "../../components/AvatarStack";
import { MealEntryModal } from "./MealEntryModal";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MEALS: MealType[] = ["Breakfast", "Lunch", "Dinner"];

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function MenuPage() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const weekStart = startOfWeek(selectedDay);
  const weekEnd = addDays(weekStart, 6);
  const { data: entries } = useMenu(toIso(weekStart), toIso(weekEnd));
  const [editing, setEditing] = useState<MealType | null>(null);

  const dayEntries = (entries ?? []).filter((e) => e.date === toIso(selectedDay));
  const entryFor = (meal: MealType): MenuEntryDto | undefined => dayEntries.find((e) => e.mealType === meal);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none justify-between px-5 pb-3">
        {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
          const isSelected = isSameDay(day, selectedDay);
          return (
            <button key={day.toISOString()} onClick={() => setSelectedDay(day)} className="flex flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  isSelected ? "bg-ink text-white" : "text-ink-faint"
                }`}
              >
                {DAY_LETTERS[day.getDay()]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
        {MEALS.map((meal) => {
          const entry = entryFor(meal);
          return (
            <button key={meal} onClick={() => setEditing(meal)} className="rounded-card-lg bg-card p-3.5 text-left shadow-sm">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{meal}</div>
              {entry ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">{entry.dish}</span>
                    <AvatarStack people={entry.eaters.map((e) => ({ initials: e.initials, color: e.color }))} size={20} />
                  </div>
                  {entry.recipeTitle && (
                    <div className="mt-1 text-[11px] font-medium text-ink-faint">recipe: {entry.recipeTitle}</div>
                  )}
                  {entry.substitutions.map((s) => (
                    <div key={s.id} className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5">
                      <span className="text-[13px] font-bold text-ink">
                        {s.dish}{" "}
                        <span className="rounded-full bg-[#FEF3E2] px-2 py-0.5 text-[10px] font-bold text-[#C97F16]">{s.dietaryLabel}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-ink-faint">{s.forUserName}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-sm font-medium text-ink-fainter">Tap to plan</div>
              )}
            </button>
          );
        })}
      </div>

      {editing && (
        <MealEntryModal date={toIso(selectedDay)} mealType={editing} entry={entryFor(editing)} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
