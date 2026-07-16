import type { CalendarEventDto, EventCategory, Role } from "@chaos-coordinator/shared";
import { isSameDay, startOfDay } from "./dates";

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

/** Additive multi-select category filter — empty selection means "show all". */
export function eventMatchesCategoryFilter(event: CalendarEventDto, selected: Set<EventCategory>): boolean {
  return selected.size === 0 || selected.has(event.category);
}

/** Does this event occupy any part of `day`? Unlike a same-day-as-start check, this also matches
 * the days a multi-day event spans in between (and on) its start/end dates. */
export function eventSpansDay(event: CalendarEventDto, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const start = new Date(event.start).getTime();
  const end = event.end ? new Date(event.end).getTime() : start;
  return start < dayEnd && end >= dayStart;
}

export type EventDaySegment = "single" | "start" | "middle" | "end";

/** Which part of a (possibly multi-day) event `day` represents, for per-day label rendering:
 * "single"/"start" show the normal start time, "middle" shows "All Day", "end" shows "Ends at …". */
export function getEventDaySegment(event: CalendarEventDto, day: Date): EventDaySegment {
  if (!event.end) return "single";
  const startDay = startOfDay(new Date(event.start));
  const endDay = startOfDay(new Date(event.end));
  if (isSameDay(startDay, endDay)) return "single";
  if (isSameDay(day, startDay)) return "start";
  if (isSameDay(day, endDay)) return "end";
  return "middle";
}
