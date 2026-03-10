/** Single art style: Pixar/Disney 3D cinematic. No style picker — one avatar only. */
export const ART_STYLES = [
  { key: "cinematicCG", name: "3D Cinematic", emoji: "🎬", description: "Warm studio lighting, realistic fur" },
] as const;

export type ArtStyleKey = (typeof ART_STYLES)[number]["key"];

/** Prompt for the single Pixar-style dog avatar (used by generateDogAvatar). */
export const STYLE_PROMPTS: Record<ArtStyleKey, (dogName: string) => string> = {
  cinematicCG: (dogName) =>
    `${dogName} the dog as a Pixar and Disney 3D animated movie character, ` +
    `same breed same body shape same fur color same face as the reference photo, ` +
    `Zootopia character design, Dug from the movie UP, ` +
    `large warm expressive Disney eyes, detailed CGI fur texture, ` +
    `soft warm studio lighting, smooth 3D rendered look, ` +
    `vibrant friendly Pixar color palette, clean neutral background, ` +
    `NOT a different animal, NOT a creature, just the same dog in Pixar style`,
};

export const ANIMATION_CLIP_PROMPTS: Record<
  string,
  (dogName: string, artStyle: string) => string
> = {};

export const ANIMATION_CLIP_LABELS: Record<string, string> = {};
