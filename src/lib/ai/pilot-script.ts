import Anthropic from "@anthropic-ai/sdk";
import type { DirectorScriptJson } from "@/lib/episodeDirector";
import type { ScriptScene } from "@/lib/ai/script";

const SYSTEM_PROMPT = `You are a TV comedy writers room. Write a full sitcom pilot episode script for a show starring a dog. The script should be deeply specific to this dog's actual personality and quirks — reference their real behaviors from the characterBio. Structure: cold open, 3 acts, tag scene. Write exactly 4 scenes. Each scene has: heading, action description (2-3 sentences for animation), and optional dialogue.

Always respond with valid JSON only, no markdown backticks, matching this exact structure:
{
  "title": "string (fun episode title e.g. The Great Sock Heist)",
  "synopsis": "string (2-3 sentences describing the plot)",
  "coldOpen": "string (opening hook description)",
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "string (scene heading e.g. INT. LIVING ROOM - DAY)",
      "actionDescription": "string (2-3 sentence action description for animation)",
      "dialogue": [
        { "character": "string", "line": "string", "isThoughtBubble": true }
      ]
    }
  ],
  "tag": "string (closing tag scene description)"
}

Rules:
- Dogs do NOT speak out loud. Use inner monologue with "isThoughtBubble": true.
- "actionDescription" must be a clear 2-3 sentence visual description that can be animated.
- If humorStyles include "mockumentary" or "The Office", add confessional-style scenes.
- Reference the dog's real quirks from characterBio in action and thought bubbles.`;

export type PilotScriptParams = {
  dogName: string;
  breed: string | null;
  personality: string[];
  characterBio: string | null;
  ownerName: string | null;
  showTitle: string;
  humorStyles: string[];
  episodeNum: number;
  season: number;
};

/** Script shape returned by Claude (and stored in Episode.script). */
export type PilotScriptJson = {
  title: string;
  synopsis: string;
  coldOpen: string;
  scenes: { sceneNumber: number; heading: string; actionDescription: string; dialogue?: { character: string; line: string; isThoughtBubble: boolean }[] }[];
  tag: string;
};

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is required");
  return new Anthropic({ apiKey: key });
}

/** Returns DirectorScriptJson so Inngest can use script.scenes[].action and script.title. */
export async function generatePilotEpisodeScript(
  params: PilotScriptParams
): Promise<DirectorScriptJson & { title: string }> {
  const {
    dogName,
    breed,
    personality,
    characterBio,
    ownerName,
    showTitle,
    humorStyles,
    episodeNum,
    season,
  } = params;

  const userPrompt = `Write the pilot episode (Season ${season}, Episode ${episodeNum}) for the show "${showTitle}".

DOG:
- Name: ${dogName}${breed ? `\n- Breed: ${breed}` : ""}
- Personality traits: ${personality.length ? personality.join(", ") : "friendly"}
- Character bio / real quirks (use these in the script): ${characterBio || "None provided — invent believable dog behaviors."}
${ownerName ? `\nOwner/co-star name: ${ownerName}` : ""}

COMEDY STYLE / TONE:
${humorStyles.length ? humorStyles.join(", ") : "Pixar-style sitcom"}

Return ONLY the JSON object with title, synopsis, coldOpen, scenes (exactly 4 scenes with sceneNumber, heading, actionDescription, dialogue?), and tag. No other text.`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No script text in Claude response");
  }

  let raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) raw = jsonMatch[0];
  const parsed = JSON.parse(raw) as PilotScriptJson;

  if (!parsed.title || !Array.isArray(parsed.scenes)) {
    throw new Error("Invalid pilot script JSON: missing title or scenes");
  }

  const scenes: ScriptScene[] = parsed.scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    setting: s.heading ?? "",
    type: "normal" as const,
    characters: [dogName],
    action: s.actionDescription ?? "",
    dialogue: (s.dialogue ?? []).map((d) => ({
      character: d.character,
      line: d.line,
      isThoughtBubble: d.isThoughtBubble ?? true,
    })),
  }));

  return {
    title: parsed.title,
    episodeTitle: parsed.title,
    synopsis: parsed.synopsis,
    situation: "pilot",
    category: "home",
    setting: "living room",
    plotDevice: "pilot episode",
    tags: [],
    scenes,
  };
}
