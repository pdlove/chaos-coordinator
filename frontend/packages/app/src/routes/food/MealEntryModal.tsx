import { useState } from "react";
import {
  useAddSubstitution,
  useDeleteSubstitution,
  useHousehold,
  useRecipes,
  useUpsertMenuEntry,
  type MealType,
  type MenuEntryDto,
} from "@chaos-coordinator/core";

interface MealEntryModalProps {
  date: string;
  mealType: MealType;
  entry: MenuEntryDto | undefined;
  onClose: () => void;
}

export function MealEntryModal({ date, mealType, entry, onClose }: MealEntryModalProps) {
  const { data: household } = useHousehold();
  const { data: recipes } = useRecipes();
  const upsert = useUpsertMenuEntry();
  const addSub = useAddSubstitution();
  const deleteSub = useDeleteSubstitution();

  const [dish, setDish] = useState(entry?.dish ?? "");
  const [recipeId, setRecipeId] = useState<string | null>(entry?.recipeId ?? null);
  const [eaterIds, setEaterIds] = useState<string[]>(entry?.eaters.map((e) => e.userId) ?? household?.users.map((u) => u.id) ?? []);
  const [subDraftFor, setSubDraftFor] = useState<string | null>(null);
  const [subDish, setSubDish] = useState("");

  function toggleEater(id: string) {
    setEaterIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleSave() {
    await upsert.mutateAsync({ date, mealType, dish, recipeId, eaterUserIds: eaterIds });
    onClose();
  }

  // Eaters who have a dietary tag but no substitution recorded yet for this meal — the "auto-suggest" hint.
  const unaddressed = (entry?.eaters ?? []).filter(
    (e) => e.dietaryTags.length > 0 && !entry?.substitutions.some((s) => s.forUserId === e.userId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[420px] flex-col gap-4 overflow-y-auto rounded-t-card-lg bg-app p-6 sm:rounded-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-extrabold text-ink">{mealType}</div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Dish</span>
          <input value={dish} onChange={(e) => setDish(e.target.value)} className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink" />
        </label>

        {recipes && recipes.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Recipe (optional)</span>
            <select value={recipeId ?? ""} onChange={(e) => setRecipeId(e.target.value || null)} className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink">
              <option value="">None</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.prepMinutes}m prep · {r.cookMinutes}m cook)
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Eating this</span>
          <div className="flex flex-wrap gap-2">
            {household?.users.map((u) => (
              <button
                key={u.id}
                onClick={() => toggleEater(u.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${eaterIds.includes(u.id) ? "bg-ink text-white" : "bg-chip text-ink-muted"}`}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>

        {entry && entry.substitutions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Substitutions</span>
            {entry.substitutions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm">
                <span className="text-xs font-bold text-ink">
                  {s.forUserName}: {s.dish}{" "}
                  <span className="rounded-full bg-[#FEF3E2] px-2 py-0.5 text-[10px] font-bold text-[#C97F16]">{s.dietaryLabel}</span>
                </span>
                <button onClick={() => deleteSub.mutate(s.id)} className="text-ink-faint">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {unaddressed.map((eater) => (
          <div key={eater.userId} className="flex items-center gap-3 rounded-xl bg-[#FEF3E2] p-3">
            {subDraftFor === eater.userId ? (
              <>
                <input
                  autoFocus
                  value={subDish}
                  onChange={(e) => setSubDish(e.target.value)}
                  placeholder="Substitute dish"
                  className="flex-1 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold text-ink"
                />
                <button
                  onClick={async () => {
                    if (!entry || !subDish.trim()) return;
                    await addSub.mutateAsync({ menuEntryId: entry.id, req: { forUserId: eater.userId, dish: subDish.trim(), dietaryLabel: eater.dietaryTags[0] } });
                    setSubDraftFor(null);
                    setSubDish("");
                  }}
                  className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white"
                >
                  Add
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-xs font-semibold text-[#8a6212]">
                  {eater.name} is {eater.dietaryTags.join(", ")} — add a substitution?
                </span>
                <button onClick={() => setSubDraftFor(eater.userId)} className="text-xs font-bold text-[#C97F16]">
                  Add
                </button>
              </>
            )}
          </div>
        ))}

        <button onClick={handleSave} className="rounded-2xl bg-ink py-3.5 text-sm font-bold text-white">
          Save
        </button>
      </div>
    </div>
  );
}
