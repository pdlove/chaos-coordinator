import { useState } from "react";

interface MarkPaidPromptProps {
  onCancel: () => void;
  onConfirm: (confirmationNumber: string | null) => void;
}

/** Small modal shown right before marking a bill paid — a confirmation/check number is always
 * optional, so "Mark paid" works whether or not it's filled in. */
export function MarkPaidPrompt({ onCancel, onConfirm }: MarkPaidPromptProps) {
  const [confirmationNumber, setConfirmationNumber] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center" onClick={onCancel}>
      <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-t-card-lg bg-app p-6 sm:rounded-card-lg" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-extrabold text-ink">Mark as paid</div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Confirmation number (optional)</span>
          <input
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            placeholder="Check # or confirmation #"
            className="rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-semibold text-ink"
            autoFocus
          />
        </label>

        <button
          onClick={() => onConfirm(confirmationNumber.trim() || null)}
          className="rounded-2xl bg-ink py-3.5 text-sm font-bold text-white"
        >
          Mark paid
        </button>
      </div>
    </div>
  );
}
