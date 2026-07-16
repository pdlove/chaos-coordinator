import { useState } from "react";
import { useItemPriceHistory, usePayShoppingItem, useUpdateShoppingItem, type ShoppingItemDto } from "@chaos-coordinator/core";

interface ItemEditModalProps {
  item: ShoppingItemDto;
  storeName: string;
  onClose: () => void;
}

export function ItemEditModal({ item, storeName, onClose }: ItemEditModalProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [price, setPrice] = useState(item.lastPaidPrice?.toFixed(2) ?? "");
  const updateItem = useUpdateShoppingItem();
  const payItem = usePayShoppingItem();
  const { data: history } = useItemPriceHistory(item.id);

  async function handleSave() {
    if (quantity !== item.quantity) {
      await updateItem.mutateAsync({ id: item.id, req: { name: item.name, department: item.department, note: item.note, quantity, checked: item.checked } });
    }
    const parsed = parseFloat(price);
    if (!isNaN(parsed)) {
      await payItem.mutateAsync({ id: item.id, req: { price: parsed } });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onClose}>
      <div
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-t-card-lg bg-app p-6 sm:rounded-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-extrabold text-ink">{item.name}</div>
            <div className="mt-0.5 text-xs font-medium text-ink-muted">
              {item.department} · {storeName}
            </div>
          </div>
          <button onClick={onClose} className="text-lg text-ink-faint">
            ✕
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Quantity</div>
            <div className="flex h-12 items-center justify-between rounded-xl bg-card px-3.5 shadow-sm">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="text-lg font-extrabold text-ink">
                −
              </button>
              <span className="text-base font-extrabold text-ink">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="text-lg font-extrabold text-ink">
                +
              </button>
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Price paid</div>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="$0.00"
              className="h-12 w-full rounded-xl border-[1.5px] border-ink bg-card px-3.5 text-base font-extrabold text-ink"
            />
          </div>
        </div>

        {history && history.length > 0 && (
          <div>
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Price history · remembered automatically</div>
            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-card shadow-sm">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between px-3.5 py-2.5">
                  <span className="text-[12.5px] font-semibold text-ink">
                    {new Date(h.paidAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-[13px] font-bold text-ink">${h.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleSave} className="rounded-2xl bg-ink py-3.5 text-sm font-bold text-white">
          Save
        </button>
      </div>
    </div>
  );
}
