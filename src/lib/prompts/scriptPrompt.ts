/**
 * Comedy style instruction blocks for script generation.
 * Settings/onboarding can send either humor category ids (mockumentary, etc.) or legacy show names; both are resolved to prompt ids here.
 * Script structure, scene count, and narrator voice are driven by the primary comedy category.
 */

import { getComedyStyle } from "./comedy-styles";

export type ComedyCategory =
  | "mockumentary"
  | "chaotic_comedy"
  | "wholesome"
  | "dry_wit"
  | "sitcom_classic"
  | "reality_tv";

/** Voice settings per comedy style (ElevenLabs). */
export type ComedyVoiceSettings = {
  stability: number;
  similarity_boost?: number;
  style: number;
};

/** Episode format: structure, scene list, narrator rules, title format, voice. */
export type ComedyStyleFormat = {
  sceneCount: number;
  structure: string;
  scenes: string[];
  narratorRules: string;
  titleFormat: string;
  voiceSettings: ComedyVoiceSettings;
};

/** V1: 4 scenes per episode, 60s total. Comedy style formats — structure, narrator rules, title format, voice. */
export const COMEDY_STYLE_FORMATS: Record<ComedyCategory, ComedyStyleFormat> = {
  mockumentary: {
    sceneCount: 4,
    structure: "Mockumentary — The Office / Modern Family style. 4 scenes alternating action/confessional.",
    scenes: [
      "ACTION — establishing, dog doing something confidently",
      "CONFESSIONAL — dog addresses camera, deadpan self-analysis",
      "ACTION — situation escalates, another character involved",
      "CONFESSIONAL — dog's final take, completely unbothered",
    ],
    narratorRules: `Action scenes: dry David Attenborough documentary tone. "It is 9am. Waffles has located the treat bag." Confessional scenes: first person as the dog, delusional confidence. "I had a plan. I always have a plan." Dramatic pauses with "...". Treat mundane events as historically significant. Title format: 'A Squirrel. A Promise. A Betrayal.'`,
    titleFormat: "'A Squirrel. A Promise. A Betrayal.' or 'The Treaty of the Back Yard'",
    voiceSettings: { stability: 0.25, similarity_boost: 0.85, style: 0.75 },
  },
  chaotic_comedy: {
    sceneCount: 4,
    structure: "Pure escalation — each scene worse than last. 4 scenes.",
    scenes: [
      "ACTION — innocent start, dog has simple goal",
      "ACTION — first thing goes wrong, dog undeterred",
      "ACTION — chaos peaks",
      "ACTION — absurd resolution, dog acts like nothing happened",
    ],
    narratorRules: `Narrator starts calm, gets increasingly alarmed. No confessionals — pure action. End on absurd resolution everyone just accepts.`,
    titleFormat: "'Operation: Backyard' or 'The Tuesday Incident'",
    voiceSettings: { stability: 0.2, similarity_boost: 0.8, style: 0.9 },
  },
  wholesome: {
    sceneCount: 4,
    structure: "Gentle arc. 4 scenes with heartfelt moment.",
    scenes: [
      "ACTION — cozy establishing, dog in their element",
      "ACTION — small challenge disrupts the peace",
      "HEARTFELT — quiet moment of connection",
      "ACTION — warm ending, everything right",
    ],
    narratorRules: `Warm, fond, slightly amused. Never cynical. End on something that makes you go 'aww'.`,
    titleFormat: "'A Good Tuesday' or 'The Best Part of the Day'",
    voiceSettings: { stability: 0.6, similarity_boost: 0.8, style: 0.4 },
  },
  dry_wit: {
    sceneCount: 4,
    structure: "Observational — small moments, disproportionate reactions. 4 scenes.",
    scenes: [
      "ACTION — dog encounters minor inconvenience, treats as outrage",
      "CONFESSIONAL — completely disproportionate take",
      "ACTION — resolves itself without dog's help",
      "CONFESSIONAL — dog takes full credit",
    ],
    narratorRules: `Completely flat delivery. "Waffles noticed the leaf. She had thoughts about the leaf." Never explains the joke. Just states it.`,
    titleFormat: "'The Leaf' or 'Tuesday' or 'An Incident Involving the Couch'",
    voiceSettings: { stability: 0.5, similarity_boost: 0.8, style: 0.2 },
  },
  sitcom_classic: {
    sceneCount: 4,
    structure: "3 act — setup / misunderstanding / resolution. 4 scenes.",
    scenes: [
      "ACTION — setup: dog wants something, clear goal",
      "ACTION — complication: misunderstanding makes it harder",
      "ACTION — resolution: solved, usually accidentally",
      "ACTION — tag: short funny button",
    ],
    narratorRules: `Warm and energetic. Clear setup/punchline per scene. Feels like laugh track after key moments.`,
    titleFormat: "'The One With the Ball' or 'No Good Very Bad Walk'",
    voiceSettings: { stability: 0.4, similarity_boost: 0.8, style: 0.6 },
  },
  reality_tv: {
    sceneCount: 4,
    structure: "Drama arc with villain edit and confessionals. 4 scenes.",
    scenes: [
      "CONFESSIONAL — dog introduces themselves and their agenda",
      "ACTION — dog executes plan with suspicious confidence",
      "CONFESSIONAL — dramatic reaction",
      "ACTION — winner takes all",
    ],
    narratorRules: `"Previously on Life with Waffles..." Everything framed as betrayal or triumph. End with cliffhanger.`,
    titleFormat: "'Betrayal at the Dog Park' or 'The Ball Incident: A Reckoning'",
    voiceSettings: { stability: 0.2, similarity_boost: 0.8, style: 0.8 },
  },
};

/** Humor category id → show ids (for resolving legacy show names). */
export const HUMOR_CATEGORY_TO_SHOW_IDS: Record<string, string[]> = {
  mockumentary: ["the_office", "modern_family", "abbott_elementary"],
  chaotic_comedy: ["its_always_sunny", "arrested_development"],
  wholesome: ["schitts_creek", "parks_and_recreation"],
  dry_wit: ["seinfeld", "curb_your_enthusiasm"],
  sitcom_classic: ["friends", "how_i_met_your_mother", "new_girl"],
  reality_tv: ["reality_tv"],
};

/** V1: 4 scenes per episode. */
export const SCENE_COUNT_BY_STYLE: Record<ComedyCategory, number> = {
  mockumentary: 4,
  chaotic_comedy: 4,
  wholesome: 4,
  dry_wit: 4,
  sitcom_classic: 4,
  reality_tv: 4,
};

/** V1 ElevenLabs voice settings per comedy style. */
export const NARRATOR_VOICE_SETTINGS_BY_STYLE: Record<
  ComedyCategory,
  { stability: number; style: number; similarity_boost?: number }
> = {
  mockumentary: { stability: 0.25, similarity_boost: 0.85, style: 0.75 },
  chaotic_comedy: { stability: 0.2, similarity_boost: 0.8, style: 0.9 },
  wholesome: { stability: 0.6, similarity_boost: 0.8, style: 0.4 },
  dry_wit: { stability: 0.5, similarity_boost: 0.8, style: 0.2 },
  sitcom_classic: { stability: 0.4, similarity_boost: 0.8, style: 0.6 },
  reality_tv: { stability: 0.2, similarity_boost: 0.8, style: 0.8 },
};

/** Show id → category (for resolving e.g. "the_office" → mockumentary). */
const SHOW_ID_TO_CATEGORY: Record<string, ComedyCategory> = (() => {
  const out: Record<string, ComedyCategory> = {};
  for (const [cat, ids] of Object.entries(HUMOR_CATEGORY_TO_SHOW_IDS)) {
    for (const id of ids) {
      out[id] = cat as ComedyCategory;
    }
  }
  return out;
})();

/** Resolve show names/ids to a single primary comedy category (first match). */
export function getPrimaryComedyCategory(
  selectedShowNamesOrIds: string[]
): ComedyCategory | null {
  if (!selectedShowNamesOrIds?.length) return null;
  for (const item of selectedShowNamesOrIds) {
    const trimmed = item.trim();
    const key = trimmed.toLowerCase();
    if (key in SCENE_COUNT_BY_STYLE) return key as ComedyCategory;
    const category = COMEDY_SHOW_NAME_TO_CATEGORY[trimmed];
    if (category) return category as ComedyCategory;
    const showId = COMEDY_SHOW_NAME_TO_ID[trimmed] ?? key;
    if (SHOW_ID_TO_CATEGORY[showId]) return SHOW_ID_TO_CATEGORY[showId];
  }
  return null;
}

export function getComedyFormat(category: ComedyCategory | null): ComedyStyleFormat | null {
  if (!category || !(category in COMEDY_STYLE_FORMATS)) return null;
  return COMEDY_STYLE_FORMATS[category as ComedyCategory];
}

export function getSceneCountForStyle(category: ComedyCategory | null): number {
  const format = getComedyFormat(category);
  return format?.sceneCount ?? 4;
}

export function getNarratorVoiceSettingsForStyle(
  category: ComedyCategory | null
): { stability: number; style: number; similarity_boost?: number } | null {
  const format = getComedyFormat(category);
  if (!format?.voiceSettings) return null;
  return {
    stability: format.voiceSettings.stability,
    style: format.voiceSettings.style,
    ...(format.voiceSettings.similarity_boost !== undefined && {
      similarity_boost: format.voiceSettings.similarity_boost,
    }),
  };
}

/** Voice settings from comedy-styles (used when pipeline is driven by humorStyles[0]). */
export function getNarratorVoiceSettingsFromStyleId(styleId: string): {
  stability: number;
  style: number;
  similarity_boost: number;
} {
  const style = getComedyStyle(styleId);
  return {
    stability: style.voiceSettings.stability,
    style: style.voiceSettings.style,
    similarity_boost: 0.85,
  };
}

/** Build the comedy-style-driven prompt block for script generation. */
export function getComedyStylePromptBlock(
  styleId: string,
  dog: {
    name: string;
    breed: string | null;
    personality?: string[];
    characterBio?: string | null;
    voiceArchetype?: string | null;
  },
  household: { showTitle: string; humorStyles?: string[]; showStyle?: string[] },
  castMembers: { name: string; role: string }[],
  options?: { sceneCount?: number }
): string {
  const style = getComedyStyle(styleId);
  const sceneCount = options?.sceneCount ?? 4;
  const is90s = sceneCount === 6;
  const castList =
    castMembers
      ?.map((c) => `${c.name} (${c.role})`)
      .join(", ") || "None";

  const lengthInstruction = is90s
    ? "Generate 6 scenes. Each scene's dialogue should total 15 seconds when spoken (2-3 lines × 5 seconds each). 6 scenes × 15 seconds = 90 seconds total. No hardcoded plot — generate everything from the dog's bio and personality."
    : "4 scenes. Each scene's dialogue ~15 seconds when spoken. 4 scenes × 15s = 60 seconds total.";

  const structureScenes = is90s
    ? [
        ...style.structure.map((s, i) => ({ ...s, sceneIndex: i })),
        { sceneIndex: 4, type: "action", description: "Escalation or twist. Same comedy style.", hasConfessional: style.structure[2]?.hasConfessional ?? false, cameraStyle: style.structure[2]?.cameraStyle ?? "wide", dialogueStyle: style.structure[2]?.dialogueStyle ?? "short punchy lines" },
        { sceneIndex: 5, type: style.structure[3]?.type ?? "confessional", description: "Final beat. Same comedy style.", hasConfessional: style.structure[3]?.hasConfessional ?? true, cameraStyle: style.structure[3]?.cameraStyle ?? "close-up", dialogueStyle: style.structure[3]?.dialogueStyle ?? "direct to camera" },
      ]
    : style.structure.map((s, i) => ({ ...s, sceneIndex: i }));

  return `
You are writing a ${is90s ? "90-second" : "60-second"} episode of "${household.showTitle}" 
for a ${dog.breed ?? "dog"} named ${dog.name}.

━━━━━━━━━━━━━━━━━━━━━━━━
COMEDY STYLE: ${style.label}
Reference shows: ${style.reference}
━━━━━━━━━━━━━━━━━━━━━━━━

LENGTH: ${lengthInstruction}

EPISODE STRUCTURE — follow this EXACTLY:
${structureScenes
  .map(
    (s: { type: string; description: string; cameraStyle: string; dialogueStyle: string; hasConfessional: boolean }, i: number) => `
Scene ${i + 1}: ${s.type.toUpperCase()}
Description: ${s.description}
Camera style: ${s.cameraStyle}
Dialogue style: ${s.dialogueStyle}
Has confessional: ${s.hasConfessional}
`
  )
  .join("\n")}

DIALOGUE RULES:
${style.dialogueRules}

EPISODE TITLE FORMAT:
${style.episodeTitleFormat}

━━━━━━━━━━━━━━━━━━━━━━━━
CHARACTER MATERIAL — USE THIS:
━━━━━━━━━━━━━━━━━━━━━━━━
Dog name: ${dog.name}
Breed: ${dog.breed ?? "dog"}
Owner description: ${dog.characterBio ?? "(use personality only)"}
Personality: ${dog.personality?.join(", ") ?? ""}
Voice archetype: ${dog.voiceArchetype ?? "professional"}

Mine this for comedy:
- Central obsession → episode's main object/goal
- Biggest contradiction → comedic tension
- Weird specific behavior → recurring bit

RULE 1: Use at least 2 specific details from the owner's 
description. Owner should watch and say 
"that is EXACTLY what she does."

RULE 2: Every episode needs at least 1 other character. Supporting cast: ${castList}

RULE 3: Each dialogue line must be 1-3 sentences MAX.
This is non-negotiable — clips are 3-5 seconds long.

RULE 4: Write all dialogue in the character's voice archetype:
${dog.voiceArchetype ?? "professional"} speaking style applies to ${dog.name}.
Supporting characters get auto-assigned archetypes (chill, chaos, philosopher, etc.).

━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT — JSON ONLY, NO OTHER TEXT:
━━━━━━━━━━━━━━━━━━━━━━━━
{
  "episodeTitle": string,
  "synopsis": string,
  "situation": string,
  "category": string,
  "setting": string,
  "plotDevice": string,
  "tags": string[],
  "scenes": [
    {
      "sceneNumber": number,
      "type": string,
      "setting": string,
      "action": string,
      "isConfessional": boolean,
      "cameraStyle": string,
      "dialogueLines": [
        {
          "speaker": string,
          "voiceArchetype": string,
          "line": string,
          "clipIndex": number
        }
      ]
    }
  ]
}
`;
}

/** Legacy: show name → humor category id (for mapping old showStyle to category selection in Settings). */
export const COMEDY_SHOW_NAME_TO_CATEGORY: Record<string, string> = {
  "The Office": "mockumentary",
  "Modern Family": "mockumentary",
  "Abbott Elementary": "mockumentary",
  "Brooklyn Nine-Nine": "chaotic_comedy",
  "It's Always Sunny": "chaotic_comedy",
  "Arrested Development": "chaotic_comedy",
  "Schitt's Creek": "wholesome",
  "Ted Lasso": "wholesome",
  "Parks and Recreation": "wholesome",
  "What We Do in the Shadows": "dry_wit",
  "Seinfeld": "dry_wit",
  "Curb Your Enthusiasm": "dry_wit",
  "Friends": "sitcom_classic",
  "How I Met Your Mother": "sitcom_classic",
  "New Girl": "sitcom_classic",
};

export const COMEDY_SHOW_NAME_TO_ID: Record<string, string> = {
  "The Office": "the_office",
  "Brooklyn Nine-Nine": "brooklyn_nine_nine",
  "Modern Family": "modern_family",
  "Parks and Recreation": "parks_and_recreation",
  "Friends": "friends",
  "Schitt's Creek": "schitts_creek",
  "It's Always Sunny": "its_always_sunny",
  "Abbott Elementary": "abbott_elementary",
  "What We Do in the Shadows": "what_we_do_in_the_shadows",
  "New Girl": "new_girl",
  "How I Met Your Mother": "how_i_met_your_mother",
  "Arrested Development": "arrested_development",
  "Seinfeld": "seinfeld",
  "Community": "community",
  "Curb Your Enthusiasm": "curb_your_enthusiasm",
};

export const COMEDY_STYLE_INSTRUCTIONS: Record<string, string> = {
  the_office: `
  - Include at least one talking head confessional scene where a character speaks directly to camera
  - Humor comes from mundane situations treated with deadly seriousness
  - The dog's inner monologue should be dry and understated: "This is my life now"
  - Include an awkward silence moment that goes on slightly too long
  - One character should be obliviously annoying while everyone else suffers quietly
  - The camera (POV) should feel like it's catching embarrassing moments accidentally
  - End on a quiet, slightly sad but weirdly sweet note
`,

  brooklyn_nine_nine: `
  - Warm, ensemble energy — everyone genuinely likes each other even when chaos happens
  - Include one absurd bet or competition that escalates unexpectedly
  - The dog should have an unshakeable confident energy even in ridiculous situations
  - Include a "cool cool cool cool cool, no doubt no doubt" style deflection moment in the inner monologue
  - One character should have an elaborate over-prepared plan that immediately falls apart
  - Ends wholesomely — chaos resolved, everyone is fine, maybe a hug
  - Never mean-spirited, always punches up not down
`,

  modern_family: `
  - Mockumentary format with talking head interviews from multiple family members
  - Three parallel storylines that seem unrelated but converge at the end
  - The dog observes ALL THREE storylines and has a running inner monologue connecting them
  - Include one moment of unexpected genuine emotion amid the comedy
  - At least one character's plan backfires in an entirely predictable way they didn't see coming
  - End with a warm voiceover reflection that ties everything together sentimentally
  - Generational contrast humor: old vs young, traditional vs modern
`,

  parks_and_recreation: `
  - Relentlessly optimistic tone — even obstacles are opportunities
  - The dog is a tireless enthusiast who treats every small adventure like a noble mission
  - Include a "Leslie Knope moment" — an elaborate binder/plan for something completely unnecessary
  - One character is aggressively apathetic (the April/Ron energy) as contrast
  - Include a "treat yourself" or "I have no idea what I'm doing but I'm doing it" inner monologue beat
  - Ends with genuine heartfelt community moment
  - Government/bureaucracy can be replaced with household rules the dog finds absurd
`,

  friends: `
  - Central Perk / hangout energy — most scenes happen in one comfortable familiar location
  - Rapid back-and-forth witty dialogue between cast members
  - The dog has a VERY strong opinion about which human is their favorite (the Ross/Rachel dynamic)
  - Include a physical comedy set piece (something falls, someone trips, chaos ensues)
  - Running gag that pays off at episode end
  - Someone says something they immediately regret and can't take back
  - Ends with everyone together, comfortable, status quo restored
  - Include a "we were on a break" style unresolvable disagreement between humans
`,

  schitts_creek: `
  - Characters who are fish out of water adjusting to simpler circumstances
  - Dry wit delivered completely straight-faced
  - The dog is unimpressed by everyone's drama and just wants basic things
  - Include one moment of surprising vulnerability beneath the surface-level absurdity
  - A character uses overly elaborate vocabulary for a very simple situation
  - Slow-burn awkwardness that pays off with genuine warmth
  - Someone grows slightly as a person by the end, almost against their will
  - "Simply the best" energy — sincere despite being ironic
`,

  its_always_sunny: `
  - The humans are all deeply selfish and scheming
  - The dog is the only reasonable creature in the room and knows it
  - Each character has an elaborate scheme that serves only themselves
  - Everything escalates to a chaotic conclusion that resolves nothing and helps no one
  - The dog's inner monologue is pure disbelief: "These are my owners. I chose this."
  - Include a "we're just gonna have to agree to disagree" moment after complete moral failure
  - NOTE: Keep age-appropriate — no alcohol/drugs references, just the chaotic scheming energy
  - No one learns anything. Ever.
`,

  abbott_elementary: `
  - Mockumentary format, talking head confessionals
  - Warm ensemble who genuinely care despite underfunding and chaos
  - The dog is trying their best with very limited resources (one toy, one bed)
  - Include a moment where someone overcomplicated a simple problem
  - One character is obliviously out of touch (the Ava energy) while everyone works around them
  - Optimistic despite realistic obstacles
  - The dog's inner monologue is earnest and hardworking: "I just want to do a good job"
  - Ends with small victory that feels genuinely earned
`,

  what_we_do_in_the_shadows: `
  - Deadpan mockumentary — characters treat absurd situations with complete normalcy
  - The dog finds everything the humans do mildly baffling but accepts it
  - Long awkward pauses are intentional and funny
  - Include one extremely mundane task treated as an ancient mysterious ritual
  - A character explains something obvious as if it is profound wisdom
  - The dog's inner monologue is calm and matter-of-fact about complete chaos: "This happens every Tuesday"
  - Energy Guide interviews where characters contradict themselves completely
  - Dry British/NZ deadpan delivery in all dialogue
`,

  new_girl: `
  - Adorkable energy — characters are lovably weird and proud of it
  - Include a "True American" style made-up game or ritual the household has
  - The dog participates enthusiastically in human activities they don't fully understand
  - Schmidt-style overcomplicated reaction to a simple problem
  - Include a genuine heartfelt "loft moment" where the found family dynamic shines
  - Someone does something embarrassing and owns it completely
  - The dog's inner monologue is enthusiastic and slightly chaotic: "I love these weirdos"
  - Ends warm with the group together, weird and happy
`,

  how_i_met_your_mother: `
  - Use a nostalgic framing device — the dog is "remembering" this adventure
  - Include at least one running gag that pays off at the end
  - Reference the ensemble cast warmly
  - End with a callback to something mentioned early in the episode
  - The inner monologue should feel like the dog is narrating a story to someone in the future
`,

  arrested_development: `
  - Include at least one callback joke that references a previous episode or earlier moment
  - Characters should be lovably oblivious to their own absurdity
  - Use ironic juxtaposition — what characters say vs what actually happens
  - The dog's inner monologue should be the only self-aware voice — everyone else is clueless
  - Include a "her?" or similarly understated reaction moment
  - Layered jokes: surface joke + deeper joke for attentive viewers
`,

  seinfeld: `
  - The entire episode should revolve around a petty, trivial grievance blown completely out of proportion
  - The dog's inner monologue obsesses over a minor social injustice (e.g. someone ate from their bowl, a human didn't say hello properly)
  - No warm resolution — the problem either gets worse or stays exactly the same
  - Include observational commentary: "What IS the deal with the vacuum cleaner?"
  - Characters are all slightly selfish and neurotic
  - Nothing is learned, no one grows, life continues
`,

  community: `
  - The dog is self-aware that they are in a TV show
  - Include a genre parody or meta moment (e.g. "this feels like a heist episode")
  - The ensemble has very distinct contrasting personalities that clash funnily
  - Include an "Abed moment" — someone narrating what's happening as if analyzing a TV trope
  - Underdog energy — the group is chaotic but surprisingly competent when it matters
  - End with unexpected sincerity after the absurdity
`,

  curb_your_enthusiasm: `
  - The entire episode is driven by an awkward social situation that escalates due to the dog following their own internal logic
  - The dog has VERY strong opinions about social rules being violated (someone sat in their spot, someone pet them wrong, a guest overstayed)
  - Each scene escalates the original awkward situation
  - Include at least one moment where the dog is technically right but socially wrong
  - The inner monologue should sound exasperated and incredulous: "Can you BELIEVE this?"
  - No clean resolution — ends on maximum awkwardness
`,

  reality_tv: `
  - Confessionals to camera as if the dog is on a reality show
  - The dog has strong opinions about the "other cast members" (humans, other pets)
  - Dramatic reaction shots; the dog judges everyone silently
  - Over-the-top stakes for trivial things (who gets the best spot on the couch)
  - Optional "villain edit" energy — the dog is unapologetically self-centered
  - Reality TV pacing: quick cuts, reaction shots, confessional asides
`,
};

const BLEND_NOTE = `
Blend these comedy styles naturally. Don't force all elements from each — pick the strongest 2-3 techniques from each style that work together. The result should feel cohesive, not like a checklist.
`;

/** When both Seinfeld and Curb are selected, add this note. */
const SEINFELD_CURB_BLEND = `
Note: Blend observational grievance comedy with social awkwardness escalation — petty grievances meet escalating awkwardness.
`;

/**
 * Build the comedy style / episode format block from COMEDY_STYLE_FORMATS.
 * Uses primary category from selectedShowNamesOrIds (e.g. household.showStyle or humorStyles).
 */
export function getComedyStyleBlock(selectedShowNamesOrIds: string[]): string {
  const input = selectedShowNamesOrIds ?? [];
  const primary = getPrimaryComedyCategory(input);
  const format = getComedyFormat(primary);
  const sceneCount = getSceneCountForStyle(primary);
  console.log("[getComedyStyleBlock] primary:", primary, "sceneCount:", sceneCount);

  if (!format) {
    const fallback = COMEDY_STYLE_FORMATS.mockumentary;
    return [
      "EPISODE FORMAT:",
      `Scene count: ${fallback.sceneCount}. Structure: ${fallback.structure}.`,
      "Scenes:",
      ...fallback.scenes.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      "NARRATOR RULES:",
      fallback.narratorRules,
      "",
      `TITLE FORMAT: ${fallback.titleFormat}`,
    ].join("\n");
  }

  return [
    "EPISODE FORMAT:",
    `Scene count: ${format.sceneCount}. Structure: ${format.structure}.`,
    "Scenes:",
    ...format.scenes.map((s, i) => `  ${i + 1}. ${s}`),
    "",
    "NARRATOR RULES:",
    format.narratorRules,
    "",
    `TITLE FORMAT: ${format.titleFormat}`,
  ].join("\n");
}
