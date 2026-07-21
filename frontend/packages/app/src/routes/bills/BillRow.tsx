import { useState } from "react";
import { useMarkBillPaid, useSessionStore, type BillDto } from "@chaos-coordinator/core";
import { StatusBadge } from "../../components/StatusBadge";
import { PinPrompt } from "../../components/PinPrompt";
import { MarkPaidPrompt } from "./MarkPaidPrompt";

export function BillRow({ bill }: { bill: BillDto }) {
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showMarkPaidPrompt, setShowMarkPaidPrompt] = useState(false);
  const markPaid = useMarkBillPaid();

  function handleMarkPaidTap() {
    if (pinElevated) setShowMarkPaidPrompt(true);
    else setShowPinPrompt(true);
  }

  function confirmMarkPaid(confirmationNumber: string | null) {
    setShowMarkPaidPrompt(false);
    markPaid.mutate({ id: bill.id, confirmationNumber });
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
          {bill.accountNumber && <div className="mt-0.5 text-[11px] font-medium text-ink-faint">Acct {bill.accountNumber}</div>}
          {bill.status === "Paid" && bill.confirmationNumber && (
            <div className="mt-0.5 text-[11px] font-medium text-ink-faint">Confirmation {bill.confirmationNumber}</div>
          )}
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
      {bill.photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {bill.photos.map((photo) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="h-12 w-12 overflow-hidden rounded-lg bg-chip">
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      {showPinPrompt && (
        <PinPrompt
          onCancel={() => setShowPinPrompt(false)}
          onSuccess={() => {
            setShowPinPrompt(false);
            setShowMarkPaidPrompt(true);
          }}
        />
      )}
      {showMarkPaidPrompt && <MarkPaidPrompt onCancel={() => setShowMarkPaidPrompt(false)} onConfirm={confirmMarkPaid} />}
    </div>
  );
}
