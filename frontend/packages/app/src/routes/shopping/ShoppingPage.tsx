import { useState } from "react";
import {
  ApiError,
  isGroupHeader,
  useCreateStore,
  useHideCheckedShoppingItems,
  useOrganizeShoppingItems,
  useShoppingItems,
  useStores,
  useUpdateShoppingItem,
  type ShoppingItemDto,
} from "@chaos-coordinator/core";
import { AddItemModal } from "./AddItemModal";
import { ItemEditModal } from "./ItemEditModal";

function describeOrganizeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return "The AI service isn't reachable right now — check its setup on the server, then try again.";
    }
    return `Something went wrong (server returned ${err.status}). Try again, or check the server logs.`;
  }
  return "Couldn't reach the server — check your connection.";
}

export function ShoppingPage() {
  const { data: stores } = useStores();
  const [activeStoreId, setActiveStoreId] = useState<string | undefined>(undefined);
  const storeId = activeStoreId ?? stores?.[0]?.id;
  const { data: items } = useShoppingItems(storeId);
  const updateItem = useUpdateShoppingItem();
  const createStore = useCreateStore();
  const organizeItems = useOrganizeShoppingItems();
  const hideCheckedItems = useHideCheckedShoppingItems();

  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItemDto | null>(null);
  const [newStoreName, setNewStoreName] = useState<string | null>(null);
  const [organizeError, setOrganizeError] = useState<string | null>(null);

  async function handleOrganize() {
    if (!storeId) return;
    setOrganizeError(null);
    try {
      await organizeItems.mutateAsync(storeId);
    } catch (err) {
      setOrganizeError(describeOrganizeError(err));
    }
  }

  const activeStoreName = stores?.find((s) => s.id === storeId)?.name ?? "";
  const hasCheckedItems = !!items?.some((item) => item.checked);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-none flex-col gap-3 px-5 pb-3 pt-1.5">
        <div className="text-2xl font-extrabold text-ink">Shopping</div>
        <div className="flex gap-2 overflow-x-auto">
          {stores?.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStoreId(s.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold ${
                s.id === storeId ? "bg-ink text-white" : "bg-chip text-ink-muted"
              }`}
            >
              {s.name}
            </button>
          ))}
          {newStoreName === null ? (
            <button onClick={() => setNewStoreName("")} className="whitespace-nowrap rounded-full bg-chip px-3.5 py-1.5 text-xs font-bold text-ink-muted">
              + Store
            </button>
          ) : (
            <input
              autoFocus
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newStoreName.trim()) {
                  createStore.mutate({ name: newStoreName.trim() });
                  setNewStoreName(null);
                }
              }}
              onBlur={() => setNewStoreName(null)}
              placeholder="Store name"
              className="w-28 rounded-full bg-chip px-3.5 py-1.5 text-xs font-bold text-ink outline-none"
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
        {/* Flat, backend-ordered list — section structure comes entirely from inline header rows
            (typed by hand in ALL CAPS, or inserted by "Organize list"), not from bucketing by
            department, so the two ways of grouping the list render identically. */}
        {!!items?.length && (
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card shadow-sm">
            {items.map((item) =>
              isGroupHeader(item.name) ? (
                // No checkbox, no price/quantity, not tappable (nothing on it to edit today).
                <div key={item.id} className="bg-chip px-3 py-2 text-[12px] font-extrabold uppercase tracking-wide text-ink-muted">
                  {item.name}
                </div>
              ) : (
                <div key={item.id} className="flex items-center gap-2.5 p-3">
                  <button
                    onClick={() =>
                      updateItem.mutate({
                        id: item.id,
                        req: { name: item.name, department: item.department, note: item.note, quantity: item.quantity, checked: !item.checked },
                      })
                    }
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-[6px] ${
                      item.checked ? "bg-cat-home text-white" : "border-2 border-ink-fainter"
                    }`}
                  >
                    {item.checked && "✓"}
                  </button>
                  <button onClick={() => setEditingItem(item)} className="min-w-0 flex-1 text-left">
                    <div className={`truncate text-[13.5px] font-bold text-ink ${item.checked ? "text-opacity-50 line-through" : ""}`}>
                      {item.name}
                    </div>
                    <div className="text-[11px] font-medium text-ink-faint">
                      {item.checked
                        ? item.lastPaidPrice != null
                          ? `paid $${item.lastPaidPrice.toFixed(2)}`
                          : "checked"
                        : item.note || (item.lastPaidPrice != null ? `last paid $${item.lastPaidPrice.toFixed(2)}` : "no price yet")}
                    </div>
                  </button>
                  {item.quantity > 1 && (
                    <span className="flex-none rounded-full bg-chip px-2.5 py-1 text-[11px] font-bold text-ink-muted">×{item.quantity}</span>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {storeId && (
          <button
            onClick={() => setAddingItem(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-card-lg border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
          >
            + Add item
          </button>
        )}

        {storeId && !!items?.length && (
          <button
            onClick={handleOrganize}
            disabled={organizeItems.isPending}
            className="flex h-12 items-center justify-center gap-2 rounded-card-lg bg-chip text-sm font-bold text-ink disabled:opacity-50"
          >
            {organizeItems.isPending ? "Organizing…" : "✨ Organize list"}
          </button>
        )}

        {storeId && hasCheckedItems && (
          <button
            onClick={() => hideCheckedItems.mutate(storeId)}
            disabled={hideCheckedItems.isPending}
            className="flex h-12 items-center justify-center gap-2 rounded-card-lg bg-chip text-sm font-bold text-ink-muted disabled:opacity-50"
          >
            Remove checked items
          </button>
        )}

        {organizeError && (
          <div className="rounded-xl bg-[#FDEBEF] px-3 py-2.5 text-sm font-semibold text-cat-doctor">{organizeError}</div>
        )}
      </div>

      {addingItem && storeId && <AddItemModal storeId={storeId} onClose={() => setAddingItem(false)} />}
      {editingItem && <ItemEditModal item={editingItem} storeName={activeStoreName} onClose={() => setEditingItem(null)} />}
    </div>
  );
}
