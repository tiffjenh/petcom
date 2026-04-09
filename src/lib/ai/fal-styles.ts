import { fal } from "@fal-ai/client";

const FAL_AVATAR = "fal-ai/flux-pro/kontext";
const FAL_KLING = "fal-ai/kling-video/v1.6/standard/image-to-video"; // PAID ONLY

const PIXAR_HUMAN_AVATAR_PROMPT =
  "Pixar 3D animated person, consistent character design, " +
  "warm expressive face, Disney animation style, soft lighting, " +
  "same person as reference photos.";

function getFalConfig() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  fal.config({ credentials: key });
}

/** Return type: primary (images[0]) and alt (images[1]) for saving to dog.animatedAvatar and dog.animatedAvatarAlt. */
export type GenerateDogAvatarResult = { primary: string; alt: string };

/**
 * Build the V1 Pixar avatar prompt (Dug Days / Up style). Use EXACTLY per spec.
 */
function buildDogAvatarPrompt(dogName: string, breed: string | null): string {
  const breedLabel = breed ?? "dog";
  return `Create a Pixar/Disney 3D animated character portrait of a ${breedLabel} named ${dogName}.

REFERENCE: The dog in the uploaded photos. Use them as your character brief — match the fur colors exactly.

CHARACTER DESIGN:
Fur: EXACT color pattern from photos — all browns, creams, mixed tones precisely replicated. Soft, round, voluminous — plush 3D CGI fur, not realistic. Curly texture with soft rounded clumps.

Face: Large rounded head, very short muzzle, wide flat face, puppy-like proportions. HUGE forward-facing eyes, much larger than realistic — warm brown irises, detailed catchlights, slight moisture on lower eyelid. Small round wet nose with bright specular highlight. Happy open mouth, pink tongue slightly out.

Body: Short stocky legs, round fluffy body, compact and toylike. Plush animal proportions. Tail up and fluffy.

Expression: Pure joy and enthusiasm.

RENDERING:
Full Pixar CGI render quality. Subsurface scattering on ears — glow warm pink when backlit. Soft shadows underneath on grass. Ambient occlusion in fur clumps. Depth of field — dog sharp, background soft bokeh.

LIGHTING:
Warm golden afternoon sun from upper right. Soft fill light from left. Subtle rim light on fur edges. Warm color temperature overall.

BACKGROUND:
Lush perfectly green grass sharp under paws, soft bokeh grass behind. Bright blue sky, wispy clouds, suburban park.

COMPOSITION:
Full body shot, dog centered, slight 3/4 angle. Dog takes up 60% of frame height. Looking toward camera with happy expression.

REMOVE: No harness, no collar, no leash, no accessories.

STYLE: Pixar's Dug from Up (2009) and Dug Days (Disney+ 2021). Mistakable for official Pixar promotional character art.`;
}

/**
 * Generate two Pixar-style dog avatars from reference photos (up to 3 URLs).
 * V1 spec: fal-ai/flux-pro/kontext, num_images: 2, guidance_scale: 8.0, aspect_ratio 3:4.
 * Primary → dog.animatedAvatar, backup → dog.animatedAvatarAlt.
 */
export async function generateDogAvatar(
  photoUrls: string[],
  dogName: string,
  breed?: string | null
): Promise<GenerateDogAvatarResult> {
  getFalConfig();
  const refs = (photoUrls ?? []).slice(0, 3);
  const primaryPhoto = refs[0];
  if (!primaryPhoto) throw new Error("At least one dog photo URL is required");

  const prompt = buildDogAvatarPrompt(dogName, breed ?? null);
  console.log("Generating dog avatar", { model: FAL_AVATAR, dogName, num_images: 2 });

  const result = (await fal.subscribe(FAL_AVATAR, {
    input: {
      image_url: primaryPhoto,
      prompt,
      num_images: 2,
      guidance_scale: 8.0,
      aspect_ratio: "3:4",
      safety_tolerance: "2",
    },
  })) as { data?: { images?: { url: string }[] } };

  const images = result?.data?.images ?? [];
  const primary = images[0]?.url;
  const alt = images[1]?.url;
  if (!primary) throw new Error("Avatar generation returned no image URL");
  return {
    primary,
    alt: alt ?? primary,
  };
}

/**
 * Generate a Pixar-style human avatar from reference photos.
 * Uses fal-ai/flux-pro/kontext. For cast owners (owner_1, owner_2).
 */
export async function generateHumanAvatarFal(photoUrls: string[]): Promise<string> {
  getFalConfig();
  const primaryPhoto = photoUrls[0];
  if (!primaryPhoto) throw new Error("At least one photo URL is required for human avatar");

  console.log("Generating human avatar", { model: FAL_AVATAR });

  const result = (await fal.subscribe(FAL_AVATAR, {
    input: {
      image_url: primaryPhoto,
      prompt: PIXAR_HUMAN_AVATAR_PROMPT,
      num_images: 1,
    },
  })) as { data?: { images?: { url: string }[] } };

  const imageUrl = result?.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error("Human avatar generation returned no image URL");
  return imageUrl;
}

/** Generate one animation clip via fal Kling image-to-video. PAID ONLY. */
export async function generateKlingClip(
  styleImageUrl: string,
  prompt: string
): Promise<string> {
  getFalConfig();
  const result = await fal.subscribe(FAL_KLING, {
    input: {
      prompt,
      image_url: styleImageUrl,
    },
  });
  const video = (result.data as { video?: { url: string } })?.video;
  const url = video?.url;
  if (!url) throw new Error("Kling returned no video URL");
  return url;
}

/** Prefix for every Hailuo scene prompt so all clips match Pixar/Disney 3D style. */
export const HAILUO_SCENE_PROMPT_PREFIX =
  "Pixar/Disney 3D animated scene, ";
export const HAILUO_SCENE_PROMPT_SUFFIX =
  " Animation quality matching Pixar feature films. Soft volumetric fur, expressive animated faces, warm cinematic lighting, vibrant colors.";
