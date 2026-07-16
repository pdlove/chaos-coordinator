import { useState } from "react";
import { useHousehold, useVerifyPin } from "@chaos-coordinator/core";
import { Avatar } from "../components/Avatar";
import { PinPad } from "../components/PinPad";

export function WallPinUnlock({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { data: household } = useHousehold();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const verifyPin = useVerifyPin();
  const parents = household?.users.filter((u) => u.role === "Adult") ?? [];

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-app" onClick={(e) => e.stopPropagation()}>
      <div className="text-center">
        <div className="text-xl font-extrabold text-ink">Who's editing?</div>
        <div className="mt-1.5 text-sm font-medium text-ink-muted">Choose an adult, then enter their PIN</div>
      </div>

      <div className="flex gap-6">
        {parents.map((p) => (
          <button key={p.id} onClick={() => setSelectedId(p.id)} className="flex flex-col items-center gap-2">
            <div className={selectedId === p.id ? "rounded-full ring-[3px] ring-ink" : ""}>
              <Avatar initials={p.initials} color={p.color} size={56} />
            </div>
            <span className="text-sm font-bold text-ink">{p.name}</span>
          </button>
        ))}
      </div>

      {selectedId && (
        <PinPad
          error={verifyPin.isError ? "Wrong PIN" : undefined}
          onSubmit={(pin) => verifyPin.mutate({ userId: selectedId, pin }, { onSuccess: (s) => s.pinElevated && onSuccess() })}
        />
      )}

      <button onClick={onCancel} className="text-sm font-semibold text-ink-muted">
        Cancel
      </button>
    </div>
  );
}
