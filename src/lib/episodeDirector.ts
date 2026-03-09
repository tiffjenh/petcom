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
  episodeNumber: number
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

  const user = `Write Episode ${episodeNumber} for "${household.showTitle}". Return ONLY the JSON object, no other text.`;

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
 * Call saveEpisodeSituation(episodeId, script) after creating/updating the episode with this script.
 */
export async function generateEpisodeScript(
  householdId: string
): Promise<DirectorScriptJson> {
  const household = await getHouseholdForDirector(householdId);
  if (!household) throw new Error("Household not found");

  const episodeHistory = await getEpisodeHistory(householdId);
  const episodeNumber = episodeHistory.length + 1;

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
