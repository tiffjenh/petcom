# Petcom — Project Summary for Context

This document gives a detailed summary of the Petcom project so that anyone (or an AI assistant) can get up to speed on what the app is, how it’s built, what’s implemented, and what we’re aiming for.

---

## 1. What Petcom Is

**Petcom** is an app that turns a user’s dog (and optionally their household) into the stars of a **personalized sitcom**. The product vision:

- **Daily episodes:** New ~5-minute sitcom episodes (or shorter “trailer” previews) centered on the dog’s personality and life.
- **Comedy style:** Episodes and trailers are written in the style of specific TV shows (The Office, Brooklyn Nine-Nine, Modern Family, Parks and Rec, Schitt’s Creek, Seinfeld, Community, etc.) with show-specific structure and tone.
- **Personalization:** Dog name, personality tags, character bio (quirks, obsessions like “steals food,” “mailman obsessed”), and optional custom detail drive the scripts. Past episodes are used to avoid repetition and to favor unused traits.
- **Visual style:** Users can choose **live action** (photorealistic, Marley & Me–style) or **3D cinematic** (Pixar/Zootopia-style) for trailers. Full episodes use animated avatars (generated from dog/human photos).
- **Shareability:** Watch episodes, share links, optional email/push when a new episode is ready.

So in one sentence: **Petcom reads the dog’s profile and comedy/show preferences, picks a fresh episode idea, writes a show-accurate script, and produces a video (trailer or full episode) that feels like “my dog’s own TV show.”**

---

## 2. Tech Stack & Repo Structure

- **Framework:** Next.js 15 (App Router).
- **Auth:** Clerk (sign-in, sign-up, user and session).
- **Database:** PostgreSQL via Supabase, with **Prisma** as the ORM.
- **Storage:** Supabase Storage for photos, avatars, and episode/trailer videos.
- **Background jobs:** **Inngest** for async episode generation, preview pipeline, and other events.
- **AI / media:**
  - **Claude (Anthropic)** for all script and “director” logic (trailer script, episode script, episode *idea* candidates).
  - **ElevenLabs** for voice/speech (narration and character dialogue).
  - **FAL** for image style transfer (dog photos → live action / cinematic CG style images) and optionally Kling for video clips in the preview pipeline.
  - **Replicate** (and similar) for avatar generation and scene clips where used.
- **Payments:** Stripe (subscription: free vs pro vs family).
- **Deploy:** Vercel; docs reference connecting GitHub, Clerk, Supabase, Vercel (see `docs/CONNECTING_SERVICES.md`).

Important code areas:

- **`prisma/schema.prisma`** — Data model (User, Household, Dog, CastMember, Episode, EpisodeSituation, PreviewGeneration, Subscription, etc.).
- **`src/lib/ai/trailer-script.ts`** — Trailer script generation: system prompt, SHOW_FORMULAS, comedy style descriptions, art-style suffixes, validation, retry.
- **`src/lib/ai/script.ts`** — Full **episode** script generation (dashboard flow): uses same SYSTEM_PROMPT and SHOW_FORMULAS, outputs EpisodeScriptJson (scenes with dialogue, thought bubbles).
- **`src/lib/episodeDirector.ts`** — “Director” for **episode ideas and scripts**: episode history, 3 candidate ideas, similarity scoring, chosen concept (plannedConcept), and script prompt that can be locked to that concept.
- **`src/lib/prompts/scriptPrompt.ts`** — Comedy style text blocks per show (for script.ts and episodeDirector).
- **`src/app/api/preview/*`** — Demo preview: upload photos, generate style images, generate trailer script, generate-from-style (creates PreviewGeneration job, triggers pipeline).
- **`src/app/api/episodes/generate/route.ts`** — Creates next episode: calls `getNextEpisodeConcept`, creates Episode with `plannedConcept`, returns `summary`.
- **`src/inngest/functions.ts`** — Inngest functions: `episode/generate` (full pipeline: script → scenes → audio → assembly → upload), preview pipeline, etc.
- **`src/app/demo/*`** — Demo/trailer flow UI (upload, style picker, comedy picker, generate trailer, result).

---

## 3. Data Model (Prisma) — Short Reference

- **User** — Clerk-linked; has Household, Subscription, push/notification prefs.
- **Household** — One per user. `showTitle`, `showStyle` (comedy show names, e.g. `["The Office", "Brooklyn Nine-Nine"]`), `comedyNotes`, `ownerName`. Has many Dogs, CastMembers, Episodes.
- **Dog** — Name, breed, `personality` (string[] tags, e.g. Chaotic, Dramatic, Foodie), `characterBio` (free-text quirks/obsessions), `photoUrl`, `animatedAvatar`, optional `loraId` (Astria), `voiceId` (ElevenLabs).
- **CastMember** — Humans: name, role (Owner, Partner, Kid, etc.), photo, avatar, voiceId.
- **Episode** — `title`, `episodeNum`, `season`, `synopsis`, `script` (JSON), `videoUrl`, `videoUrlLandscape`, `status` (generating | ready | failed), `plannedConcept` (JSON, optional — the chosen episode *idea* before the script is written).
- **EpisodeSituation** — One per episode. `category` (home | outdoor | social | seasonal | emotional), `situation`, `setting`, `plotDevice`, `tags`. Used for “episode history” so we don’t repeat themes and can compute similarity.
- **PreviewGeneration** — Demo flow: `jobId`, `dogName`, `photoUrls`, `styleImages`, `trailerScript`, `artStyle`, `selectedShows`, `trailerUrl`, `status`. No auth; rate-limited by IP.

---

## 4. Two Main Product Flows

### 4.1 Demo / Trailer Flow (no account)

1. User uploads 1–3 photos of their dog and enters the dog’s name.
2. **Generate styles:** Backend generates two style images (live action + cinematic CG) from the photos (FAL).
3. User picks **art style** (live action vs 3D cinematic) and **1–3 comedy shows** (e.g. The Office, Brooklyn Nine-Nine).
4. User clicks “Generate My Trailer.”
5. **Trailer script:** Frontend calls `POST /api/preview/generate-trailer-script` with dogName, artStyle, selectedShows (and optionally petPersonality, selectedTraits, selectedObsessions, customDetail — currently often empty in demo). Backend uses **trailer-script.ts**: shared **SYSTEM_PROMPT** (funny, accurate to dog, appropriate, show-accurate), **SHOW_FORMULAS** for the primary show, and builds a prompt that asks for a 30-second trailer with exactly 3 scenes (JSON: showTitle, tagline, openingSlate, endSlate, scenes with title, description, visualPrompt, comedyTechnique, mood, etc.). Script is validated (dog name, scene count, obsession references); on failure we retry once with the issues in the prompt.
6. **Trailer video:** Frontend sends that script + artStyle + selectedShows to `POST /api/preview/generate-from-style` with the chosen style image URL. Backend creates a **PreviewGeneration** row (stores trailerScript, artStyle, selectedShows) and triggers the **preview pipeline** (Inngest or equivalent). The pipeline uses `trailerScript.scenes` and **getArtStyleVideoSuffix(artStyle)** to build full video prompts per scene (e.g. Kling/FAL), assembles clips + narrator audio (from openingSlate/endSlate), uploads the final trailer to Supabase, and marks the job complete.
7. User polls for status and then watches the trailer; they can optionally sign up and “convert” to a full account.

So: **dog photos + name + art style + comedy shows → one cohesive trailer script → one 30s trailer video**, with show-accurate tone and structure and art-style-appropriate visuals.

### 4.2 Full Product / Episode Flow (logged-in user)

1. User has completed onboarding: household, dog(s) (name, personality, characterBio, photo), optional cast members, show title, comedy show style(s).
2. User (or a daily cron) requests a new episode, e.g. `POST /api/episodes/generate` with `householdId`.
3. **Episode idea selection (director):**
   - Backend calls **getNextEpisodeConcept(householdId)** in **episodeDirector.ts**.
   - Reads **dog profile** (personality, characterBio) and **episode history** (getEpisodeHistory → EpisodeSituation for that household).
   - **generateEpisodeCandidates** asks Claude for **3 candidate episode ideas** (title, situation, category, setting, plotDevice, tags, reason). The prompt encourages variety: e.g. one idea using an **unused trait/obsession**, one **seasonal** if relevant, one different category/setting. It uses the same situation bank and seasonal hints as the rest of the director.
   - For each candidate, **computeSimilarity(candidate, episodeHistory)** returns a score in [0, 1] (0 = not similar, 1 = very similar), based on same situation, same category, tag overlap, and plotDevice/situation word overlap with past episodes.
   - We pick the **first candidate with similarity ≤ 0.2**; if none, we pick the **lowest-similarity** one. The chosen concept is turned into a **PlannedConcept** (adds a human-readable **summary** explaining why it was chosen, e.g. “Chose ‘The Squirrel Situation’ because squirrel obsession hasn’t appeared yet, and it’s 80% fresh vs recent episodes.”).
4. **Save concept and create episode:** Backend creates an **Episode** with `title = concept.title`, `plannedConcept = concept` (includes summary), `episodeNum` / `season`, and triggers **episode/generate** (Inngest).
5. **Inngest episode pipeline:**
   - Loads household and **episode.plannedConcept**.
   - **generateEpisodeScript(householdId, { plannedConcept })** is called. When **plannedConcept** is present, **buildScriptPrompt** is given this concept and instructs Claude to write the **full script for that exact episode** (no “pick a situation” — we already chose it). The script follows the same comedy/show rules and structure (SHOW_FORMULAS are used in script.ts for the dashboard episode writer; episodeDirector has its own prompt that can include the mandatory concept block). Output is **DirectorScriptJson** (episodeTitle, synopsis, situation, category, setting, plotDevice, tags, scenes with dialogue and thought bubbles).
   - Script is saved to the episode; **saveEpisodeSituation** writes EpisodeSituation for future history.
   - Rest of pipeline: scene clips (avatars + Replicate or similar), **ElevenLabs** for per-character and narrator audio, **assembleFullEpisode** (e.g. ffmpeg), upload to Supabase, set episode status to ready, optional notifications.

So: **profile + history → 3 candidates → similarity check → one chosen idea saved as plannedConcept → one full script written to that idea → video + audio assembled and stored.** The API returns **episodeId** and **summary** so the client can show “Chose squirrel episode because ….”

---

## 5. Comedy & Show-Accurate Writing

We want episodes and trailers to feel **consistently funny, accurate to the dog, appropriate for all ages, and structurally true to the chosen show(s)**.

### 5.1 Shared system prompt (trailer + episode)

In **trailer-script.ts** we export **SYSTEM_PROMPT** used for both trailer and episode script generation. It establishes:

- **Funny first:** Every scene has a clear joke or premise; dog has agency; use specificity and subversion; avoid generic dog jokes.
- **Accurate to this dog:** Scenes must tie to personality/obsessions; use dog’s name; custom detail is high value.
- **Always appropriate:** Family-friendly, no dark or mean-spirited content; dog and humans are lovable; warm ending.
- **Show-accurate structure:** Follow the given show’s **episode structure formula** and required/forbidden elements, not just “tone.”

### 5.2 SHOW_FORMULAS (trailer-script.ts)

**SHOW_FORMULAS** is a big map (keyed by camelCase id: theOffice, brooklyn99, modernFamily, parksAndRec, schittsCreek, abbottElementary, seinfeld, curb, whatWeDoInShadows, community, itsSunny, newGirl, howIMetYourMother, arrestedDevelopment, friendsTv). Each entry has:

- **name** — Display name.
- **structureFormula** — Numbered list of structural steps (e.g. cold open, talking head, escalation, resolution, tag).
- **requiredElements** — “Must appear” (e.g. two talking heads, one awkward silence).
- **forbiddenElements** — “Never do” (e.g. dog being self-aware about chaos).
- **toneGuide** — Short character analogy (e.g. dog as Michael Scott, Leslie Knope).
- **exampleEpisodePremise** — One-line example using `{dogName}`.
- **coldOpenStyle**, **actBreakStyle**, **endingStyle** — Short descriptors.

Trailer script generation picks the **primary show** from the user’s selected list (e.g. first selected) and injects that show’s formula + required/forbidden + tone + example into the user prompt. Episode script generation in **script.ts** does the same for the dashboard “write full episode” flow. **episodeDirector** uses its own prompt but can be extended to reference these formulas when writing the script for a chosen concept.

### 5.3 Validation and retries

- **Trailer:** After Claude returns the trailer JSON, **validateScript(script, input)** checks: at least 3 scenes, dog name present, each selected obsession referenced (e.g. first word of obsession in script text). If invalid, we retry **once** with the list of issues appended to the prompt.
- **Episode ideas:** Similarity is used to avoid repeating recent themes; we don’t regenerate the full script multiple times when we already have a **plannedConcept** — we generate the script once for that concept.

---

## 6. Key Files and What They Do

| File | Purpose |
|------|--------|
| **src/lib/ai/trailer-script.ts** | SYSTEM_PROMPT, SHOW_FORMULAS, COMEDY_NAME_TO_ID, buildComedyStyleDescription, getArtStyleVideoSuffix, getPrimaryShowFormulaKey, validateScript, generateTrailerScript (with formula + validation + retry). |
| **src/lib/ai/script.ts** | Full episode script for dashboard: uses SYSTEM_PROMPT + SHOW_FORMULAS + getPrimaryShowFormulaKey, getComedyStyleBlock; outputs EpisodeScriptJson (scenes + dialogue). |
| **src/lib/episodeDirector.ts** | getEpisodeHistory, computeSimilarity, generateEpisodeCandidates, getNextEpisodeConcept; buildScriptPrompt (with optional plannedConcept); generateEpisodeScript(householdId, options?); saveEpisodeSituation. |
| **src/lib/prompts/scriptPrompt.ts** | COMEDY_SHOW_NAME_TO_ID, COMEDY_STYLE_INSTRUCTIONS per show, getComedyStyleBlock. |
| **src/app/api/preview/generate-trailer-script/route.ts** | POST: body = dogName, petPersonality, selectedTraits, selectedObsessions, customDetail, artStyle, selectedShows → returns { trailerScript }. |
| **src/app/api/preview/generate-from-style/route.ts** | POST: styleImageUrl, dogName, comedyStyle, trailerScript, artStyle, selectedShows → creates PreviewGeneration, sends to preview pipeline. |
| **src/app/api/episodes/generate/route.ts** | POST: householdId → getNextEpisodeConcept → create Episode with title + plannedConcept → Inngest episode/generate → return { episodeId, summary }. |
| **src/inngest/functions.ts** | episode/generate: fetch household + plannedConcept, generateEpisodeScript(householdId, { plannedConcept }), save script + situation, then scene clips, audio, assembly, upload. |
| **src/lib/preview-pipeline.ts** | Uses PreviewGeneration record: trailerScript + artStyle → getArtStyleVideoSuffix, per-scene fullPrompt → Kling/FAL clips, narrator audio, assemble, upload trailer. |

---

## 7. What We’re Trying To Do (Goals)

- **Trailers:** Use **all** user inputs (photos, art style, comedy shows, dog name, and when we have them: personality traits, obsessions, custom detail) to generate a **single, show-accurate, 30-second trailer** that feels personalized and structurally right for the chosen show(s). Visuals must match art style (live action vs 3D cinematic).
- **Episodes:** Use **dog profile + episode history** to propose **3 candidate ideas**, pick one that’s **fresh** (low similarity to recent episodes) and that favors **unused traits/obsessions** and **seasonal** ideas when appropriate. Save that as **plannedConcept**, then write **one full script** to that concept so we don’t “waste” scripts on ideas we throw away. Return a **summary** so the user sees why that episode was chosen.
- **Quality:** Scripts should be **funny**, **specific to the dog**, **appropriate**, and **show-accurate** (structure and tone from SHOW_FORMULAS and the shared SYSTEM_PROMPT). Validation and similarity checks keep trailers and episodes on-brand and non-repetitive.

---

## 8. Recent Work (What’s Been Done)

- **Trailer script and video use all inputs:**  
  - **TrailerInput** includes dogName, petPersonality, selectedTraits, selectedObsessions, customDetail, artStyle, selectedShows.  
  - **generateTrailerScript** uses a shared SYSTEM_PROMPT, SHOW_FORMULAS for the primary show, art-style and comedy-style descriptions, and a strict JSON spec for the 30s trailer.  
  - **validateScript** + one retry with issues.  
  - **getArtStyleVideoSuffix(artStyle)** used in the preview pipeline so each scene’s video prompt matches live action vs 3D cinematic.  
  - Demo flow: call generate-trailer-script then generate-from-style with trailerScript, artStyle, selectedShows; pipeline reads trailerScript + artStyle from the PreviewGeneration record.

- **Episode and trailer script quality:**  
  - SYSTEM_PROMPT and SHOW_FORMULAS (all 15 shows) added/expanded in **trailer-script.ts** with structure formulas, required/forbidden elements, tone guides, and example premises.  
  - **script.ts** (episode script) updated to use SYSTEM_PROMPT and the same formula block so episode scripts follow show structure.  
  - **modernFamily, newGirl, howIMetYourMother, arrestedDevelopment, itsSunny, friendsTv** show formulas added/updated with detailed structure and tone.

- **Episode idea selection (director):**  
  - **generateEpisodeCandidates** produces 3 ideas (title, situation, category, setting, plotDevice, tags, reason).  
  - **computeSimilarity** scores each idea against episode history; **getNextEpisodeConcept** picks first with similarity ≤ 0.2 or the best available, and returns **PlannedConcept** + **summary**.  
  - **Episode.plannedConcept** stores the chosen idea.  
  - **POST /api/episodes/generate** calls getNextEpisodeConcept, creates Episode with title + plannedConcept, triggers Inngest, returns **episodeId** and **summary**.  
  - **generateEpisodeScript** accepts optional **plannedConcept**; when present, **buildScriptPrompt** forces the script to that concept and we don’t retry for similarity. Inngest passes **episode.plannedConcept** into generateEpisodeScript.

---

## 9. How to Run and Deploy

- **Local:** `npm run dev` (from project root). App runs on port 2000 (or Next default).  
- **Env:** Clerk, Supabase (DATABASE_URL, storage), Anthropic, ElevenLabs, FAL, Stripe, etc. See `docs/CONNECTING_SERVICES.md` and any SETUP.md.  
- **DB:** `npx prisma db push` or `npx prisma migrate deploy`.  
- **Build:** `npm run build` to confirm TypeScript and build pass.

---

You can give this document (or a shortened version) to Claude or another collaborator so they’re aligned on what Petcom is, how the trailer and episode flows work, where the comedy/show logic lives, and what we’ve implemented recently (trailer + episode using all inputs, show formulas, episode idea selection with similarity and plannedConcept).
