import { useRef, useState } from "react";
import {
  useItemPriceHistory,
  usePayShoppingItem,
  useUpdateShoppingItem,
  useUploadShoppingItemPhoto,
  type ShoppingItemDto,
} from "@chaos-coordinator/core";

interface ItemEditModalProps {
  item: ShoppingItemDto;
  storeName: string;
  onClose: () => void;
}

export function ItemEditModal({ item, storeName, onClose }: ItemEditModalProps) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [price, setPrice] = useState(item.lastPaidPrice?.toFixed(2) ?? "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl);
  const updateItem = useUpdateShoppingItem();
  const payItem = usePayShoppingItem();
  const uploadPhoto = useUploadShoppingItemPhoto();
  const { data: history } = useItemPriceHistory(item.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await uploadPhoto.mutateAsync({ file, fileName: file.name });
    setImageUrl(url);
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if ((trimmedName && trimmedName !== item.name) || quantity !== item.quantity || imageUrl !== item.imageUrl) {
      await updateItem.mutateAsync({
        id: item.id,
        req: { name: trimmedName || item.name, department: item.department, note: item.note, quantity, checked: item.checked, imageUrl },
      });
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-w-0 text-xl font-extrabold text-ink outline-none"
            />
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

        <div>
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">Photo</div>
          {imageUrl ? (
            <div className="relative">
              <a href={imageUrl} target="_blank" rel="noreferrer">
                <img src={imageUrl} alt="" className="h-32 w-full rounded-xl object-cover" />
              </a>
              <button
                onClick={() => setImageUrl(null)}
                aria-label="Remove photo"
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-xs font-bold text-white"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadPhoto.isPending}
              className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-fainter disabled:opacity-50"
            >
              <span className="text-xs font-bold text-ink-faint">{uploadPhoto.isPending ? "Uploading…" : "Tap to add a photo"}</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
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
