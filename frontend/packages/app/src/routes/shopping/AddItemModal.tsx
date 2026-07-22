import { useState } from "react";
import { isGroupHeader, useCreateShoppingItem, useSearchItems } from "@chaos-coordinator/core";

interface AddItemModalProps {
  storeId: string;
  onClose: () => void;
}

export function AddItemModal({ storeId, onClose }: AddItemModalProps) {
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { data: suggestions } = useSearchItems(query);
  const createItem = useCreateShoppingItem();

  async function addItem(name: string, department: string) {
    await createItem.mutateAsync({ storeId, req: { name, department, note: null, quantity } });
    onClose();
  }

  // Pasting several lines at once (e.g. a list copied from Notes) adds one item per non-blank
  // line — each line still gets the same ALL-CAPS-becomes-a-header treatment as a normal item.
  // Sequential awaits, not Promise.all, to match the same-store add order the user pasted in.
  async function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const lines = e.clipboardData.getData("text").split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return;
    e.preventDefault();
    for (const line of lines) {
      await createItem.mutateAsync({ storeId, req: { name: line, department: "Other", note: null, quantity } });
    }
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
            onPaste={handlePaste}
            placeholder="Item name (paste a list to add several)"
            className="flex-1 rounded-xl border-[1.5px] border-ink bg-card px-3.5 py-2.5 text-[15px] font-semibold text-ink"
          />
        </div>

        <div className="flex items-center justify-between px-5 pb-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Quantity</div>
          <div className="flex h-10 items-center gap-4 rounded-xl bg-card px-4 shadow-sm">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="text-lg font-extrabold text-ink"
            >
              −
            </button>
            <span className="min-w-[1.5ch] text-center text-base font-extrabold text-ink">{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => q + 1)} className="text-lg font-extrabold text-ink">
              +
            </button>
          </div>
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
              <span className="text-sm font-bold text-ink-muted">
                {isGroupHeader(query.trim())
                  ? `Add "${query.trim()}" as a section header`
                  : `Add "${query.trim()}" as a new item`}
              </span>
            </button>
          )}
          {query.trim() && isGroupHeader(query.trim()) && (
            <div className="px-1 text-[11px] font-medium text-ink-faint">
              Tip: typing a name in ALL CAPS turns it into a section divider instead of a checkable item.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
