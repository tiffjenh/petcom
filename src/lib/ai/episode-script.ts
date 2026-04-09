import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a professional TV comedy writers room. You write PILOT EPISODES for a mockumentary-style sitcom starring a real dog. Your scripts match the tone, structure, and narrator voice of a dry documentary about absurdly serious (to the dog) events.

QUALITY & FORMAT BENCHMARK — match this tone and structure:

- TITLE: Punchy, often two short phrases. Example: "The Ball. A Documentary."
- SYNOPSIS: 2-3 sentences, specific. Name the dog and the stakes. Example: "When Waffles loses her favorite ball at the park, she launches a full investigation. No stone unturned. No dog unquestioned."
- SCENE TYPES:
  * ACTION SHOT — We see the location and action. Narrator speaks in dry documentary voiceover (third person, matter-of-fact, specific details: times, names, durations). Example: "Every morning, Waffles arrives at the park with one goal. One purpose. One ball." / "At 9:31am, the ball enters the bushes. Waffles enters the bushes. Only Waffles comes out."
  * CONFESSIONAL — Character looks directly at camera (talking-head). Narrator speaks IN FIRST PERSON as that character: deadpan, delusionally confident, or unhinged depending on the character. Example (dog): "The ball and I have an understanding. I throw it — well, someone throws it for me — and then I bring it back. Every time. Because I am a professional." Example (other dog): "I don't even like balls. I'm more of a stick guy. But I'm not gonna say I didn't see anything."
- SETTING: Be specific. "Riverside Park, 9:14am. A perfect Tuesday." / "The park bench area. Three dogs are present — Bruno (a large Lab), Pretzel (a tiny dachshund), and an unnamed Husky who hasn't stopped howling."
- OTHER CHARACTERS: Include at least 1–2 other named characters (other dogs, humans, wildlife). Give each a name and one trait. They can get their own confessional lines. Example: "Bruno, a four-year-old Labrador with a known history of ball theft and zero remorse."
- PACING: Use "beat" or "Long pause." inside narratorLine where a pause fits. The narrator never winks at the camera; the humor is in the seriousness.
- TAG / END CARD: Closing narrator line that wraps the story with a dry, ironic button. Example: "The ball was later found under a stroller. Waffles has not apologized to Bruno."

REFERENCE SCENE (structure to emulate):
- SCENE 2 — CONFESSIONAL (Waffles looks directly at camera)
- actionDescription: "Waffles sits in front of a plain background, looking directly at camera."
- narratorLine: "The ball and I have an understanding. I throw it — well, someone throws it for me — and then I bring it back. Every time. Because I am a professional. beat I'm very good at my job."

Rules:
- Every plot must use at least one specific quirk or behavior from the dog's character bio. Not generic — this exact dog.
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

  const userPrompt = `Write a 2-minute pilot episode for "${showTitle}" in the documentary/mockumentary style from the benchmark.

STARRING:
- ${dogName} — ${breedLabel} dog
- Personality: ${personalityStr}
- Character bio (mine this for the plot): ${characterBio || "(none — invent one specific quirk and build the plot around it)"}
- Co-star: ${ownerName ?? "the owner"}

HUMOR STYLE: ${humorStyles.length ? humorStyles.join(" + ") : "sitcom_classic"}

${humorBlock}

REQUIREMENTS:
- Plot must turn on something specific from ${dogName}'s bio (e.g. favorite toy, nemesis, routine). Not generic.
- 4 scenes: cold open (ACTION SHOT), 2 middle scenes (mix ACTION SHOT and CONFESSIONAL — at least one confessional where ${dogName} or another character looks at camera), tag (closing narrator line).
- HEADING: Use "SCENE N — ACTION SHOT" or "SCENE N — CONFESSIONAL (Character, brief descriptor)". For action shots, put the specific setting in actionDescription (e.g. "Riverside Park, 9:14am. A perfect Tuesday.").
- ACTION DESCRIPTION: Clear visual for animation; include location and time when relevant; name any other characters (other dogs, humans) with one trait.
- NARRATOR LINE: For ACTION SHOT — dry documentary voiceover, specific details, matter-of-fact. For CONFESSIONAL — first person as that character, deadpan or delusionally confident. You may include "beat" or "Long pause." for pacing. One to three sentences per scene; can be multiple short lines.
- Include at least one other named character (another dog, human, or animal) with a trait; they can have a confessional line.
- TAG narratorLine: Ironic, dry closing (e.g. "The ball was later found under a stroller. Waffles has not apologized to Bruno.").

Return ONLY valid JSON:
{
  "title": "Punchy two-part title e.g. The Ball. A Documentary.",
  "synopsis": "2-3 sentences. Name ${dogName} and the stakes. Specific.",
  "coldOpen": {
    "sceneNumber": 0,
    "heading": "SCENE 0 — ACTION SHOT",
    "actionDescription": "Setting: [specific place, time]. Visual action for animation. Name any other characters present.",
    "narratorLine": "Dry documentary narrator line(s). Specific. Optionally end with beat."
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "SCENE 1 — CONFESSIONAL or ACTION SHOT",
      "actionDescription": "If confessional: ${dogName} (or other character) looks directly at camera, [brief descriptor]. If action: Setting and visual.",
      "narratorLine": "First person if confessional (as the character). Documentary voice if action. Use beat where it fits."
    },
    {
      "sceneNumber": 2,
      "heading": "SCENE 2 — ACTION SHOT or CONFESSIONAL",
      "actionDescription": "Visual and setting. Other named characters with one trait.",
      "narratorLine": "Narrator line matching scene type."
    }
  ],
  "tag": {
    "sceneNumber": 4,
    "heading": "TAG / END CARD",
    "actionDescription": "Brief closing visual or just end card.",
    "narratorLine": "Dry, ironic closing line. Epilogue feel."
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
