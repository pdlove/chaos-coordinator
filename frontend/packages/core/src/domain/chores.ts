export function isGroupOverdue(doneByTime: string, hasIncomplete: boolean, now: Date = new Date()): boolean {
  if (!hasIncomplete) return false;
  const [h, m] = doneByTime.split(":").map(Number);
  const doneBy = new Date(now);
  doneBy.setHours(h, m, 0, 0);
  return now.getTime() > doneBy.getTime();
}

export function formatDoneByTime(doneByTime: string): string {
  const [h, m] = doneByTime.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
