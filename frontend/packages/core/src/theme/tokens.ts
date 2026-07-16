/**
 * Design tokens lifted verbatim from the handoff (Chaos Coordinator.dc.html). This is the single
 * source of truth: web's Tailwind theme and styles/tokens.css are generated/derived from this
 * object, and a future React Native StyleSheet theme should read these same numbers instead of
 * re-deriving them from CSS.
 */

export const colors = {
  appBg: "#F1EDE4",
  /** Surrounds the app shell on viewports wider than its max-width (see frames.appMaxWidth) —
   * deliberately distinct from appBg so the extra space reads as an intentional frame rather than
   * an incomplete/broken layout. Matches the phone-frame bezel color from the design handoff. */
  pageBg: "#1C1A17",
  card: "#FFFFFF",
  ink: "#211D18",
  inkMuted: "#8B8478",
  inkFaint: "#B6AFA2",
  inkFainter: "#D8D2C4",
  border: "#ECE7DE",
  borderStrong: "#E4DFD3",
  chipBg: "#F2F0EA",
  link: "#4C8BF5",
  linkHover: "#3a72d1",

  // Household member avatar colors, from the design handoff's seeded people.
  member: {
    carmen: "#FF6B57",
    paul: "#4C8BF5",
    ben: "#1FB6A6",
    emma: "#F2A93B",
    tina: "#9B6BD9",
  },

  // Category tag colors (background/foreground pairs) and solid accents (calendar left-borders).
  category: {
    work: { bg: "#EAF1FE", fg: "#4C8BF5", accent: "#4C8BF5" },
    school: { bg: "#F2ECFB", fg: "#9B6BD9", accent: "#9B6BD9" },
    doctor: { bg: "#FDEBEF", fg: "#E8607A", accent: "#E8607A" },
    home: { bg: "#E7F8F6", fg: "#1B9A8C", accent: "#1FB6A6" },
    personal: { bg: "#FEF3E2", fg: "#C97F16", accent: "#F2A93B" },
    activities: { bg: "#FFEDE9", fg: "#E1543C", accent: "#FF6B57" },
  },

  status: {
    overdue: { bg: "#FDEBEF", fg: "#E1543C", border: "#F6C9C0" },
    dueSoon: { bg: "#FEF3E2", fg: "#C97F16" },
    paid: { bg: "#E7F8F6", fg: "#1B9A8C" },
    upcoming: { bg: "#ECE7DE", fg: "#8B8478" },
  },
} as const;

export const font = {
  family: "'Plus Jakarta Sans', sans-serif",
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 },
} as const;

export const radii = {
  pill: 100,
  card: 16,
  cardLg: 20,
  sm: 10,
  phoneScreen: 36,
  phoneFrame: 48,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** Fixed device frame sizes used by the design's phone/tablet mockups. */
export const frames = {
  phone: { width: 390, height: 844 },
  wallDashboard: { width: 1180, height: 820 },
  wallModal: { width: 520, height: 640 },
} as const;

/** The web app's shell grows fluidly with the viewport up to this width, then stays centered
 * with pageBg filling the margins either side. */
export const appMaxWidth = 1080;
