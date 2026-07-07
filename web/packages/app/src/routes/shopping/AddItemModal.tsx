import { useState } from "react";
import { useCreateShoppingItem, useSearchItems } from "@chaos-coordinator/core";

interface AddItemModalProps {
  storeId: string;
  onClose: () => void;
}

export function AddItemModal({ storeId, onClose }: AddItemModalProps) {
  const [query, setQuery] = useState("");
  const { data: suggestions } = useSearchItems(query);
  const createItem = useCreateShoppingItem();

  async function addItem(name: string, department: string) {
    await createItem.mutateAsync({ storeId, req: { name, department, note: null, quantity: 1 } });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/55" onClick={onClose}>
      <div
        className="mt-4 flex max-h-[80vh] w-full max-w-[420px] flex-col gap-1 overflow-hidden rounded-card-lg bg-app"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4">
          <button onClick={onClose} className="text-lg">
            ←
          </button>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Item name"
            className="flex-1 rounded-xl border-[1.5px] border-ink bg-card px-3.5 py-2.5 text-[15px] font-semibold text-ink"
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pb-5">
          {query.trim() && (
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">From your history</div>
          )}
          {suggestions?.map((s) => (
            <button
              key={s.name}
              onClick={() => addItem(s.name, s.department)}
              className="rounded-card bg-card p-3.5 text-left shadow-sm"
            >
              <div className="text-sm font-bold text-ink">{s.name}</div>
              <div className="text-[11px] font-medium text-ink-faint">
                bought {s.timesBought}× {s.lastPrice != null && `· last $${s.lastPrice.toFixed(2)}`} · {s.department}
              </div>
            </button>
          ))}
          {query.trim() && (
            <button
              onClick={() => addItem(query.trim(), "Other")}
              className="rounded-card border-[1.5px] border-dashed border-ink-fainter p-3.5 text-left"
            >
              <span className="text-sm font-bold text-ink-muted">Add "{query.trim()}" as a new item</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
