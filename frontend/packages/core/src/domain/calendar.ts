import type { CalendarEventDto, Role } from "@chaos-coordinator/shared";

export interface EventPermissionInfo {
  isOwner: boolean;
  isAttendee: boolean;
  /** Not the owner, but this session could still gain edit access via a parent PIN (children
   * never can — they get the design's "Read-only" messaging instead of a PIN prompt). */
  canRequestEdit: boolean;
}

export function getEventPermissionInfo(
  event: CalendarEventDto,
  currentUserId: string | undefined,
  currentUserRole: Role | undefined
): EventPermissionInfo {
  const isOwner = event.isOwnedByCurrentUser;
  const isAttendee = !!currentUserId && event.attendees.some((a) => a.id === currentUserId);
  const canRequestEdit = !isOwner && currentUserRole !== "Child";
  return { isOwner, isAttendee, canRequestEdit };
}
