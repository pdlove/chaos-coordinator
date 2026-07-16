import type { Config } from "tailwindcss";
import { colors, radii } from "../core/src/theme/tokens";

// Derived from packages/core/src/theme/tokens.ts — the single source of truth for design values,
// shared with a future React Native StyleSheet theme. Don't hand-edit color/radius values here;
// change tokens.ts instead.
export default {
  content: ["./index.html", "./wall.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: colors.appBg,
        card: colors.card,
        ink: colors.ink,
        "ink-muted": colors.inkMuted,
        "ink-faint": colors.inkFaint,
        "ink-fainter": colors.inkFainter,
        border: colors.border,
        "border-strong": colors.borderStrong,
        chip: colors.chipBg,
        cat: {
          work: colors.category.work.accent,
          school: colors.category.school.accent,
          doctor: colors.category.doctor.accent,
          home: colors.category.home.accent,
          personal: colors.category.personal.accent,
          activities: colors.category.activities.accent,
        },
      },
      borderRadius: {
        card: `${radii.card}px`,
        "card-lg": `${radii.cardLg}px`,
        "phone-screen": `${radii.phoneScreen}px`,
        "phone-frame": `${radii.phoneFrame}px`,
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
