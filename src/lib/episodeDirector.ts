import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import type { EpisodeScriptJson, ScriptScene } from "@/lib/ai/script";
import { getComedyStyleBlock } from "@/lib/prompts/scriptPrompt";

export type EpisodeHistoryEntry = {
  situation: string;
  setting: string;
  plotDevice: string;
  tags: string[];
  category?: string;
};

/** One candidate episode idea (no full script yet). */
export type EpisodeCandidate = {
  title: string;
  situation: string;
  category: string;
  setting: string;
  plotDevice: string;
  tags: string[];
  reason: string; // e.g. "unused trait: squirrel obsession", "seasonal: holiday guests"
};

/** Chosen concept saved to Episode.plannedConcept and used when writing the script. */
export type PlannedConcept = EpisodeCandidate & {
  summary: string; // human-readable why this was chosen, for API response
};

/** Script returned by the director; extends EpisodeScriptJson with situation metadata. */
export type DirectorScriptJson = EpisodeScriptJson & {
  situation: string;
  category: string;
  setting: string;
  plotDevice: string;
  tags: string[];
};

export type HouseholdForDirector = {
  showTitle: string;
  showStyle: string[];
  comedyNotes: string | null;
  ownerName: string | null;
  dogs: { name: string; breed: string | null; personality: string[]; characterBio: string | null }[];
  castMembers: { name: string; role: string }[];
};

const CATEGORIES = ["home", "outdoor", "social", "seasonal", "emotional"] as const;

/** Query all previous EpisodeSituation records for this household (newest first for "last N" rules). */
export async function getEpisodeHistory(
  householdId: string
): Promise<EpisodeHistoryEntry[]> {
  const situations = await prisma.episodeSituation.findMany({
    where: { episode: { householdId } },
    orderBy: { episode: { episodeNum: "desc" } },
    select: {
      situation: true,
      setting: true,
      plotDevice: true,
      tags: true,
      category: true,
    },
  });
  return situations.map((s) => ({
    situation: s.situation,
    setting: s.setting,
    plotDevice: s.plotDevice,
    tags: s.tags,
    category: s.category,
  }));
}

/** Similarity of a candidate to past episodes. 0 = not similar, 1 = very similar. Proceed when <= 0.2. */
export function computeSimilarity(
  candidate: EpisodeCandidate,
  episodeHistory: EpisodeHistoryEntry[]
): number {
  if (episodeHistory.length === 0) return 0;
  const candTags = new Set((candidate.tags || []).map((t) => t.toLowerCase()));
  const candWords = new Set(
    (candidate.plotDevice + " " + candidate.situation)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  let maxScore = 0;
  for (const prev of episodeHistory) {
    if (prev.situation === candidate.situation) return 1;
    let score = 0;
    if (prev.category && prev.category === candidate.category) score += 0.25;
    const prevTags = new Set((prev.tags || []).map((t) => t.toLowerCase()));
    const tagOverlap = [...candTags].filter((t) => prevTags.has(t)).length;
    score += Math.min(0.4, tagOverlap * 0.15);
    const prevWords = new Set(
      (prev.plotDevice + " " + prev.situation)
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
    const wordOverlap = [...candWords].filter((w) => prevWords.has(w)).length;
    score += Math.min(0.35, (wordOverlap / Math.max(1, candWords.size)) * 2);
    if (score > maxScore) maxScore = score;
  }
  return Math.min(1, maxScore);
}

const SITUATION_BANK_SHORT = `
HOME: morning routine, bath time, vacuum panic, doorbell chaos, package delivery, window squirrel, counter surfing, stealing laundry, hiding spots, new furniture, remote theft, trash raid, toilet paper...
OUTDOORS: walk detour, dog park, car ride anxiety, vet visit, pet store, puddle jumping, squirrel chase, mailman standoff, neighbor dog rivalry...
SOCIAL: zoom interruption, dinner party, baby visitor, other dog guest, cat encounter, pizza delivery...
SEASONAL: Halloween costume, Christmas tree, Thanksgiving smells, summer heat, first snow, fireworks, spring mud...
EMOTIONAL: owner leaving guilt, welcome home, new pet jealousy, favorite toy gone, dream sequence, favorite human...
`;

/** Generate 3 candidate episode ideas (no full script). Uses dog profile + episode history to favor unused traits and variety. */
export async function generateEpisodeCandidates(
  household: HouseholdForDirector,
  episodeHistory: EpisodeHistoryEntry[],
  episodeNumber: number
): Promise<EpisodeCandidate[]> {
  const dog = household.dogs[0];
  const dogLine = dog
    ? `${dog.name}: personality ${(dog.personality || []).join(", ")}; character bio: ${dog.characterBio || "none"}`
    : "Main dog";
  const previousBlock =
    episodeHistory.length === 0
      ? "No previous episodes yet."
      : episodeHistory
          .slice(0, 10)
          .map(
            (e) =>
              `- ${e.plotDevice} (${e.setting}, ${e.category ?? "unknown"}, tags: ${(e.tags || []).join(", ")})`
          )
          .join("\n");
  const seasonalHint = getSeasonalHint();
  const system = `You are the head writer of a pet sitcom. Your job is to propose 3 different episode IDEAS (concepts only — no script).

DOG PROFILE:
${dogLine}

PREVIOUS EPISODES (do not repeat these themes too closely):
${previousBlock}
${seasonalHint ? `\nSEASONAL: ${seasonalHint}\n` : ""}

RULES:
1. Propose exactly 3 candidates. Vary them: e.g. one using an UNUSED trait/obsession from the dog profile, one SEASONAL if relevant, one different category/setting.
2. Each candidate must have: title (short, funny), situation (snake_case), category (home|outdoor|social|seasonal|emotional), setting, plotDevice (one sentence), tags (string array), reason (one short sentence why this idea — e.g. "unused trait: squirrel obsession" or "seasonal: holiday guests").
3. Draw from this situation bank: ${SITUATION_BANK_SHORT}
4. Return ONLY valid JSON array of 3 objects, no markdown: [ { "title": "...", "situation": "...", "category": "...", "setting": "...", "plotDevice": "...", "tags": [...], "reason": "..." }, ... ]`;

  const user = `Propose 3 episode ideas for Episode ${episodeNumber} of "${household.showTitle}". Return ONLY the JSON array.`;

  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: user }],
  });
  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text in response");
  let raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (jsonMatch) raw = jsonMatch[0];
  const parsed = JSON.parse(raw) as EpisodeCandidate[];
  if (!Array.isArray(parsed) || parsed.length < 3) throw new Error("Expected 3 candidates");
  return parsed.slice(0, 3).map((c) => ({
    title: String(c.title ?? "Episode"),
    situation: String(c.situation ?? "unknown"),
    category: String(c.category ?? "home"),
    setting: String(c.setting ?? "living room"),
    plotDevice: String(c.plotDevice ?? ""),
    tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
    reason: String(c.reason ?? ""),
  }));
}

/** Pick next episode concept: 3 candidates, similarity check, return chosen concept + summary. */
export async function getNextEpisodeConcept(
  householdId: string
): Promise<{ concept: PlannedConcept; summary: string }> {
  const household = await getHouseholdForDirector(householdId);
  if (!household) throw new Error("Household not found");
  const episodeHistory = await getEpisodeHistory(householdId);
  const episodeNumber = episodeHistory.length + 1;

  const candidates = await generateEpisodeCandidates(
    household,
    episodeHistory,
    episodeNumber
  );

  const SIMILARITY_THRESHOLD = 0.2;
  const withScore = candidates.map((c) => ({
    candidate: c,
    similarity: computeSimilarity(c, episodeHistory),
  }));
  const passed = withScore.filter((w) => w.similarity <= SIMILARITY_THRESHOLD);
  const chosen = passed[0] ?? withScore.sort((a, b) => a.similarity - b.similarity)[0];
  const concept: PlannedConcept = {
    ...chosen.candidate,
    summary: chosen.similarity <= SIMILARITY_THRESHOLD
      ? `Chose "${chosen.candidate.title}" because ${chosen.candidate.reason}, and it's sufficiently different from recent episodes (${Math.round((1 - chosen.similarity) * 100)}% fresh).`
      : `Chose "${chosen.candidate.title}" (${chosen.candidate.reason}). Best available option; ${Math.round((1 - chosen.similarity) * 100)}% different from recent episodes.`,
  };
  return { concept, summary: concept.summary };
}

const SITUATION_BANK = `
HOME: morning routine, bath time, vacuum cleaner panic, doorbell chaos, package delivery, window squirrel, counter surfing, stealing laundry, hiding spots, new furniture confusion, remote control theft, trash can raid, toilet paper destruction...

OUTDOORS: walk detour, dog park drama, car ride anxiety, vet visit dread, pet store overwhelm, puddle jumping, squirrel chase, mailman standoff, neighbor dog rivalry...

SOCIAL: zoom call interruption, dinner party chaos, baby visitor, other dog guest, cat encounter, owner's friend who's scared of dogs, pizza delivery...

SEASONAL: Halloween costume protest, Christmas tree investigation, Thanksgiving smell torture, summer heat struggles, first snow confusion, fireworks fear, spring mud discovery...

EMOTIONAL: owner leaving guilt trip, heroic welcome home, new pet sibling jealousy, favorite toy disappearance, dream sequence, imagining owner's day, deciding who the favorite human is...`;

function getSeasonalHint(): string | null {
  const month = new Date().getMonth();
  const hints: Record<number, string> = {
    9: "October — Halloween approaching, costumes are relevant",
    10: "November — Thanksgiving, food smells everywhere",
    11: "December — Christmas, tree and decorations chaos",
    0: "January — New Year, owner resolutions the dog ignores",
    1: "February — Valentine's Day, owner distracted",
    6: "July — Summer heat, outdoor adventures",
  };
  return hints[month] ?? null;
}

/** Build the full Claude system + user prompt for the episode writer. */
export function buildScriptPrompt(
  household: HouseholdForDirector,
  episodeHistory: EpisodeHistoryEntry[],
  episodeNumber: number,
  plannedConcept?: PlannedConcept
): { system: string; user: string } {
  const selectedShows =
    household.showStyle?.length > 0
      ? household.showStyle.join(", ")
      : "The Office, Brooklyn Nine-Nine";
  const comedyStyleBlock = getComedyStyleBlock(household.showStyle ?? []);
  const dog = household.dogs[0];
  const dogLine = dog
    ? `${dog.name}, a ${dog.breed || "dog"} with personality: ${(dog.personality?.length ? dog.personality : ["friendly"]).join(", ")}`
    : "Main character (dog)";
  const castList =
    household.castMembers
      ?.map((c) => `${c.name} (${c.role})`)
      .join(", ") || "None";
  const previousBlock =
    episodeHistory.length === 0
      ? "No previous episodes yet. This is the first one — make it memorable!"
      : episodeHistory
          .map(
            (e) =>
              `- "${e.plotDevice}" (setting: ${e.setting}, category: ${e.category ?? "unknown"}, tags: ${(e.tags || []).join(", ")})`
          )
          .join("\n");

  const lastThreeCategories = episodeHistory
    .slice(0, 3)
    .map((e) => e.category)
    .filter(Boolean)
    .join(", ");
  const lastSetting = episodeHistory[0]?.setting ?? null;

  let seasonalSection = "";
  const hint = getSeasonalHint();
  if (hint) {
    seasonalSection = `\nSEASONAL CONTEXT: ${hint} — consider incorporating this naturally if it fits.\n`;
  }

  const system = `You are the head writer of a personalized animated pet sitcom. Your job is to write a fresh, funny, original episode script every time.

SHOW DETAILS:
- Show name: ${household.showTitle}
- Comedy style inspired by: ${selectedShows}
- Main character: ${dogLine}
- Supporting cast: ${castList}
- Episode number: ${episodeNumber}
${household.comedyNotes?.trim() ? `- Vibe notes: ${household.comedyNotes}` : ""}
${household.ownerName?.trim() ? `- Primary co-star (owner): ${household.ownerName}` : ""}
${comedyStyleBlock ? `\n${comedyStyleBlock}\n` : ""}

PREVIOUS EPISODES (DO NOT REPEAT THESE):
${previousBlock}

RULES:
1. Pick a situation from a DIFFERENT category than the last 3 episodes${lastThreeCategories ? ` (recent categories: ${lastThreeCategories})` : ""}.
2. Never reuse the same setting two episodes in a row${lastSetting ? ` (last setting was: ${lastSetting})` : ""}.
3. The dog never speaks out loud — inner monologue only as thought bubbles.
4. Comedy style inspired by: ${selectedShows}.${comedyStyleBlock ? " Follow the COMEDY STYLE INSTRUCTIONS in SHOW DETAILS above." : ""}
5. 3-act structure: Setup (30s) → Escalation (45s) → Punchline (15s) for a 90-second trailer.
6. End on an ironic or unexpected punchline.
7. Draw from this situation bank but be creative:
${SITUATION_BANK}
${seasonalSection}
${plannedConcept ? `
MANDATORY — YOU MUST WRITE THE SCRIPT FOR THIS EXACT EPISODE CONCEPT (do not change title, situation, or plot):
- Title: ${plannedConcept.title}
- Situation: ${plannedConcept.situation}
- Category: ${plannedConcept.category}
- Setting: ${plannedConcept.setting}
- Plot device: ${plannedConcept.plotDevice}
- Tags: ${(plannedConcept.tags || []).join(", ")}
` : ""}

OUTPUT: Return ONLY valid JSON, no markdown or code fences. Use this exact structure:
{
  "episodeTitle": "string",
  "synopsis": "string (2 sentences max)",
  "situation": "snake_case_situation_key",
  "category": "home|outdoor|social|seasonal|emotional",
  "setting": "string",
  "plotDevice": "string (one sentence)",
  "tags": ["string"],
  "scenes": [
    {
      "sceneNumber": 1,
      "setting": "string",
      "type": "normal|confessional|montage|inner_monologue",
      "characters": ["string"],
      "action": "string",
      "dialogue": [
        {
          "character": "string",
          "line": "string",
          "isThoughtBubble": boolean
        }
      ]
    }
  ]
}`;

  const user = plannedConcept
    ? `Write the full script for Episode ${episodeNumber} of "${household.showTitle}" using EXACTLY this concept: "${plannedConcept.title}" — ${plannedConcept.plotDevice}. Return ONLY the JSON object, no other text.`
    : `Write Episode ${episodeNumber} for "${household.showTitle}". Return ONLY the JSON object, no other text.`;

  return { system, user };
}

/** Compare new episode to history. Returns true if too similar (should retry). */
export function checkSimilarity(
  newEpisode: DirectorScriptJson,
  episodeHistory: EpisodeHistoryEntry[]
): boolean {
  const last10 = episodeHistory.slice(0, 10);
  for (const prev of last10) {
    if (prev.situation === newEpisode.situation) return true;
  }
  const mostRecent = episodeHistory[0];
  if (!mostRecent?.tags?.length) return false;
  const newTags = new Set((newEpisode.tags || []).map((t) => t.toLowerCase()));
  const overlap = mostRecent.tags.filter((t) =>
    newTags.has(String(t).toLowerCase())
  ).length;
  return overlap >= 3;
}

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is required");
  return new Anthropic({ apiKey: key });
}

function callClaude(system: string, user: string): Promise<DirectorScriptJson> {
  return getClient().messages
    .create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
    })
    .then((response) => {
      const textBlock = response.content.find((c) => c.type === "text");
      if (!textBlock || textBlock.type !== "text")
        throw new Error("No script text in Claude response");
      let raw = textBlock.text.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) raw = jsonMatch[0];
      const parsed = JSON.parse(raw) as DirectorScriptJson;
      if (!parsed.episodeTitle || !Array.isArray(parsed.scenes))
        throw new Error("Invalid script JSON: missing episodeTitle or scenes");
      if (!parsed.situation || !parsed.category || !parsed.setting || !parsed.plotDevice)
        throw new Error("Invalid script JSON: missing situation metadata (situation, category, setting, plotDevice)");
      return parsed;
    });
}

/** Persist situation metadata for an episode (call after creating/updating the episode with the script). */
export async function saveEpisodeSituation(
  episodeId: string,
  script: DirectorScriptJson
): Promise<void> {
  await prisma.episodeSituation.upsert({
    where: { episodeId },
    create: {
      episodeId,
      category: script.category,
      situation: script.situation,
      setting: script.setting,
      plotDevice: script.plotDevice,
      tags: script.tags ?? [],
    },
    update: {
      category: script.category,
      situation: script.situation,
      setting: script.setting,
      plotDevice: script.plotDevice,
      tags: script.tags ?? [],
    },
  });
}

/** Fetch household with dogs and cast for the director. */
export async function getHouseholdForDirector(
  householdId: string
): Promise<HouseholdForDirector | null> {
  const h = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      dogs: true,
      castMembers: true,
    },
  });
  if (!h) return null;
  return {
    showTitle: h.showTitle,
    showStyle: h.showStyle ?? [],
    comedyNotes: h.comedyNotes,
    ownerName: h.ownerName,
    dogs: h.dogs.map((d) => ({
      name: d.name,
      breed: d.breed,
      personality: d.personality ?? [],
      characterBio: d.characterBio,
    })),
    castMembers: h.castMembers.map((c) => ({
      name: c.name,
      role: c.role,
    })),
  };
}

/**
 * Generate a unique, non-repeating episode script for the household.
 * When plannedConcept is provided (from getNextEpisodeConcept), writes the script for that exact concept without retries.
 * Call saveEpisodeSituation(episodeId, script) after creating/updating the episode with this script.
 */
export async function generateEpisodeScript(
  householdId: string,
  options?: { plannedConcept?: PlannedConcept }
): Promise<DirectorScriptJson> {
  const household = await getHouseholdForDirector(householdId);
  if (!household) throw new Error("Household not found");

  const episodeHistory = await getEpisodeHistory(householdId);
  const episodeNumber = episodeHistory.length + 1;
  const plannedConcept = options?.plannedConcept;

  if (plannedConcept) {
    const { system, user } = buildScriptPrompt(
      household,
      episodeHistory,
      episodeNumber,
      plannedConcept
    );
    return callClaude(system, user);
  }

  let attempts = 0;
  let script: DirectorScriptJson | null = null;
  let tooSimilar = true;
  const historyForRetry = [...episodeHistory];

  while (tooSimilar && attempts < 3) {
    const { system, user } = buildScriptPrompt(
      household,
      historyForRetry,
      episodeNumber
    );
    script = await callClaude(system, user);
    tooSimilar = checkSimilarity(script, episodeHistory);

    if (tooSimilar) {
      historyForRetry.unshift({
        situation: script.situation,
        setting: script.setting,
        plotDevice: script.plotDevice,
        tags: script.tags ?? [],
        category: script.category,
      });
    }
    attempts++;
  }

  if (!script) throw new Error("Failed to generate a unique script after 3 attempts");
  return script;
}
