import { useLayoutEffect, useRef, useState } from "react";
import type { UserDto } from "@chaos-coordinator/shared";

interface AttendeePillPickerProps {
  users: UserDto[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

const PILL_CLASS = "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold";

/** Toggleable attendee pills. Falls back to initials-only labels once the full first-name pills
 * no longer fit the available width on one row, so a household with several members stays compact
 * instead of wrapping into a tall stack. */
export function AttendeePillPicker({ users, selectedIds, onToggle }: AttendeePillPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [useInitials, setUseInitials] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    function check() {
      if (!container || !measure) return;
      setUseInitials(measure.scrollWidth > container.clientWidth);
    }
    check();

    const observer = new ResizeObserver(check);
    observer.observe(container);
    return () => observer.disconnect();
  }, [users]);

  return (
    <div ref={containerRef} className="relative flex flex-wrap gap-2">
      <div ref={measureRef} aria-hidden className="pointer-events-none absolute -z-10 flex gap-2 opacity-0">
        {users.map((u) => (
          <span key={u.id} className={PILL_CLASS}>
            {firstName(u.name)}
          </span>
        ))}
      </div>
      {users.map((u) => {
        const selected = selectedIds.includes(u.id);
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onToggle(u.id)}
            className={`${PILL_CLASS} ${selected ? "text-white" : "bg-chip text-ink-muted"}`}
            style={selected ? { background: u.color } : undefined}
          >
            {useInitials ? u.initials : firstName(u.name)}
          </button>
        );
      })}
    </div>
  );
}
