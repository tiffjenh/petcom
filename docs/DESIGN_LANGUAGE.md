# Design Language

**Vibe:** Warm, playful, premium — Pixar meets a cozy streaming app.

## Color Palette

| Name   | Hex       | Usage |
|--------|-----------|--------|
| Cream  | `#FFF8F0` | Backgrounds, light surfaces |
| Amber  | `#F4A335` | Primary (CTAs, brand, logo) |
| Navy   | `#1A2744` | Foreground text, dark mode base |
| Coral  | `#FF6B6B` | Accent, destructive, highlights |

These map to shadcn CSS variables in `src/app/globals.css` and to Tailwind tokens `cream`, `amber`, `navy`, `coral` in `tailwind.config.ts`.

## Typography

- **Headings:** Fredoka (rounded, friendly) — `font-heading` or `var(--font-heading)`
- **Body:** Inter — `font-body` or `var(--font-body)`

Loaded via `next/font/google` in `src/app/layout.tsx`.

## Motion

- **Spring on cards:** `animate-spring-in` (subtle scale + fade). Use on episode cards, modals.
- **Confetti:** One-time burst when an episode is ready (`EpisodeReadyConfetti` on episode page).
- **Smooth transitions:** Rely on `tailwindcss-animate` and `transition-*` for hover/state.

Keyframes and animation utilities are defined in `tailwind.config.ts` (`spring-in`, `spring-out`, `confetti`).

## Logo

**PawCastLogo** (`src/components/shared/PawCastLogo.tsx`): Stylized dog silhouette inside a film clapperboard. Uses `--primary` and `--primary-foreground`. Optional wordmark “PawCast” with `font-heading`.

## Components

- **Base:** shadcn/ui, customized via the palette above (CSS variables in `:root` and `.dark`).
- **Radius:** `--radius: 0.875rem` for a soft, friendly feel.
- Use `animate-spring-in` on list/grid cards where appropriate (e.g. episode list).
