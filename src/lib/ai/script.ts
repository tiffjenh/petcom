import Anthropic from "@anthropic-ai/sdk";
import { getComedyStyleBlock } from "@/lib/prompts/scriptPrompt";
import {
  SYSTEM_PROMPT,
  getPrimaryShowFormulaKey,
  SHOW_FORMULAS,
} from "@/lib/ai/trailer-script";

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
  const comedyStyleBlock = getComedyStyleBlock(selectedShows);
  const vibeNotes = comedyNotes?.trim() ? comedyNotes : "None";
  const coStarLine = ownerName?.trim() ? `Primary co-star (owner): ${ownerName.trim()}` : "";

  const formulaKey = getPrimaryShowFormulaKey(selectedShows);
  const showFormula = SHOW_FORMULAS[formulaKey] ?? SHOW_FORMULAS.theOffice;
  const primaryDogName = dogs[0]?.name ?? "The dog";

  const formulaBlock = `
You are writing for ${showFormula.name}.

REQUIRED EPISODE STRUCTURE — FOLLOW EXACTLY:
${showFormula.structureFormula.map((step) => step).join("\n")}

REQUIRED ELEMENTS — ALL MUST APPEAR:
${showFormula.requiredElements.map((el) => `✓ ${el}`).join("\n")}

FORBIDDEN — NEVER USE:
${showFormula.forbiddenElements.map((el) => `✗ ${el}`).join("\n")}

TONE GUIDE:
${showFormula.toneGuide}

EXAMPLE PREMISE FOR REFERENCE:
${showFormula.exampleEpisodePremise.replace(/{dogName}/g, primaryDogName)}
`;

  const qualityChecklist = `
QUALITY CHECKLIST — verify before returning:
✓ Cold open has clear setup/punchline
✓ Main conflict ties to dog's personality
✓ Dog has clear goal they pursue
✓ Escalation makes things worse before better
✓ Ends warm or triumphant
✓ Would make the owner say "that's SO them"
✓ Appropriate for all ages
✓ Follows ${showFormula.name} structure exactly
`;

  const systemPrompt = `${SYSTEM_PROMPT}

═══════════════════════════════
SHOW & CAST
═══════════════════════════════
The show is called: ${showTitle}
Comedy style inspired by: ${selectedShowsStr}
${comedyStyleBlock ? `\n${comedyStyleBlock}\n` : ""}
Additional vibe notes: ${vibeNotes}
${coStarLine ? `\n${coStarLine}\n` : ""}

CAST:
Dogs (use their character bios and quirks for personality and plot ideas):
${dogList || "- (No dogs listed)"}

Humans:
${castMemberList || "- (No human cast listed)"}
${formulaBlock}
${qualityChecklist}

EPISODE RULES:
1. The dog(s) are the MAIN CHARACTER(S). Every episode revolves around them.
2. Dogs do NOT speak out loud. Use inner monologue as thought bubbles (sardonic, funny, insightful).
3. Human characters speak normally in dialogue.
4. Draw from slice-of-life: morning routines, walks, treats, visitors, vet, squirrels, mailman, Zoom calls, etc.
5. Write distinct scene descriptions that can be animated (setting, character positions, actions).
6. The final line of every episode should be a closing punchline or ironic button.

OUTPUT FORMAT: Return ONLY valid JSON, no markdown or code fences:
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
        { "character": "string", "line": "string", "isThoughtBubble": false }
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
