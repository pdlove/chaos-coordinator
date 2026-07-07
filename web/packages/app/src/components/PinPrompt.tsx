import { useState } from "react";
import { useHousehold, useVerifyPin } from "@chaos-coordinator/core";
import { Avatar } from "./Avatar";
import { PinPad } from "./PinPad";

interface PinPromptProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/** "Who's editing? Choose a parent, then enter their PIN" — used wherever an action needs a
 * parent PIN (editing/deleting another member's calendar event, chore-group settings, bills, etc). */
export function PinPrompt({ onSuccess, onCancel }: PinPromptProps) {
  const { data: household } = useHousehold();
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const verifyPin = useVerifyPin();

  const parents = household?.users.filter((u) => u.role === "Parent") ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55" onClick={onCancel}>
      <div
        className="flex w-[320px] flex-col items-center gap-5 rounded-card-lg bg-app p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-lg font-extrabold text-ink">Who's editing?</div>
          <div className="mt-1 text-xs font-medium text-ink-muted">Choose a parent, then enter their PIN</div>
        </div>

        <div className="flex gap-4">
          {parents.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedParentId(p.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={selectedParentId === p.id ? "rounded-full ring-2 ring-ink ring-offset-2" : ""}>
                <Avatar initials={p.initials} color={p.color} size={52} />
              </div>
              <span className="text-xs font-bold text-ink">{p.name}</span>
            </button>
          ))}
        </div>

        {selectedParentId && (
          <PinPad
            error={verifyPin.isError ? "Wrong PIN — try again" : undefined}
            onSubmit={(pin) =>
              verifyPin.mutate(
                { userId: selectedParentId, pin },
                { onSuccess: (session) => session.pinElevated && onSuccess() }
              )
            }
          />
        )}

        <button onClick={onCancel} className="text-xs font-semibold text-ink-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
