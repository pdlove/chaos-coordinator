import { useState } from "react";
import { useBills, useSessionStore, type BillDto } from "@chaos-coordinator/core";
import { BillRow } from "./BillRow";
import { PinPrompt } from "../../components/PinPrompt";
import { SegmentedToggle } from "../../components/SegmentedToggle";
import { AddBillTemplateModal } from "./AddBillTemplateModal";
import { AddOneOffBillModal } from "./AddOneOffBillModal";
import { BillPhotoImportFlow } from "./photo-import/BillPhotoImportFlow";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Tab = "Recurring" | "OneOff";

function isRecurring(bill: BillDto) {
  return bill.templateId != null;
}

export function BillsPage() {
  const month = currentMonth();
  const { data, isLoading } = useBills(month);
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const [pinPromptFor, setPinPromptFor] = useState<"template" | "oneOff" | null>(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showAddOneOff, setShowAddOneOff] = useState(false);
  const [showPhotoImport, setShowPhotoImport] = useState(false);
  const [tab, setTab] = useState<Tab>("Recurring");
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString([], { month: "long" });

  function openAddTemplate() {
    if (pinElevated) setShowAddTemplate(true);
    else setPinPromptFor("template");
  }

  function openAddOneOff() {
    if (pinElevated) setShowAddOneOff(true);
    else setPinPromptFor("oneOff");
  }

  const carriedOver = data?.carriedOver.filter((b) => (tab === "Recurring" ? isRecurring(b) : !isRecurring(b))) ?? [];
  const current = data?.current.filter((b) => (tab === "Recurring" ? isRecurring(b) : !isRecurring(b))) ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none flex-col gap-3 px-5 pb-3 pt-1.5">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-extrabold text-ink">Bills · {monthLabel}</div>
          <button
            onClick={() => setShowPhotoImport(true)}
            className="flex items-center gap-1.5 rounded-full bg-chip px-3 py-2 text-[11px] font-bold text-ink-muted"
          >
            📷 Scan a bill
          </button>
        </div>
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
        <SegmentedToggle<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "Recurring", label: "Recurring" },
            { value: "OneOff", label: "One-off" },
          ]}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5">
        {isLoading && <div className="text-sm font-medium text-ink-muted">Loading…</div>}

        {carriedOver.length > 0 && (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wide text-cat-activities">Carried over · unpaid</div>
            {carriedOver.map((b) => (
              <BillRow key={b.id} bill={b} />
            ))}
          </>
        )}

        {data && <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{monthLabel}</div>}
        {current.map((b) => (
          <BillRow key={b.id} bill={b} />
        ))}

        {tab === "Recurring" ? (
          <button
            onClick={openAddTemplate}
            className="mt-1 flex h-12 items-center justify-center gap-2 rounded-card-lg border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
          >
            + Add recurring bill{pinElevated ? "" : " (PIN)"}
          </button>
        ) : (
          <button
            onClick={openAddOneOff}
            className="mt-1 flex h-12 items-center justify-center gap-2 rounded-card-lg border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
          >
            + Add one-off bill{pinElevated ? "" : " (PIN)"}
          </button>
        )}
      </div>

      {pinPromptFor && (
        <PinPrompt
          onCancel={() => setPinPromptFor(null)}
          onSuccess={() => {
            if (pinPromptFor === "template") setShowAddTemplate(true);
            else setShowAddOneOff(true);
            setPinPromptFor(null);
          }}
        />
      )}
      {showAddTemplate && <AddBillTemplateModal onClose={() => setShowAddTemplate(false)} />}
      {showAddOneOff && <AddOneOffBillModal onClose={() => setShowAddOneOff(false)} />}
      {showPhotoImport && <BillPhotoImportFlow onClose={() => setShowPhotoImport(false)} />}
    </div>
  );
}
