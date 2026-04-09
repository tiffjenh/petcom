/**
 * Comedy style definitions drive the entire episode pipeline.
 * household.humorStyles[0] selects the style; structure, dialogue, and behavior all flow from here.
 */

export type SceneStructureEntry = {
  sceneIndex: number;
  type: string;
  description: string;
  hasConfessional: boolean;
  cameraStyle: string;
  dialogueStyle: string;
};

export type ComedyStyleDef = {
  id: string;
  label: string;
  reference: string;
  sceneCount: number;
  structure: SceneStructureEntry[];
  narratorRules: string | null;
  dialogueRules: string;
  episodeTitleFormat: string;
  voiceSettings: { stability: number; style: number };
};

export const COMEDY_STYLE_FORMATS = {
  mockumentary: {
    id: "mockumentary",
    label: "Mockumentary",
    reference: "The Office, Abbott Elementary, Modern Family",
    sceneCount: 4,
    structure: [
      {
        sceneIndex: 0,
        type: "action",
        description: "Dog doing something confidently. Goes wrong.",
        hasConfessional: false,
        cameraStyle: "wide observational shot, handheld feel",
        dialogueStyle:
          "voice over while action plays — dog narrates what they're doing as if everything is going to plan",
      },
      {
        sceneIndex: 1,
        type: "confessional",
        description: "Dog addresses camera directly. Explains their version of events.",
        hasConfessional: true,
        cameraStyle: "close-up facing camera, interview lighting, blurred background",
        dialogueStyle:
          "direct to camera, deadpan, complete confidence in a flawed plan",
      },
      {
        sceneIndex: 2,
        type: "action",
        description: "Situation escalates. Another character involved.",
        hasConfessional: false,
        cameraStyle: "observational wide, cut to reaction close-ups",
        dialogueStyle: "back and forth between characters, short punchy lines",
      },
      {
        sceneIndex: 3,
        type: "confessional",
        description: "Final confessional. Dog's take on how it ended.",
        hasConfessional: true,
        cameraStyle: "close-up facing camera",
        dialogueStyle:
          "completely unbothered by outcome, revisionist history, dignity intact",
      },
    ],
    narratorRules: null,
    dialogueRules: `
      All dialogue is direct speech from the character.
      Dogs speak in first person directly to camera in confessionals.
      Dogs react to each other in action scenes.
      Keep every line 1-3 sentences MAX.
      Tone: dry, deadpan, completely serious about unserious things.
      Example: "I had a plan. The plan was good. 
                The plan required a ball. The ball is gone."
    `,
    episodeTitleFormat:
      "Dramatic single noun or short phrase. 'The Ball.' 'A Tuesday.' 'The Incident.'",
    voiceSettings: { stability: 0.3, style: 0.7 },
  },

  chaotic_comedy: {
    id: "chaotic_comedy",
    label: "Chaotic Comedy",
    reference: "It's Always Sunny, Arrested Development",
    sceneCount: 4,
    structure: [
      {
        sceneIndex: 0,
        type: "action",
        description: "Dog has a terrible idea. Commits fully.",
        hasConfessional: false,
        cameraStyle: "fast cuts, slightly unstable camera",
        dialogueStyle: "dog announces the plan mid-action, zero self awareness",
      },
      {
        sceneIndex: 1,
        type: "action",
        description: "Plan immediately backfires. Dog doubles down.",
        hasConfessional: false,
        cameraStyle: "wider shot showing full chaos",
        dialogueStyle: "dog explains why this is still fine, escalating energy",
      },
      {
        sceneIndex: 2,
        type: "action",
        description: "Other character gets dragged into it.",
        hasConfessional: false,
        cameraStyle: "reaction shots, fast cuts between characters",
        dialogueStyle: "rapid back and forth, interrupting, loud",
      },
      {
        sceneIndex: 3,
        type: "action",
        description: "Everything is on fire. Dog considers this a win.",
        hasConfessional: false,
        cameraStyle: "wide shot of aftermath",
        dialogueStyle: "dog declares victory, everyone else exhausted",
      },
    ],
    narratorRules: null,
    dialogueRules: `
      No confessionals. Pure action and reaction.
      Everyone is loud and wrong simultaneously.
      Every line escalates the situation further.
      No one learns anything.
      Tone: frantic, committed, completely unreasonable.
      Example: "THIS IS FINE. I MEANT TO DO THIS. 
                BRUNO DID YOU SEE THAT?? I MEANT THAT."
    `,
    episodeTitleFormat:
      "ALL CAPS single word or action. 'CHAOS.' 'THE PLAN.' 'MISTAKES.'",
    voiceSettings: { stability: 0.1, style: 0.95 },
  },

  wholesome: {
    id: "wholesome",
    label: "Wholesome",
    reference: "Bluey, Ted Lasso, Schitt's Creek",
    sceneCount: 4,
    structure: [
      {
        sceneIndex: 0,
        type: "action",
        description: "Dog notices someone needs help or is sad.",
        hasConfessional: false,
        cameraStyle: "warm wide shot, golden lighting",
        dialogueStyle: "dog gently offers help, genuine and earnest",
      },
      {
        sceneIndex: 1,
        type: "action",
        description: "First attempt to help goes sideways but sweetly.",
        hasConfessional: false,
        cameraStyle: "medium shots, warm and intimate",
        dialogueStyle: "dog doubles down on kindness despite chaos",
      },
      {
        sceneIndex: 2,
        type: "action",
        description: "Genuine connection moment between characters.",
        hasConfessional: false,
        cameraStyle: "close-up warm two-shot",
        dialogueStyle: "simple sincere exchange, emotionally resonant",
      },
      {
        sceneIndex: 3,
        type: "reflection",
        description: "Dog reflects warmly. Small lesson. Big heart.",
        hasConfessional: false,
        cameraStyle: "soft close-up, warm lighting",
        dialogueStyle: "dog shares what they learned, simple and genuine",
      },
    ],
    narratorRules: `
      Optional warm narrator for scene transitions only.
      Gentle, like a bedtime story narrator.
      Never sarcastic.
    `,
    dialogueRules: `
      Characters speak warmly and directly to each other.
      No confessionals — just genuine interactions.
      Every line comes from a good place even when chaotic.
      Tone: warm, earnest, funny without being mean.
      Example: "Are you okay? You look like you need a snuggle. 
                I am VERY good at snuggles."
    `,
    episodeTitleFormat:
      "Warm and simple. 'A Good Day.' 'The Best Friend.' 'Home.'",
    voiceSettings: { stability: 0.6, style: 0.4 },
  },

  dry_wit: {
    id: "dry_wit",
    label: "Dry Wit",
    reference: "Seinfeld, Curb Your Enthusiasm, What We Do in the Shadows",
    sceneCount: 4,
    structure: [
      {
        sceneIndex: 0,
        type: "observation",
        description: "Dog notices something mildly annoying. Underreacts.",
        hasConfessional: false,
        cameraStyle: "flat observational, no movement",
        dialogueStyle: "dog makes a single flat observation, moves on",
      },
      {
        sceneIndex: 1,
        type: "action",
        description: "Mildly annoying thing escalates. Dog still underreacts.",
        hasConfessional: false,
        cameraStyle: "same flat style, uncomfortable holds",
        dialogueStyle: "dog notes the escalation with minimal emotion",
      },
      {
        sceneIndex: 2,
        type: "action",
        description: "Another character overreacts. Dog watches.",
        hasConfessional: false,
        cameraStyle: "wide shot, dog in foreground watching chaos",
        dialogueStyle: "dog makes dry aside to camera, returns to watching",
      },
      {
        sceneIndex: 3,
        type: "observation",
        description: "Everything resolves pointlessly. Dog knew this would happen.",
        hasConfessional: false,
        cameraStyle: "flat wide, everyone standing around",
        dialogueStyle: "dog's final flat observation, walks away",
      },
    ],
    narratorRules: null,
    dialogueRules: `
      Flat delivery. Understate everything.
      The less emotion the funnier.
      Dog occasionally addresses camera with a single look or line.
      Never raises voice. Never surprised.
      Tone: mildly inconvenienced by existence.
      Example: "The ball is gone. 
                I expected this. 
                I always expect this."
    `,
    episodeTitleFormat:
      "Mundane observation. 'The Ball Situation.' 'A Normal Tuesday.' 'Whatever.'",
    voiceSettings: { stability: 0.6, style: 0.15 },
  },

  sitcom_classic: {
    id: "sitcom_classic",
    label: "Classic Sitcom",
    reference: "Friends, How I Met Your Mother, Fresh Prince",
    sceneCount: 4,
    structure: [
      {
        sceneIndex: 0,
        type: "setup",
        description: "Dog makes a simple plan. Stakes feel enormous.",
        hasConfessional: false,
        cameraStyle: "bright multi-camera feel, wide establishing",
        dialogueStyle:
          "dog explains the plan enthusiastically to another character",
      },
      {
        sceneIndex: 1,
        type: "complication",
        description: "Misunderstanding makes the plan go sideways.",
        hasConfessional: false,
        cameraStyle: "medium shots, back and forth between characters",
        dialogueStyle:
          "characters talking past each other, misunderstanding escalates",
      },
      {
        sceneIndex: 2,
        type: "crisis",
        description: "Everything falls apart based on the misunderstanding.",
        hasConfessional: false,
        cameraStyle: "faster cuts, higher energy",
        dialogueStyle:
          "everyone reacting to wrong information, comedy of errors",
      },
      {
        sceneIndex: 3,
        type: "resolution",
        description: "Misunderstanding resolved. Lesson learned. Hug optional.",
        hasConfessional: false,
        cameraStyle: "warm wide shot, everyone together",
        dialogueStyle:
          "warm resolution, callback to setup, everything is fine",
      },
    ],
    narratorRules: null,
    dialogueRules: `
      Setup/punchline structure in every exchange.
      Characters react big to small things.
      Running callbacks — reference something from scene 1 in scene 4.
      Tone: warm, energetic, everyone is lovably dumb.
      Example: "Okay here is the plan. The plan is perfect. 
                The plan involves the ball AND the squirrel. 
                I know how that sounds."
    `,
    episodeTitleFormat:
      "The One Where... format. 'The One With The Ball.' 'The One Where Bruno Lies.'",
    voiceSettings: { stability: 0.4, style: 0.6 },
  },

  reality_tv: {
    id: "reality_tv",
    label: "Reality TV",
    reference: "Real Housewives, Survivor, Love Island",
    sceneCount: 4,
    structure: [
      {
        sceneIndex: 0,
        type: "confessional",
        description: "Dog addresses camera. Sets up the drama. Names names.",
        hasConfessional: true,
        cameraStyle: "close-up confessional, dramatic lighting",
        dialogueStyle:
          "dog gives their take on the situation, calls someone out",
      },
      {
        sceneIndex: 1,
        type: "action",
        description: "The drama plays out. Alliances form.",
        hasConfessional: false,
        cameraStyle: "reality TV style, lots of reaction shots",
        dialogueStyle:
          "loaded exchanges, subtext heavy, everyone performing",
      },
      {
        sceneIndex: 2,
        type: "confessional",
        description: "Dog reacts to what just happened. Villain edit.",
        hasConfessional: true,
        cameraStyle: "close-up confessional",
        dialogueStyle: "dog explains what they actually meant, somehow worse",
      },
      {
        sceneIndex: 3,
        type: "action",
        description: "Dramatic confrontation or elimination moment.",
        hasConfessional: false,
        cameraStyle: "dramatic slow push-in, tense music implied",
        dialogueStyle: "loaded final exchange, cliff hanger energy",
      },
    ],
    narratorRules: null,
    dialogueRules: `
      Everything is dramatic. Alliances and betrayals over minor things.
      Characters talk about each other in confessionals.
      Subtext is always obvious.
      Tone: everything is personal, nothing is proportionate.
      Example: "I'm not saying Bruno took the ball. 
                I'm just saying Bruno was near the ball. 
                And now the ball is gone. 
                I'll let you draw your own conclusions."
    `,
    episodeTitleFormat:
      "Dramatic and ominous. 'Betrayal at the Park.' 'The Alliance.' 'Nobody Is Safe.'",
    voiceSettings: { stability: 0.2, style: 0.85 },
  },
} as const;

export type ComedyStyleId = keyof typeof COMEDY_STYLE_FORMATS;

export function getComedyStyle(styleId: string): ComedyStyleDef {
  const key = (styleId?.trim().toLowerCase() || "mockumentary") as ComedyStyleId;
  if (key in COMEDY_STYLE_FORMATS) {
    return COMEDY_STYLE_FORMATS[key] as ComedyStyleDef;
  }
  return COMEDY_STYLE_FORMATS.mockumentary as ComedyStyleDef;
}
