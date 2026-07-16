import { useState } from "react";
import { useCreateBillTemplate, useHousehold } from "@chaos-coordinator/core";

export function AddBillTemplateModal({ onClose }: { onClose: () => void }) {
  const { data: household } = useHousehold();
  const createTemplate = useCreateBillTemplate();
  const [title, setTitle] = useState("");
  const [managedById, setManagedById] = useState(household?.users[0]?.id ?? "");
  const [dueDay, setDueDay] = useState(1);
  const [amount, setAmount] = useState("");

  async function handleSave() {
    if (!title.trim() || !managedById) return;
    await createTemplate.mutateAsync({
      title: title.trim(),
      managedById,
      dueDay,
      amount: amount ? parseFloat(amount) : null,
      amountMin: null,
      amountMax: null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onClose}>
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-t-card-lg bg-app p-6 sm:rounded-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-extrabold text-ink">New recurring bill</div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mortgage" className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink" />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Managed by</span>
            <select value={managedById} onChange={(e) => setManagedById(e.target.value)} className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink">
              {household?.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Due day</span>
            <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink" />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Amount</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="$0.00" className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink" />
        </label>

        <button onClick={handleSave} className="rounded-2xl bg-ink py-3.5 text-sm font-bold text-white">
          Save
        </button>
      </div>
    </div>
  );
}
