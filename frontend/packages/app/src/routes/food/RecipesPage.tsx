import { useState } from "react";
import { useCreateRecipe, useRecipes } from "@chaos-coordinator/core";

export function RecipesPage() {
  const { data: recipes, isLoading } = useRecipes();
  const createRecipe = useCreateRecipe();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [prep, setPrep] = useState(15);
  const [cook, setCook] = useState(20);

  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5">
      {isLoading && <div className="text-sm font-medium text-ink-muted">Loading…</div>}
      {recipes?.map((r) => (
        <div key={r.id} className="rounded-card bg-card p-3.5 shadow-sm">
          <div className="text-sm font-bold text-ink">{r.title}</div>
          <div className="mt-0.5 text-[11px] font-medium text-ink-faint">
            {r.prepMinutes} min prep · {r.cookMinutes} min cook
          </div>
        </div>
      ))}

      {showNew ? (
        <div className="flex flex-col gap-2 rounded-card bg-card p-3.5 shadow-sm">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recipe name" className="rounded-lg border border-border-strong px-2.5 py-2 text-sm font-semibold text-ink" />
          <div className="flex gap-2">
            <input type="number" value={prep} onChange={(e) => setPrep(Number(e.target.value))} placeholder="Prep min" className="w-1/2 rounded-lg border border-border-strong px-2.5 py-2 text-sm font-semibold text-ink" />
            <input type="number" value={cook} onChange={(e) => setCook(Number(e.target.value))} placeholder="Cook min" className="w-1/2 rounded-lg border border-border-strong px-2.5 py-2 text-sm font-semibold text-ink" />
          </div>
          <button
            onClick={() => {
              if (!title.trim()) return;
              createRecipe.mutate({ title: title.trim(), prepMinutes: prep, cookMinutes: cook, instructions: null });
              setTitle("");
              setShowNew(false);
            }}
            className="rounded-lg bg-ink py-2 text-xs font-bold text-white"
          >
            Save
          </button>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)} className="flex h-12 items-center justify-center gap-2 rounded-card-lg border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted">
          + New recipe
        </button>
      )}
    </div>
  );
}
