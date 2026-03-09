/** Art style definitions for the demo: name, emoji, short description, and API key for storage. */
export const ART_STYLES = [
  { key: "liveAction", name: "Live Cinematic", emoji: "📸", description: "Photorealistic, film-like" },
  { key: "cinematicCG", name: "3D Cinematic", emoji: "🎬", description: "Warm studio lighting, realistic fur" },
  { key: "anime", name: "Anime", emoji: "⚡", description: "Japanese cel illustration" },
  { key: "watercolor", name: "Watercolor", emoji: "🎨", description: "Soft, flowing paint" },
  { key: "comicBook", name: "Comic Book", emoji: "💬", description: "Bold ink & halftone dots" },
  { key: "storybook", name: "Storybook", emoji: "📖", description: "Children's book illustration" },
  { key: "pixelArt", name: "Pixel Art", emoji: "👾", description: "Retro 8-bit style" },
] as const;

export type ArtStyleKey = (typeof ART_STYLES)[number]["key"];

/** Prompt template per style for fal image-to-image (dog name + style description). */
export const STYLE_PROMPTS: Record<ArtStyleKey, (dogName: string) => string> = {
  liveAction: (dogName) =>
    `${dogName} the dog, photorealistic, cinematic lighting, film still, shallow depth of field, professional photography, 4K`,
  cinematicCG: (dogName) =>
    `${dogName} the dog, 3D CGI render, photorealistic fur simulation, cinematic studio lighting, depth of field, film quality`,
  anime: (dogName) =>
    `${dogName} the dog, anime illustration style, cel shaded, large sparkly eyes, clean linework, vibrant saturated colors`,
  watercolor: (dogName) =>
    `${dogName} the dog, watercolor painting style, soft wet-on-wet technique, flowing pigment, white paper texture, artistic portrait`,
  comicBook: (dogName) =>
    `${dogName} the dog, comic book illustration, bold ink outlines, halftone shading, dynamic superhero composition`,
  storybook: (dogName) =>
    `${dogName} the dog, children's book illustration, soft gouache texture, whimsical and friendly, warm pastel colors`,
  pixelArt: (dogName) =>
    `${dogName} the dog, pixel art, 16-bit retro game sprite, limited color palette, sharp pixels`,
};

/** Animation clip keys and prompts for fal Kling (image-to-video). */
export const ANIMATION_CLIP_PROMPTS: Record<
  string,
  (dogName: string, artStyle: string) => string
> = {
  rotation: (dogName, artStyle) =>
    `${dogName} slowly rotating 360 degrees, smooth turnaround, ${artStyle} style`,
  running: (dogName, artStyle) =>
    `${dogName} running forward happily, tongue out, ${artStyle} style, smooth loop`,
  barking: (dogName, artStyle) =>
    `${dogName} barking playfully, mouth opening and closing, ears perking up, ${artStyle} style`,
  wagging: (dogName, artStyle) =>
    `${dogName} tail wagging enthusiastically, whole body wiggling with joy, ${artStyle} style`,
  jumping: (dogName, artStyle) =>
    `${dogName} sitting then leaping up excitedly, landing and sitting again, ${artStyle} style`,
  headTilt: (dogName, artStyle) =>
    `${dogName} doing an adorable head tilt, ears flopping, curious expression, ${artStyle} style`,
};

export const ANIMATION_CLIP_LABELS: Record<string, string> = {
  rotation: "360° View",
  running: "Running",
  barking: "Barking",
  wagging: "Happy Dance",
  jumping: "Jump",
  headTilt: "Head Tilt",
};
