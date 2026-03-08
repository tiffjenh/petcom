# V2 Roadmap — Design for Extensibility

This doc outlines **future V2 features** and how to **design the current codebase** so they can be added without large rewrites. **Nothing here is built yet.**

---

## 1. Live Events (Holiday / Special Episodes)

**Idea:** Special episodes auto-generated for Christmas, Halloween, dog’s birthday, etc.

### Extensibility design

| Layer | What to do now / later |
|-------|-------------------------|
| **Schema** | Add optional `Episode.eventType` (e.g. `"regular" \| "christmas" \| "halloween" \| "birthday"`) and `Episode.eventPayload` (Json) for event-specific data (e.g. `{ dogId, birthdayDate }`). Keep `episodeNum`/`season` as the main ordering; events can be a separate “special” stream or same season. |
| **Script prompt** | Make script generation **context-aware**: pass `eventType` and `eventPayload` into `generateScript()` so the prompt can add holiday/birthday themes. Keep a single `generateScript(params)` with an optional `eventContext`. |
| **Cron / triggers** | Add **event-driven triggers** alongside the existing daily cron: e.g. “Christmas week” cron that finds households and sends `episode/generate` with `eventType: "christmas"`. Dog birthday: either a daily job that checks `Dog` + user preference, or a scheduled job per invited birthday. Prefer **one event type per episode** so pipeline stays simple. |
| **Plans** | Event episodes can be gated by plan (e.g. Pro gets 2 live events/year) via `lib/plans.ts` (e.g. `maxLiveEventsPerYear`). |

### Suggested schema addition (when building)

```prisma
// Episode
eventType   String?   // "regular" | "christmas" | "halloween" | "birthday" | ...
eventPayload Json?    // { dogId?, date?, ... }
```

### Touchpoints

- `src/lib/ai/script.ts`: extend `generateScript()` with optional `eventType` / `eventPayload`.
- `src/inngest/functions.ts`: `generateEpisodeFunction` already takes `event.data`; add `eventType` (and optional payload) and pass through to script step.
- New Inngest functions: e.g. `live-event-christmas-cron`, `live-event-birthday-scheduler` (or a single `live-event/dispatch` that branches on event type).

---

## 2. Fan Reactions (Public show page)

**Idea:** Public show page where friends can watch and react (comments, emoji, etc.).

### Extensibility design

| Layer | What to do now / later |
|-------|-------------------------|
| **Schema** | Add `Household.publicSlug` (unique, optional) and `Household.showVisibility` (`"private" \| "unlisted" \| "public"`). Add `Reaction` (or `EpisodeReaction`) model: `episodeId`, `viewerId` (optional, for logged-in), `guestId` (optional, for anonymous), `type` (e.g. emoji/key), `createdAt`. Optional: `ShowView` for analytics. |
| **Auth** | Public page is **unauthenticated** for viewing; reactions can be anonymous (guestId/cookie) or require sign-in. Design so `viewerId` is optional on Reaction. |
| **API** | `GET /api/public/show/[slug]` (or `/show/[slug]`) for show + episode list; `GET /api/public/episodes/[id]` for one episode (if unlisted, require token). `POST /api/reactions` (episodeId, type). Keep routes under `/api/public/` or `/api/reactions/` so auth middleware can allow unauthenticated for public reads. |
| **Routing** | Use a **route group** that doesn’t require auth: e.g. `(public)/show/[slug]/page.tsx` so middleware excludes `/show/...` from Clerk redirect. |

### Suggested schema addition (when building)

```prisma
// Household
publicSlug      String?   @unique  // e.g. "life-with-biscuit"
showVisibility  String    @default("private")  // "private" | "unlisted" | "public"

model EpisodeReaction {
  id         String   @id @default(cuid())
  episodeId  String
  episode    Episode  @relation(...)
  userId     String?  // if logged in
  guestId    String?  // anonymous fingerprint/cookie
  type       String   // "emoji:heart" | "comment" | ...
  payload    Json?    // for comment text, etc.
  createdAt  DateTime @default(now())
}
// Episode: reactions EpisodeReaction[]
```

### Touchpoints

- Middleware: ensure `/show/[...]` (and optionally `/api/public/`) are public.
- Episode model: add optional `reactions` relation when adding Reaction table.
- Plan limits: e.g. `publicShowPage: boolean` in `lib/plans.ts` (Pro+ only if desired).

---

## 3. Guest Stars (Crossover episodes)

**Idea:** Invite friends to upload their dog for a crossover episode.

### Extensibility design

| Layer | What to do now / later |
|-------|-------------------------|
| **Schema** | Add `GuestStar` (or `CrossoverInvite`): `householdId` (host), `invitedEmail`, `token`, `status` (`pending` \| `accepted` \| `expired`), `guestDogId` (after accept), `expiresAt`. Optional: `GuestDog` (or reuse `Dog` with `householdId: null` and link to `GuestStar`) so guest data lives in one place. Simpler: guest uploads a **temporary** dog record linked to the invite; after episode is generated, you can keep or delete. |
| **Episode** | Add `Episode.guestStarIds` (String[], or a join table `EpisodeGuestStar`) so script/assembly know which characters are “guest” vs main cast. Script prompt already accepts “cast”; guest dogs are just additional characters with a “guest” tag. |
| **Flow** | Host creates “crossover” episode → backend creates `GuestStar` invite and sends email with magic link. Guest opens link, uploads dog photo/name (and optionally personality), submits → `GuestStar.guestDogId` set, status `accepted`. When host triggers generate, pipeline includes guest dog(s) in script and avatar generation. |

### Suggested schema addition (when building)

```prisma
model GuestStarInvite {
  id           String    @id @default(cuid())
  householdId  String
  household    Household @relation(...)
  episodeId   String?   // set when invite is tied to a specific episode
  episode     Episode?  @relation(...)
  invitedEmail String
  token       String    @unique
  status      String    // "pending" | "accepted" | "expired"
  guestDogId  String?   // Dog.id or GuestDog.id after accept
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
}

// Dog: optional householdId (null for guest?) or add GuestDog model with inviteId
// Episode: guestStarInvites GuestStarInvite[] or guestDogIds String[]
```

### Touchpoints

- `generateScript()`: already takes `dogs` and `castMembers`; add optional `guestDogs` (same shape) and prompt line “one of these is a guest star from another show.”
- Avatar generation: guest dog gets same Replicate/avatar pipeline; store avatar URL on the guest dog record.
- Invite flow: new routes `POST /api/crossover/invite`, `GET /api/crossover/accept?token=...`, `POST /api/crossover/accept` (submit guest dog).

---

## 4. Show Seasons (Season finale at 10)

**Idea:** After 10 episodes, auto-generate a “Season Finale” with higher production value.

### Extensibility design

| Layer | What to do now / later |
|-------|-------------------------|
| **Schema** | No strict change required. Use `Episode.season` and `episodeNum`; add optional `Episode.isSeasonFinale` (Boolean) and/or `Episode.specialProduction` (Json) for “higher production” flags (e.g. longer runtime, extra music, recap). |
| **Cron / trigger** | When daily (or weekly) cron creates the **next** episode, check: if `lastEpisode.episodeNum === 10`, create **two** episodes or a special “finale” episode (e.g. `episodeNum: 11`, `isSeasonFinale: true`). Alternatively: after saving episode 10, send a separate event `episode/generate` with `isSeasonFinale: true` and `seasonFinaleContext: { season, recapSummary }`. |
| **Script / assembly** | Extend `generateScript()` with optional `isSeasonFinale` and `seasonRecapSummary`; prompt asks for a “season finale” arc, callbacks, cliffhanger. Assembly can use a longer intro/outro or different template when `isSeasonFinale` is true (e.g. in `assembleFullEpisode`). |

### Suggested schema addition (when building)

```prisma
// Episode
isSeasonFinale Boolean @default(false)
specialProduction Json?  // optional: { extendedIntro, recapClipUrl, ... }
```

### Touchpoints

- `dailyEpisodeCron`: after computing `nextNum` and `season`, if `nextNum === 11` (or “we just finished 10”), create a finale episode and call `episode/generate` with `isSeasonFinale: true`.
- `generateScript()`: add `isSeasonFinale?: boolean` and `seasonRecapSummary?: string`; if true, add system prompt lines for finale tone/structure.
- `assembleFullEpisode()`: optional `isSeasonFinale` flag to switch to a different intro/outro or length.

---

## 5. Dog Personality AI (Learn from feedback)

**Idea:** App learns the dog’s personality over time from user feedback and refines writing.

### Extensibility design

| Layer | What to do now / later |
|-------|-------------------------|
| **Schema** | Add `Dog.learnedPersonality` (Json) or a separate `DogPersonalitySignal` table: `dogId`, `source` (`"feedback" \| "reaction" \| "edit"`), `signal` (Json), `createdAt`. Optionally `Dog.personalityVersion` (Int) so script prompt can use “latest learned summary.” Prefer **append-only signals** and a separate job (or on-demand) that compiles them into a short “personality summary” stored on `Dog` for the prompt. |
| **Script** | `generateScript()` already takes `dogs[].personality` (string[]). Extend to optional `dogs[].learnedSummary` (string) or merge personality tags with learned traits in one string. Keep the prompt flexible: “Personality: [tags]. Learned traits: [summary].” |
| **Feedback loop** | “Was this in character?” thumbs up/down or inline edits on script lines → store as signal. Periodic (e.g. weekly) or on-demand job: aggregate signals, call an LLM to summarize “refined personality,” write to `Dog.learnedPersonality` or `Dog.personalitySummary`. |

### Suggested schema addition (when building)

```prisma
// Dog
learnedPersonality Json?   // { summary?: string, traits?: string[], updatedAt?: string }
personalityVersion Int     @default(0)

model DogPersonalitySignal {
  id        String   @id @default(cuid())
  dogId     String
  dog       Dog      @relation(...)
  source    String   // "feedback" | "reaction" | "edit"
  payload   Json     // { type: "thumbs_up" | "edit", lineId?, text?, ... }
  createdAt DateTime @default(now())
}
```

### Touchpoints

- `src/lib/ai/script.ts`: add optional `learnedSummary` (or merged personality string) per dog.
- New API: `POST /api/feedback` (episodeId, lineId?, type, payload) → write to `DogPersonalitySignal` or similar.
- New Inngest (or cron): `personality/refine` for a dog/household, reads signals, produces summary, updates `Dog.learnedPersonality`.

---

## 6. iOS/Android App (React Native + push + share)

**Idea:** React Native wrapper with push notifications and native share sheet.

### Extensibility design

| Layer | What to do now / later |
|-------|-------------------------|
| **API** | Keep APIs **REST/JSON** and auth-agnostic where possible: same `GET /api/...` and `POST /api/...` work for web and app. Use **Bearer token** (e.g. Clerk session token or your own JWT) so the app can send the same auth header. Avoid web-only assumptions (cookies, redirects) in shared API routes. |
| **Push** | You already have **web push** (VAPID, `PushSubscription`). For native, add `PushSubscription.platform` (`"web" \| "ios" \| "android"`) and store **device token** (FCM/APNs) in the same or a sibling table. `notifyEpisodeReady()` can branch: web push for web subs, FCM/APNs for native. Alternatively, a small **push gateway** (e.g. Inngest step or Lambda) that forwards “episode ready” to FCM/APNs when `platform !== "web"`. |
| **Share** | Native share sheet: app calls `Share.share()` (React Native) with `url` and `message`; no backend change. Optional: deep link `pawcast://episode/[id]` so shared links open in app when installed. |
| **Code sharing** | Shared **business logic** (e.g. types, API client, plan limits) in a package or monorepo (e.g. `packages/api-types`, `packages/plans`) so web and RN both import. Keep UI and navigation in each app. |

### Suggested schema addition (when building)

```prisma
// PushSubscription (or new AppPushSubscription)
platform String  @default("web")  // "web" | "ios" | "android"
deviceToken String?  // FCM/APNs token for native
```

### Touchpoints

- `src/lib/notify.ts`: extend `notifyEpisodeReady()` to send to FCM/APNs when subscription has `platform !== "web"`.
- Auth: Clerk supports React Native; same `ClerkProvider` and token flow so API stays consistent.
- Deep links: document `NEXT_PUBLIC_APP_URL` and future `PAWCAST_APP_SCHEME` for `pawcast://`.

---

## Summary: Extensibility Checklist

- **Episode**: optional `eventType`/`eventPayload`, `isSeasonFinale`/`specialProduction`; keep `event.data` in Inngest flexible (add keys without breaking existing steps).
- **Household**: optional `publicSlug`/`showVisibility` for public show page.
- **Dog**: optional `learnedPersonality`/signals table for personality AI.
- **Script/assembly**: extend `generateScript()` and `assembleFullEpisode()` with **optional** params (event, finale, guest dogs, learned summary) so current behavior stays default.
- **Inngest**: add new events/functions (live events, season finale, personality refine); keep `episode/generate` as the single pipeline and pass new context via `event.data`.
- **API**: prefer REST with Bearer auth; keep public routes under a clear prefix (`/api/public/`, `/show/[...]`).
- **Push**: store platform and device token so one notify function can drive both web and native.

This keeps V1 stable while leaving clear extension points for V2.
