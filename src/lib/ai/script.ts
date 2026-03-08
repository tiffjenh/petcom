import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is required");
  return new Anthropic({ apiKey: key });
}

export type ScriptDialogueLine = {
  character: string;
  line: string;
  isThoughtBubble: boolean;
};

export type ScriptScene = {
  sceneNumber: number;
  setting: string;
  type: "normal" | "confessional" | "montage" | "inner_monologue";
  characters: string[];
  action: string;
  dialogue: ScriptDialogueLine[];
};

export type EpisodeScriptJson = {
  episodeTitle: string;
  synopsis: string;
  scenes: ScriptScene[];
};

export type DogInput = { name: string; breed?: string | null; personality: string[]; characterBio?: string | null };
export type CastInput = { name: string; role: string };

export async function generateScript(params: {
  showTitle: string;
  selectedShows: string[];
  comedyNotes?: string | null;
  ownerName?: string | null;
  dogs: DogInput[];
  castMembers: CastInput[];
  episodeNumber: number;
  season: number;
}): Promise<EpisodeScriptJson> {
  const {
    showTitle,
    selectedShows,
    comedyNotes,
    ownerName,
    dogs,
    castMembers,
    episodeNumber,
    season,
  } = params;

  const dogList = dogs
    .map((d) => {
      const traits = [
        d.personality.length ? d.personality.join(", ") : null,
        d.characterBio?.trim() || null,
      ].filter(Boolean);
      return `- ${d.name}${d.breed ? ` (${d.breed})` : ""}: ${traits.length ? traits.join(". ") : "friendly"}`;
    })
    .join("\n");
  const castMemberList = castMembers
    .map((c) => `- ${c.name} (${c.role})`)
    .join("\n");
  const selectedShowsStr =
    selectedShows.length > 0 ? selectedShows.join(", ") : "The Office, Brooklyn Nine-Nine";
  const vibeNotes = comedyNotes?.trim() ? comedyNotes : "None";
  const coStarLine = ownerName?.trim() ? `Primary co-star (owner): ${ownerName.trim()}` : "";

  const systemPrompt = `You are a TV writer for a Pixar-style animated sitcom. Your job is to write a ~5-minute episode script.

The show is called: ${showTitle}
Comedy style inspired by: ${selectedShowsStr}
Additional vibe notes: ${vibeNotes}
${coStarLine ? `\n${coStarLine}\n` : ""}

CAST:
Dogs (use their character bios and quirks for personality and plot ideas):
${dogList || "- (No dogs listed)"}

Humans:
${castMemberList || "- (No human cast listed)"}

RULES:
1. The dog(s) are the MAIN CHARACTER(S). Every episode revolves around them.
2. Dogs do NOT speak out loud. Instead, they have an inner monologue shown as thought bubbles. Write these as sardonic, funny, insightful internal commentary.
3. Human characters speak normally in dialogue.
4. Episodes should have a clear 3-act structure: Setup (1 min) → Escalation (3 min) → Resolution/Punchline (1 min).
5. Draw from slice-of-life situations: morning routines, walks, treats, visitors, vet visits, squirrels, the mailman, Zoom calls, etc.
6. Include at least one "talking head" confessional scene per episode if the style includes The Office or Parks & Rec.
7. Write distinct scene descriptions that can be animated (describe setting, character positions, actions).
8. The final line of every episode should be a closing punchline or ironic button.

OUTPUT FORMAT: Return ONLY valid JSON, no markdown or code fences. Use this exact structure:
{
  "episodeTitle": "string",
  "synopsis": "string (2 sentences)",
  "scenes": [
    {
      "sceneNumber": 1,
      "setting": "string",
      "type": "normal | confessional | montage | inner_monologue",
      "characters": ["string"],
      "action": "string (stage direction)",
      "dialogue": [
        {
          "character": "string",
          "line": "string",
          "isThoughtBubble": false
        }
      ]
    }
  ]
}`;

  const userPrompt = `Write Season ${season}, Episode ${episodeNumber} for the show "${showTitle}". Return ONLY the JSON object, no other text.`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No script text in Claude response");
  }

  let raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) raw = jsonMatch[0];
  const parsed = JSON.parse(raw) as EpisodeScriptJson;

  if (!parsed.episodeTitle || !Array.isArray(parsed.scenes)) {
    throw new Error("Invalid script JSON: missing episodeTitle or scenes");
  }
  return parsed;
}

/** Flatten script to a single text string for TTS or display (e.g. narrator + dialogue). */
export function scriptToText(script: EpisodeScriptJson): string {
  const parts: string[] = [];
  for (const scene of script.scenes) {
    parts.push(`Scene ${scene.sceneNumber}: ${scene.setting}. ${scene.action}`);
    for (const d of scene.dialogue) {
      if (d.isThoughtBubble) {
        parts.push(`(Thought: ${d.line})`);
      } else {
        parts.push(`${d.character}: ${d.line}`);
      }
    }
  }
  return parts.join("\n");
}
