import type { BillStatus } from "@chaos-coordinator/shared";

const STYLES: Record<BillStatus, { bg: string; fg: string; label: string }> = {
  Overdue: { bg: "#FDEBEF", fg: "#E1543C", label: "Overdue" },
  DueSoon: { bg: "#FEF3E2", fg: "#C97F16", label: "Due soon" },
  Paid: { bg: "#E7F8F6", fg: "#1B9A8C", label: "Paid" },
  Upcoming: { bg: "#ECE7DE", fg: "#8B8478", label: "Upcoming" },
};

export function StatusBadge({ status, label }: { status: BillStatus; label?: string }) {
  const s = STYLES[status];
  return (
    <span
      className="whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold"
      style={{ background: s.bg, color: s.fg }}
    >
      {label ?? s.label}
    </span>
  );
}
