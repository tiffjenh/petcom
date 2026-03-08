# Pawcast project structure

This doc maps the **spec structure** (flat `app/`, `components/`, etc.) to the **actual codebase** (Next.js under `src/`).

---

## Spec → actual mapping

### App routes

| Spec path | Actual path | Notes |
|-----------|-------------|--------|
| `app/(marketing)/page.tsx` | `src/app/page.tsx` | Landing; marketing is implicit (no route group). |
| `app/(auth)/sign-in/page.tsx` | — | Auth is **Clerk**; redirects use `/sign-in`. Add `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` (and sign-up) if you want custom auth pages. |
| `app/(auth)/sign-up/page.tsx` | — | Same; optional custom sign-up page. |
| `app/onboarding/page.tsx` | `src/app/(dashboard)/onboarding/page.tsx` | Multi-step wizard; form in `onboarding-form.tsx`. |
| `app/dashboard/layout.tsx` | `src/app/(dashboard)/layout.tsx` | Layout wraps dashboard + onboarding. |
| `app/dashboard/page.tsx` | `src/app/(dashboard)/dashboard/page.tsx` | Home / today's episode. |
| `app/dashboard/episodes/[id]/page.tsx` | `src/app/(dashboard)/dashboard/episodes/[id]/page.tsx` | Episode player; includes `episode-share.tsx`, `episode-reactions.tsx`. |
| `app/dashboard/cast/page.tsx` | `src/app/(dashboard)/dashboard/cast/page.tsx` | Uses `cast-grid.tsx`. |
| `app/dashboard/settings/page.tsx` | `src/app/(dashboard)/dashboard/settings/page.tsx` | Uses `settings-form.tsx` (notification prefs, push). |
| `app/dashboard/account/page.tsx` | `src/app/(dashboard)/dashboard/account/page.tsx` | Account page. |
| — | `src/app/(dashboard)/dashboard/billing/page.tsx` | Billing (Stripe); not in spec. |
| — | `src/app/(dashboard)/dashboard/episodes/page.tsx` | Episodes list. |
| — | `src/app/(dashboard)/dashboard/episodes/new/page.tsx` | New episode / generate. |
| — | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` | Legal pages. |

### API routes

| Spec path | Actual path | Notes |
|-----------|-------------|--------|
| `api/households/route.ts` | — | Household is created/updated via **onboarding** and **settings**; no standalone households API. |
| `api/dogs/route.ts` | — | Dogs are part of household; create/update in **onboarding** and **cast** (dog CRUD under `api/cast/dog/[id]/route.ts`). |
| `api/cast/route.ts` | — | Cast members + dogs: `api/cast/member/[id]/route.ts`, `api/cast/dog/[id]/route.ts` (+ regenerate-avatar). |
| `api/episodes/route.ts` | — | Episodes fetched in server components / Inngest; generate via `api/episodes/generate/route.ts`. |
| `api/avatars/generate/route.ts` | — | Avatar generation is Inngest + `api/cast/.../regenerate-avatar/route.ts`; no single “avatars/generate” route. |
| `api/episodes/generate/route.ts` | `src/app/api/episodes/generate/route.ts` | Triggers Inngest episode pipeline. |
| `api/share/tiktok/route.ts` | — | Not implemented. |
| `api/share/instagram/route.ts` | — | Not implemented. |
| `api/webhooks/stripe/route.ts` | `src/app/api/webhooks/stripe/route.ts` | Stripe webhooks. |
| `api/webhooks/inngest/route.ts` | `src/app/api/inngest/route.ts` | Inngest serve (GET/POST/PUT). |
| — | `src/app/api/onboarding/route.ts` | Submit onboarding (household, dogs, cast). |
| — | `src/app/api/settings/route.ts` | Household + user notification settings. |
| — | `src/app/api/push/subscribe/route.ts` | Web push subscription. |
| — | `src/app/api/upload/route.ts` | Upload (e.g. photos). |

### Components

| Spec path | Actual path | Notes |
|-----------|-------------|--------|
| `components/onboarding/StepShowName.tsx` | In `onboarding-form.tsx` | Single wizard component with internal steps (show name, comedy style, dogs, cast, generating, complete). |
| `components/onboarding/StepComedyStyle.tsx` | In `onboarding-form.tsx` | TV show picker grid. |
| `components/onboarding/StepAddDogs.tsx` | In `onboarding-form.tsx` | Add dogs step. |
| `components/onboarding/StepAddCast.tsx` | In `onboarding-form.tsx` | Add cast step. |
| `components/onboarding/StepGeneratingAvatars.tsx` | In `onboarding-form.tsx` | Generating avatars step. |
| `components/onboarding/StepComplete.tsx` | In `onboarding-form.tsx` | Complete step. |
| `components/dashboard/EpisodeCard.tsx` | — | Episode list uses inline or page-level layout; can extract to `EpisodeCard.tsx` if desired. |
| `components/dashboard/EpisodePlayer.tsx` | In `dashboard/episodes/[id]/page.tsx` | Player UI in episode page. |
| `components/dashboard/ShareBar.tsx` | `src/app/(dashboard)/dashboard/episodes/[id]/episode-share.tsx` | Share bar for episode. |
| `components/dashboard/CastGrid.tsx` | `src/app/(dashboard)/dashboard/cast/cast-grid.tsx` | Cast grid. |
| `components/dashboard/Sidebar.tsx` | — | Sidebar likely in `(dashboard)/layout.tsx`; can extract to `components/dashboard/Sidebar.tsx`. |
| `components/ui/*` | `src/components/ui/*` | shadcn (button, card, dialog, etc.). |
| `components/shared/PhotoUpload.tsx` | — | Upload may be inline in onboarding; can extract. |
| `components/shared/AvatarCard.tsx` | — | Avatar display may be inline; can extract. |
| `components/shared/PlanGate.tsx` | — | `src/lib/plans.ts` + usage; can wrap as `PlanGate` component. |
| — | `src/components/push-subscribe-button.tsx` | Push subscribe for settings. |
| — | `src/components/episode-realtime-subscriber.tsx` | Realtime episode updates. |

### Inngest

| Spec path | Actual path | Notes |
|-----------|-------------|--------|
| `inngest/generateDailyEpisodes.ts` | `src/inngest/functions.ts` | Exported as `dailyEpisodeCron` (cron). |
| `inngest/generateSingleEpisode.ts` | `src/inngest/functions.ts` | Exported as `generateEpisodeFunction`. |
| — | `src/inngest/functions.ts` | Also: `generateAvatarsFunction`, `onboardingSequenceCron` (Day 3 / Day 7 emails). |
| `inngest/client.ts` | `src/inngest/client.ts` | Inngest client. |

### Lib

| Spec path | Actual path | Notes |
|-----------|-------------|--------|
| `lib/claude.ts` | `src/lib/ai/script.ts` (and related) | Script/Claude logic in `lib/ai/`. |
| `lib/replicate.ts` | `src/lib/ai/replicate.ts` | Replicate client. |
| `lib/elevenlabs.ts` | `src/lib/ai/elevenlabs.ts` | ElevenLabs client. |
| `lib/ffmpeg.ts` | `src/lib/ai/ffmpeg.ts` + `ffmpeg-assembly.ts` | FFmpeg helpers. |
| `lib/stripe.ts` | `src/lib/stripe.ts` | Stripe. |
| `lib/supabase.ts` | `src/lib/supabase.ts` | Supabase. |
| `lib/prompts/scriptPrompt.ts` | In `src/lib/ai/script.ts` or prompts inline | Script prompts. |
| `lib/prompts/avatarPrompt.ts` | `src/lib/ai/avatar.ts` | Avatar prompts. |
| — | `src/lib/notify.ts` | Resend + web push (episode ready, onboarding emails). |
| — | `src/lib/plans.ts`, `src/lib/avatar-limits.ts` | Plans and avatar limits. |
| — | `src/lib/prisma.ts`, `src/lib/clerk-user.ts` | DB and auth helpers. |

### Prisma & env

| Spec | Actual |
|------|--------|
| `prisma/schema.prisma` | `prisma/schema.prisma` | Same. |
| `.env.local (template)` | `.env.example` | Full template in `.env.example` (Clerk, DB, Supabase, Anthropic, Replicate, ElevenLabs, Stripe, Resend, VAPID, Inngest). |

---

## Optional additions to match spec

1. **Auth pages**  
   Add `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` and `sign-up/[[...sign-up]]/page.tsx` that render Clerk’s `<SignIn />` / `<SignUp />` if you want custom-styled auth routes.

2. **Share APIs**  
   Add `src/app/api/share/tiktok/route.ts` and `src/app/api/share/instagram/route.ts` when you implement TikTok/Instagram share (e.g. deep links or upload helpers).

3. **Standalone API routes**  
   Add `api/households/route.ts` or `api/dogs/route.ts` only if you need direct REST access; currently household/dogs are managed via onboarding and settings.

4. **Extract components**  
   Extract `EpisodeCard`, `Sidebar`, `PhotoUpload`, `AvatarCard`, `PlanGate` from existing pages if you want the exact spec layout.

---

## Quick reference: where things live

- **Landing:** `src/app/page.tsx`
- **Onboarding wizard:** `src/app/(dashboard)/onboarding/page.tsx` + `onboarding-form.tsx`
- **Dashboard home:** `src/app/(dashboard)/dashboard/page.tsx`
- **Episode player:** `src/app/(dashboard)/dashboard/episodes/[id]/page.tsx`
- **Episode generate:** `src/app/api/episodes/generate/route.ts` → Inngest
- **Notifications:** `src/lib/notify.ts`; settings in `dashboard/settings/settings-form.tsx`; push subscribe in `api/push/subscribe/route.ts`
- **Inngest:** `src/inngest/functions.ts`; serve at `src/app/api/inngest/route.ts`
