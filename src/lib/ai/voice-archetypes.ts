/**
 * Personality-based voice archetypes. One voice per archetype; dogs are
 * auto-assigned an archetype from their personality chips. No per-dog voice pick.
 */

export const VOICE_ARCHETYPES = {
  THE_PROFESSIONAL: {
    id: "professional",
    description: "Takes everything seriously. Deadpan. Confident.",
    matchingChips: ["bossy", "independent", "sneaky", "fierce"],
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_PROFESSIONAL ?? "",
    stability: 0.3,
    style: 0.7,
    speakingStyle:
      "Speak with total confidence and dry deadpan delivery. Every sentence is a statement of fact. Short punchy sentences. Never uncertain.",
  },
  THE_CHAOS_AGENT: {
    id: "chaos",
    description: "Loud, fast, escalates everything, easily distracted.",
    matchingChips: ["chaotic", "vocal", "goofy", "dramatic"],
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_CHAOS ?? "",
    stability: 0.1,
    style: 0.95,
    speakingStyle:
      "Speak very fast and excitedly. Sentences run together. Easily distracted mid-thought. Everything is THE MOST IMPORTANT THING EVER.",
  },
  THE_SWEETHEART: {
    id: "sweetheart",
    description: "Warm, earnest, means well, slightly oblivious.",
    matchingChips: ["cuddly", "sweet", "needy", "clingy"],
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_SWEETHEART ?? "",
    stability: 0.6,
    style: 0.4,
    speakingStyle:
      "Warm and genuine. Slightly too earnest. Finds the best in everything. Completely unaware of how chaotic they are.",
  },
  THE_PHILOSOPHER: {
    id: "philosopher",
    description: "Speaks slowly, dramatically, in profound fragments.",
    matchingChips: ["anxious", "lazy", "independent"],
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_PHILOSOPHER ?? "",
    stability: 0.5,
    style: 0.6,
    speakingStyle:
      "Slow deliberate delivery. Long pauses between thoughts. Treats minor events as deeply significant. Speaks in fragments that sound wise.",
  },
  THE_FOODIE: {
    id: "foodie",
    description: "Everything comes back to food. Enthusiastic. Single-minded.",
    matchingChips: ["foodie"],
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_FOODIE ?? "",
    stability: 0.3,
    style: 0.7,
    speakingStyle:
      "Enthusiastic and easily distracted by anything food-related. Mid-sentence pivots to snacks. Denies all food motivation while clearly food-motivated.",
  },
  THE_DRAMATIC: {
    id: "dramatic",
    description: "Every moment is a tragedy or triumph. Theatrical.",
    matchingChips: ["dramatic", "vocal"],
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_DRAMATIC ?? "",
    stability: 0.2,
    style: 0.9,
    speakingStyle:
      "Full theatrical delivery. Minor inconveniences = Shakespearean tragedy. Small victories = historic triumph. Extremely loud internal monologue.",
  },
  THE_CHILL_GUY: {
    id: "chill",
    description: "Unbothered. Speaks slowly. Short sentences. Nothing matters.",
    matchingChips: ["lazy"],
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_CHILL ?? "",
    stability: 0.7,
    style: 0.1,
    speakingStyle:
      "Very slow, flat delivery. Short sentences only. Deeply unbothered by everything. Occasionally profound by accident.",
  },
  THE_NARRATOR: {
    id: "narrator",
    description: "Default narrator voice for non-dog characters.",
    matchingChips: [] as string[],
    elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_NARRATOR ?? "",
    stability: 0.4,
    style: 0.5,
    speakingStyle:
      "Warm documentary narrator. Dry wit. Treats mundane events as historically significant.",
  },
} as const;

export type VoiceArchetype = (typeof VOICE_ARCHETYPES)[keyof typeof VOICE_ARCHETYPES];

/** Resolve voice ID at runtime (env may be set later). */
export function getArchetypeVoiceId(archetypeId: string): string {
  const a = Object.values(VOICE_ARCHETYPES).find((x) => x.id === archetypeId);
  const id = a?.elevenlabsVoiceId?.trim();
  if (id) return id;
  return VOICE_ARCHETYPES.THE_NARRATOR.elevenlabsVoiceId || "";
}

/** Get full voice config for an archetype (for TTS). */
export function getVoiceConfigForArchetype(archetypeId: string): {
  voiceId: string;
  stability: number;
  style: number;
  similarity_boost: number;
} {
  const a =
    Object.values(VOICE_ARCHETYPES).find((x) => x.id === archetypeId) ??
    VOICE_ARCHETYPES.THE_PROFESSIONAL;
  const voiceId =
    a.elevenlabsVoiceId?.trim() || VOICE_ARCHETYPES.THE_NARRATOR.elevenlabsVoiceId || "";
  return {
    voiceId,
    stability: a.stability,
    style: a.style,
    similarity_boost: 0.85,
  };
}

/**
 * Auto-assign archetype from personality chips. Used when a dog is created.
 */
export function assignVoiceArchetype(
  personalityChips: string[]
): (typeof VOICE_ARCHETYPES)[keyof typeof VOICE_ARCHETYPES] {
  const normalized = personalityChips.map((c) => String(c).toLowerCase().trim());
  const scores = Object.values(VOICE_ARCHETYPES).map((archetype) => ({
    archetype,
    score: normalized.filter((chip) =>
      archetype.matchingChips.includes(chip)
    ).length,
  }));
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.score > 0 ? best.archetype : VOICE_ARCHETYPES.THE_PROFESSIONAL;
}
