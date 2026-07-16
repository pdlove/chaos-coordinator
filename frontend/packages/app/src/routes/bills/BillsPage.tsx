import { useState } from "react";
import { useBills, useSessionStore } from "@chaos-coordinator/core";
import { BillRow } from "./BillRow";
import { PinPrompt } from "../../components/PinPrompt";
import { AddBillTemplateModal } from "./AddBillTemplateModal";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function BillsPage() {
  const month = currentMonth();
  const { data, isLoading } = useBills(month);
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString([], { month: "long" });

  function openAddTemplate() {
    if (pinElevated) setShowAddTemplate(true);
    else setShowPinPrompt(true);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none flex-col gap-3 px-5 pb-3 pt-1.5">
        <div className="text-2xl font-extrabold text-ink">Bills · {monthLabel}</div>
        {data && (
          <div className="flex items-center justify-between rounded-card-lg bg-ink px-4.5 py-4">
            <div>
              <div className="text-[11px] font-semibold text-[#C9C3B6]">Due in {monthLabel}</div>
              <div className="text-[22px] font-extrabold text-white">${data.dueTotal.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-[#C9C3B6]">Paid so far</div>
              <div className="text-base font-extrabold text-[#7FE3D2]">${data.paidTotal.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-[#F6C9C0]">Overdue</div>
              <div className="text-base font-extrabold text-[#FF9A85]">${data.overdueTotal.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5">
        {isLoading && <div className="text-sm font-medium text-ink-muted">Loading…</div>}

        {data && data.carriedOver.length > 0 && (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wide text-cat-activities">Carried over · unpaid</div>
            {data.carriedOver.map((b) => (
              <BillRow key={b.id} bill={b} />
            ))}
          </>
        )}

        {data && (
          <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{monthLabel}</div>
        )}
        {data?.current.map((b) => (
          <BillRow key={b.id} bill={b} />
        ))}

        <button
          onClick={openAddTemplate}
          className="mt-1 flex h-12 items-center justify-center gap-2 rounded-card-lg border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
        >
          + Add recurring bill{pinElevated ? "" : " (PIN)"}
        </button>
      </div>

      {showPinPrompt && (
        <PinPrompt
          onCancel={() => setShowPinPrompt(false)}
          onSuccess={() => {
            setShowPinPrompt(false);
            setShowAddTemplate(true);
          }}
        />
      )}
      {showAddTemplate && <AddBillTemplateModal onClose={() => setShowAddTemplate(false)} />}
    </div>
  );
}
