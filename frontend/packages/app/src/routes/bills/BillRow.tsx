import { useState } from "react";
import { useMarkBillPaid, useSessionStore, type BillDto } from "@chaos-coordinator/core";
import { StatusBadge } from "../../components/StatusBadge";
import { PinPrompt } from "../../components/PinPrompt";

export function BillRow({ bill }: { bill: BillDto }) {
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const markPaid = useMarkBillPaid();

  function handleMarkPaidTap() {
    if (pinElevated) markPaid.mutate(bill.id);
    else setShowPinPrompt(true);
  }

  const dueLabel = new Date(bill.dueDate).toLocaleDateString([], { month: "short", day: "numeric" });
  const amountLabel =
    bill.amount != null
      ? `$${bill.amount.toLocaleString()}`
      : bill.amountMin != null && bill.amountMax != null
        ? `expected $${bill.amountMin}–${bill.amountMax}`
        : "—";

  return (
    <div className={`rounded-card bg-card p-3.5 shadow-sm ${bill.status === "Overdue" ? "border-[1.5px] border-[#F6C9C0]" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-ink">{bill.title}</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-ink-muted">
            Managed by {bill.managedByName} · {bill.status === "Paid" ? `Paid ${bill.paidDate ? new Date(bill.paidDate).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}` : `due ${dueLabel}`}
          </div>
        </div>
        <StatusBadge status={bill.status} />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[17px] font-extrabold text-ink">{bill.amount != null ? `$${bill.amount.toLocaleString()}` : amountLabel}</span>
          {bill.amount != null && bill.amountMin != null && bill.amountMax != null && (
            <span className="text-[11px] font-medium text-ink-faint">
              expected ${bill.amountMin}–{bill.amountMax}
            </span>
          )}
        </div>
        {bill.status !== "Paid" && (
          <button onClick={handleMarkPaidTap} className="text-[11px] font-bold text-ink-muted">
            Mark paid{pinElevated ? "" : " (PIN)"}
          </button>
        )}
      </div>
      {showPinPrompt && (
        <PinPrompt
          onCancel={() => setShowPinPrompt(false)}
          onSuccess={() => {
            setShowPinPrompt(false);
            markPaid.mutate(bill.id);
          }}
        />
      )}
    </div>
  );
}
