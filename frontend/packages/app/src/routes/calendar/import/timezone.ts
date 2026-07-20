/** Timezone helpers for the photo-import flow. The vision model only ever reads wall-clock digits
 * off a photo/pasted text — it has no idea what zone they're in — so this flow needs its own
 * "interpret these digits in zone X" conversion instead of the rest of the app's usual assumption
 * that a `Date`'s wall-clock components are the browser's own local zone. */

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function listTimeZones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") return Intl.supportedValuesOf("timeZone");
  return [getBrowserTimeZone()];
}

function partsOf(date: Date, timeZone: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => formatted.find((p) => p.type === type)!.value;
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** What date/time an ISO instant reads as on a wall clock in `timeZone`. */
export function isoToZonedParts(iso: string, timeZone: string): { date: string; time: string } {
  const p = partsOf(new Date(iso), timeZone);
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** The UTC instant a wall clock in `timeZone` reads `date`/`time` at. */
export function zonedPartsToIso(date: string, time: string, timeZone: string): string {
  const naiveUtcMs = new Date(`${date}T${time || "00:00"}:00Z`).getTime();
  // That instant, reformatted as a wall clock in `timeZone`, tells us how far off our naive
  // "treat the digits as UTC" guess was — nudge by exactly that much to land on the real instant.
  const p = partsOf(new Date(naiveUtcMs), timeZone);
  const asIfUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return new Date(naiveUtcMs + (naiveUtcMs - asIfUtc)).toISOString();
}
