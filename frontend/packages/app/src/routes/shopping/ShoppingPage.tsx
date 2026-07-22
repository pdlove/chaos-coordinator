import { useRef, useState } from "react";
import {
  ApiError,
  isGroupHeader,
  useCreateStore,
  useDeleteCheckedShoppingItems,
  useDeleteShoppingItem,
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

const SWIPE_REVEAL_PX = 76;

/** Section headers are just regular items with an all-caps name (see isGroupHeader) — deleting
 * the last non-header item under one leaves a heading with nothing under it, so it should go too. */
function findOrphanedHeaderId(items: ShoppingItemDto[], deletedItemId: string): string | undefined {
  const index = items.findIndex((i) => i.id === deletedItemId);
  if (index === -1) return undefined;

  let headerIndex = -1;
  for (let i = index - 1; i >= 0; i--) {
    if (isGroupHeader(items[i].name)) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) return undefined;

  for (let i = headerIndex + 1; i < items.length; i++) {
    if (i === index) continue;
    if (isGroupHeader(items[i].name)) break;
    return undefined; // a sibling item remains — keep the header
  }
  return items[headerIndex].id;
}

/** True once a header has no items left under it (before the next header or the end of the
 * list) — including headers that were already empty (e.g. typed by hand with nothing added
 * under them yet), not just ones orphaned by findOrphanedHeaderId above. */
function isEmptyCategory(items: ShoppingItemDto[], headerId: string): boolean {
  const index = items.findIndex((i) => i.id === headerId);
  if (index === -1) return false;
  for (let i = index + 1; i < items.length; i++) {
    if (isGroupHeader(items[i].name)) break;
    return false;
  }
  return true;
}

/** Wraps a row so it can be dragged left to reveal a delete button. Only a horizontal drag opens
 * it — a plain tap passes straight through to the row's own buttons (checkbox, edit), and a tap
 * while already open just closes it instead of triggering them. */
function SwipeToDeleteRow({
  onDelete,
  children,
  contentClassName = "bg-card",
}: {
  onDelete: () => void;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const [offset, setOffset] = useState(0);
  const dragRef = useRef<{ startX: number; startOffset: number } | null>(null);
  const movedRef = useRef(false);

  function handlePointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startOffset: offset };
    movedRef.current = false;
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    if (Math.abs(delta) > 4) movedRef.current = true;
    setOffset(Math.min(0, Math.max(-SWIPE_REVEAL_PX, dragRef.current.startOffset + delta)));
  }
  function handlePointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    setOffset((o) => (o < -SWIPE_REVEAL_PX / 2 ? -SWIPE_REVEAL_PX : 0));
  }

  return (
    <div className="relative shrink-0 overflow-hidden">
      <button
        onClick={() => onDelete()}
        className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center bg-cat-doctor text-xs font-bold text-white"
      >
        Delete
      </button>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={(e) => {
          if (movedRef.current) {
            // Trailing click fired by the browser right after the drag's pointerup — the open/
            // closed decision was already made there, so just swallow this click without
            // re-touching offset (or it would slam an just-opened row shut again).
            e.stopPropagation();
            e.preventDefault();
            return;
          }
          if (offset !== 0) {
            // A plain tap landing on an already-open row: close it instead of letting the tap
            // reach the checkbox/edit button underneath.
            e.stopPropagation();
            e.preventDefault();
            setOffset(0);
          }
        }}
        style={{ transform: `translateX(${offset}px)`, transition: dragRef.current ? "none" : "transform 150ms ease-out" }}
        className={`touch-pan-y ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-chip text-base disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ShoppingPage() {
  const { data: stores } = useStores();
  const [activeStoreId, setActiveStoreId] = useState<string | undefined>(undefined);
  const storeId = activeStoreId ?? stores?.[0]?.id;
  const { data: items } = useShoppingItems(storeId);
  const updateItem = useUpdateShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const createStore = useCreateStore();
  const organizeItems = useOrganizeShoppingItems();
  const hideCheckedItems = useHideCheckedShoppingItems();
  const deleteCheckedItems = useDeleteCheckedShoppingItems();

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
        <div className="flex items-center justify-between">
          <div className="text-2xl font-extrabold text-ink">Shopping</div>
          <div className="flex items-center gap-2">
            {storeId && (
              <IconButton label="Add item" onClick={() => setAddingItem(true)}>
                +
              </IconButton>
            )}
            {storeId && !!items?.length && (
              <IconButton label="Organize list" onClick={handleOrganize} disabled={organizeItems.isPending}>
                ✨
              </IconButton>
            )}
            {storeId && hasCheckedItems && (
              <IconButton
                label="Delete checked items"
                onClick={() => deleteCheckedItems.mutate(storeId)}
                disabled={deleteCheckedItems.isPending}
              >
                🗑
              </IconButton>
            )}
          </div>
        </div>
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

      <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
        {/* Flat, backend-ordered list — section structure comes entirely from inline header rows
            (typed by hand in ALL CAPS, or inserted by "Organize list"), not from bucketing by
            department, so the two ways of grouping the list render identically. */}
        {!!items?.length && (
          <div className="flex flex-col divide-y divide-border overflow-y-auto rounded-card bg-card shadow-sm">
            {items.map((item) =>
              isGroupHeader(item.name) ? (
                isEmptyCategory(items, item.id) ? (
                  <SwipeToDeleteRow key={item.id} onDelete={() => deleteItem.mutate(item.id)} contentClassName="bg-chip">
                    <div className="px-3 py-2 text-[12px] font-extrabold uppercase tracking-wide text-ink-muted">{item.name}</div>
                  </SwipeToDeleteRow>
                ) : (
                  // No checkbox, no price/quantity, not tappable (nothing on it to edit today).
                  <div key={item.id} className="bg-chip px-3 py-2 text-[12px] font-extrabold uppercase tracking-wide text-ink-muted">
                    {item.name}
                  </div>
                )
              ) : (
                <SwipeToDeleteRow
                  key={item.id}
                  onDelete={() => {
                    const orphanedHeaderId = findOrphanedHeaderId(items ?? [], item.id);
                    deleteItem.mutate(item.id);
                    if (orphanedHeaderId) deleteItem.mutate(orphanedHeaderId);
                  }}
                >
                  <div className="flex items-center gap-2.5 p-3">
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
                </SwipeToDeleteRow>
              )
            )}
          </div>
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
