import type { CalendarEventDto, Role } from "@chaos-coordinator/shared";
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

/** Additive multi-select category filter (by category id) — empty selection means "show all". */
export function eventMatchesCategoryFilter(event: CalendarEventDto, selected: Set<string>): boolean {
  return selected.size === 0 || selected.has(event.category.id);
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

export interface TimedBlockLayout {
  event: CalendarEventDto;
  startMin: number;
  endMin: number;
  col: number;
  totalCols: number;
}

/** Point-in-time events (no explicit end) are given this long a visual block in the schedule grid. */
const DEFAULT_BLOCK_DURATION_MIN = 60;

/** Lays out same-day timed events (already filtered to `getEventDaySegment === "single"`) into
 * side-by-side columns for a traditional block-style schedule grid, so overlapping events don't
 * cover each other. Events are grouped into collision clusters (transitively overlapping runs),
 * then greedily assigned within each cluster to the first column whose prior occupant has ended. */
export function layoutTimedEventBlocks(events: CalendarEventDto[]): TimedBlockLayout[] {
  const items = events
    .map((event) => {
      const start = new Date(event.start);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const end = event.end ? new Date(event.end) : null;
      const rawEndMin = end ? end.getHours() * 60 + end.getMinutes() : startMin + DEFAULT_BLOCK_DURATION_MIN;
      const endMin = Math.min(24 * 60, Math.max(startMin + 15, rawEndMin));
      return { event, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const results: TimedBlockLayout[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  function flushCluster() {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    for (const item of cluster) {
      let col = columnEnds.findIndex((end) => end <= item.startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.endMin);
      } else {
        columnEnds[col] = item.endMin;
      }
      results.push({ event: item.event, startMin: item.startMin, endMin: item.endMin, col, totalCols: -1 });
    }
    const totalCols = columnEnds.length;
    for (let i = results.length - cluster.length; i < results.length; i++) results[i].totalCols = totalCols;
    cluster = [];
    clusterEnd = -1;
  }

  for (const item of items) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flushCluster();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flushCluster();

  return results;
}
