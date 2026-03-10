import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a professional TV comedy writers room. You write sitcom episodes starring real dogs based on their actual personalities, quirks, and real-life behaviors. Your scripts are specific, funny, and feel like they were written by someone who knows this exact dog personally.

Rules:
- Every plot must directly involve one of the dog's real quirks or behaviors from their bio. Not generic dog behavior — their specific behavior.
- The humor style must shape the entire episode structure, not just the tone.
- Characters must feel real and consistent throughout.
- Always respond with valid JSON only, no markdown, no explanation outside the JSON.`;

export type EpisodeScriptParams = {
  dogName: string;
  breed: string | null;
  personality: string[];
  characterBio: string | null;
  ownerName: string | null;
  showTitle: string;
  humorStyles: string[];
};

export type SceneBlock = {
  sceneNumber: number;
  heading: string;
  actionDescription: string;
  narratorLine: string;
};

export type EpisodeScriptJson = {
  title: string;
  synopsis: string;
  coldOpen: SceneBlock;
  scenes: SceneBlock[];
  tag: SceneBlock;
};

/** Pipeline-friendly shape: flat list of 4 blocks with action + narratorLine for video/TTS. */
export type EpisodeScriptForPipeline = {
  title: string;
  synopsis: string;
  /** [coldOpen, ...scenes, tag] — 4 items for 4 clips/voiceovers */
  scenes: { action: string; narratorLine: string; setting: string }[];
  raw: EpisodeScriptJson;
};

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is required");
  return new Anthropic({ apiKey: key });
}

function buildHumorInstructions(
  humorStyles: string[],
  dogName: string,
  ownerName: string | null
): string {
  const owner = ownerName ?? "the owner";
  const instructions: Record<string, string> = {
    mockumentary: `
MOCKUMENTARY STRUCTURE RULES:
- Include 1-2 "interview" scenes where ${dogName} or other dogs appear to be giving a talking-head confessional to camera
- Action descriptions for interview scenes should say: "${dogName} sits in front of a plain background, looking directly at camera"
- Other dogs or animals at the scene can also be "interviewed" as witnesses
- Narrator speaks like a documentary voiceover — dry, matter-of-fact, as if documenting real events of great importance
- Example narrator tone: "It was a Tuesday. No one could have predicted what was about to happen."`,

    chaotic_comedy: `
CHAOTIC COMEDY STRUCTURE RULES:
- Each scene should escalate from the previous — small problem becomes bigger problem becomes full disaster
- The solution to each problem creates a new, worse problem
- Narrator sounds increasingly panicked/exasperated as things escalate
- Tag scene: everything is somehow resolved but nothing makes sense`,

    wholesome: `
WHOLESOME STRUCTURE RULES:
- Someone (${dogName} or ${owner}) learns something or grows by the end
- Include one genuinely sweet moment in the tag scene
- Narrator is warm and affectionate, like a nature documentary about something small and precious
- Problems are real but never mean-spirited`,

    dry_wit: `
DRY WIT STRUCTURE RULES:
- ${dogName} takes a completely mundane situation with total seriousness
- Everyone around them underreacts to chaos
- Narrator delivers all lines completely deadpan, never acknowledging how absurd things are
- Example narrator tone: "${dogName} had been planning this for weeks. The squirrel had no idea."`,

    sitcom_classic: `
CLASSIC SITCOM STRUCTURE RULES:
- Built on a misunderstanding that could be resolved with one conversation
- The misunderstanding must get worse before it gets better
- Tag scene resolves everything with a comedic button
- Narrator has classic sitcom energy — warm, slightly over-dramatic`,

    reality_tv: `
REALITY TV STRUCTURE RULES:
- Include 1-2 confessional scenes (same as mockumentary interview format)
- Other dogs/animals are "cast members" with their own agendas
- There is a clear hero, a villain, and a dramatic moment
- Narrator teases upcoming drama: "Coming up... ${dogName} makes a decision that will change everything."
- Tag scene is a "where are they now" style epilogue`,
  };

  return humorStyles
    .map((style) => instructions[style] ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export async function generateEpisodeScript(
  params: EpisodeScriptParams
): Promise<EpisodeScriptForPipeline> {
  const {
    dogName,
    breed,
    personality,
    characterBio,
    ownerName,
    showTitle,
    humorStyles,
  } = params;

  const humorBlock = buildHumorInstructions(humorStyles, dogName, ownerName);
  const breedLabel = breed?.trim() || "mixed breed";
  const personalityStr = personality.length ? personality.join(", ") : "friendly";

  const userPrompt = `Write a 2-minute pilot episode for a sitcom called "${showTitle}".

STARRING:
- ${dogName} — ${breedLabel} dog
- Personality: ${personalityStr}
- Character bio: ${characterBio || "(none provided — use personality and invent one specific quirk)"}
- Co-star: ${ownerName ?? "the owner"}

HUMOR STYLE: ${humorStyles.length ? humorStyles.join(" + ") : "sitcom_classic"}

${humorBlock}

EPISODE REQUIREMENTS:
- The plot MUST be directly inspired by something specific in ${dogName}'s character bio above. Pick the most comedic detail.
- 4 scenes total: cold open, 2 main act scenes, tag/ending
- Each scene: heading, 2-3 sentence action description for video generation, and narrator line (1-2 sentences read aloud over the scene)
- The narrator line should match the humor style (e.g. deadpan for dry wit, dramatic for reality TV, etc.)

Return JSON:
{
  "title": "fun episode title referencing the specific plot",
  "synopsis": "2-3 sentences describing what happens, mention ${dogName} by name",
  "coldOpen": {
    "sceneNumber": 0,
    "heading": "INT. [LOCATION] - DAY/NIGHT",
    "actionDescription": "visual description for video generation",
    "narratorLine": "what the narrator says over this scene"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "INT/EXT. [LOCATION] - DAY/NIGHT",
      "actionDescription": "visual description for video generation, always starts with '${dogName} the ${breedLabel}'",
      "narratorLine": "narrator line matching the humor style"
    },
    {
      "sceneNumber": 2,
      "heading": "INT/EXT. [LOCATION] - DAY/NIGHT",
      "actionDescription": "visual description for video generation, always starts with '${dogName} the ${breedLabel}'",
      "narratorLine": "narrator line matching the humor style"
    }
  ],
  "tag": {
    "sceneNumber": 4,
    "heading": "INT. [LOCATION] - LATER",
    "actionDescription": "brief funny closing scene",
    "narratorLine": "closing narrator line"
  }
}`;

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
  const parsed = JSON.parse(raw) as EpisodeScriptJson;

  if (!parsed.title || !parsed.coldOpen || !Array.isArray(parsed.scenes) || !parsed.tag) {
    throw new Error("Invalid episode script JSON: missing title, coldOpen, scenes, or tag");
  }

  const toScene = (b: SceneBlock) => ({
    action: b.actionDescription?.trim() || b.heading || "",
    narratorLine: b.narratorLine?.trim() || "",
    setting: b.heading || "",
  });

  const flatScenes = [
    toScene(parsed.coldOpen),
    ...parsed.scenes.map(toScene),
    toScene(parsed.tag),
  ];

  return {
    title: parsed.title,
    synopsis: parsed.synopsis,
    scenes: flatScenes,
    raw: parsed,
  };
}
