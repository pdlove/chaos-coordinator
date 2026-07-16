import { useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

interface PinPadProps {
  length?: number;
  onSubmit: (pin: string) => void;
  error?: string;
}

/** The numeric keypad + dot-progress pattern from the wall display's "Who's editing?" PIN entry —
 * reused wherever a parent PIN needs to be collected (wall edit-mode, phone override actions). */
export function PinPad({ length = 4, onSubmit, error }: PinPadProps) {
  const [pin, setPin] = useState("");

  function press(key: string) {
    if (key === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!key || pin.length >= length) return;
    const next = pin + key;
    setPin(next);
    if (next.length === length) {
      onSubmit(next);
      setPin("");
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full ${i < pin.length ? "bg-ink" : "border-2 border-ink-fainter"}`}
          />
        ))}
      </div>
      {error && <div className="text-xs font-semibold text-cat-doctor">{error}</div>}
      <div className="grid grid-cols-3 gap-3.5">
        {KEYS.map((key, i) =>
          key === "" ? (
            <div key={i} className="h-16 w-16" />
          ) : (
            <button
              key={i}
              onClick={() => press(key)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-card text-xl font-bold text-ink shadow-sm"
            >
              {key === "back" ? "⌫" : key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
