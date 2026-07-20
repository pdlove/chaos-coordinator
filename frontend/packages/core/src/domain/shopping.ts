/** An item whose name is fully capitalized (and has at least one letter, so plain numbers/symbols
 * don't accidentally qualify) renders as a section-header divider instead of a checkable item —
 * a quick manual way to break up a list without touching the Department field, e.g. typing
 * "PRODUCE" as its own entry. */
export function isGroupHeader(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
}
