# How to generate a new episode

## From the UI

1. **Studio (recommended)**  
   Go to **My Studio** → `/studio/[householdId]` (e.g. `/studio/cmmjrs7aj00027qwnj5eodrp6`).  
   Click **Generate episode** at the top of the Episodes section.  
   You must be signed in and the household must belong to your user.

2. **Dashboard → Episodes**  
   Go to **Dashboard** → **Episodes** → **New episode** (`/dashboard/episodes/new`).  
   Click **Generate episode**.  
   Uses your default household.

After clicking, the app creates an episode record, queues an Inngest `episode/generate` job, and redirects you to the episode page. Generation runs in the background (script → scenes → audio → assembly → upload).

## Via API (e.g. curl)

You must be authenticated (session cookie or Clerk token).

```bash
# Replace HOUSEHOLD_ID with your household id (e.g. cmmjrs7aj00027qwnj5eodrp6)
# Use the same origin and cookies as your logged-in browser session

curl -X POST "http://localhost:2000/api/episodes/generate" \
  -H "Content-Type: application/json" \
  -d '{"householdId":"HOUSEHOLD_ID"}' \
  --cookie "your-session-cookies-here"
```

Optional body fields:

- `episodeNum` – default: next number after last episode
- `season` – default: same as last episode (or 1)

Response: `{ "episodeId": "...", "summary": "..." }` on success.

## Inngest (direct event)

If you need to trigger from a script or admin tool with no user session, you can create the episode in the DB and send the Inngest event yourself (e.g. from a one-off script that uses the same Prisma + Inngest setup as the app). The `episode/generate` handler expects:

- `episodeId` – existing Episode id (status can be `generating`)
- `householdId` – that episode’s household
- `episodeNum`, `season` – optional, for payload

The normal flow is: create Episode (with `plannedConcept` from `getNextEpisodeConcept`), then `inngest.send({ name: "episode/generate", data: { episodeId, householdId, episodeNum, season } })`.
