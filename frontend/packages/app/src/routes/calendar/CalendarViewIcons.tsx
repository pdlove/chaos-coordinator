/** Icons for the Agenda/Day/Week/Month view switcher — same hand-drawn SVG style as BottomNav's
 * tab icons (stroke uses currentColor so they inherit the toggle's active/inactive tint). */

export function AgendaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <circle cx="4" cy="5.5" r="1.2" fill="currentColor" />
      <path d="M7.3 5.5h9.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="4" cy="10" r="1.2" fill="currentColor" />
      <path d="M7.3 10h9.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="4" cy="14.5" r="1.2" fill="currentColor" />
      <path d="M7.3 14.5h9.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function DayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 8h7M6.5 11.5h7M6.5 15h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function WeekIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.7 3v14M12.3 3v14" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function MonthIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <rect x="2.5" y="3.5" width="15" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 7.7h15" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 2v2.4M13 2v2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M6.5 11h1.4M9.3 11h1.4M12.1 11h1.4M6.5 14h1.4M9.3 14h1.4M12.1 14h1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
