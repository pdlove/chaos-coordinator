import { useState } from "react";
import { getEventPermissionInfo, type CalendarEventDto, type Role } from "@chaos-coordinator/core";
import { PinPrompt } from "../../components/PinPrompt";

/** Shared gate for the compact Week/Month views, which have no room for EventCard's inline
 * "Edit (PIN)" affordance — tapping a row here goes straight to a PIN prompt for non-owners
 * (parents/adults), or does nothing for children (who get the Day view's locked messaging instead). */
export function useEventEditGate(
  currentUserId: string | undefined,
  currentUserRole: Role | undefined,
  onGranted: (event: CalendarEventDto) => void
) {
  const [pendingEvent, setPendingEvent] = useState<CalendarEventDto | null>(null);

  function requestEdit(event: CalendarEventDto) {
    const perm = getEventPermissionInfo(event, currentUserId, currentUserRole);
    if (perm.isOwner) {
      onGranted(event);
      return;
    }
    if (currentUserRole === "Child") return;
    setPendingEvent(event);
  }

  const gate = pendingEvent ? (
    <PinPrompt
      onCancel={() => setPendingEvent(null)}
      onSuccess={() => {
        const e = pendingEvent;
        setPendingEvent(null);
        onGranted(e);
      }}
    />
  ) : null;

  return { requestEdit, gate };
}
