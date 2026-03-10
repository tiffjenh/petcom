import { fal } from "@fal-ai/client";

const FAL_AVATAR = "fal-ai/flux-pro/kontext";
const FAL_KLING = "fal-ai/kling-video/v1.6/standard/image-to-video"; // PAID ONLY

const PIXAR_AVATAR_PROMPT =
  "Transform this dog into a Pixar/Disney 3D animated character. " +
  "Keep the exact same breed, fur color, face shape, body proportions, " +
  "and any distinctive markings as this reference dog. Style like Dug from Up " +
  "or the dogs from Zootopia: large warm expressive eyes, smooth CGI fur, " +
  "vibrant Pixar color palette, soft studio lighting, white background. " +
  "This must be recognizably the same dog, just Pixar-animated.";

function getFalConfig() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  fal.config({ credentials: key });
}

/**
 * Generate a single Pixar-style dog avatar from reference photos.
 * Uses fal-ai/flux-pro/kontext. Saves to Dog.animatedAvatar or used for demo style.
 */
export async function generateDogAvatar(
  photoUrls: string[],
  dogName: string
): Promise<string> {
  getFalConfig();
  const primaryPhoto = photoUrls[0];
  if (!primaryPhoto) throw new Error("At least one dog photo URL is required");

  const prompt = `${dogName}, ${PIXAR_AVATAR_PROMPT}`;
  console.log("Generating dog avatar", { model: FAL_AVATAR, dogName });

  const result = (await fal.subscribe(FAL_AVATAR, {
    input: {
      image_url: primaryPhoto,
      prompt,
      num_images: 1,
    },
  })) as { data?: { images?: { url: string }[] } };

  const imageUrl = result?.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error("Avatar generation returned no image URL");
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
