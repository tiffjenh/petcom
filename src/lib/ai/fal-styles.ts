import { fal } from "@fal-ai/client";
import { ART_STYLES, type ArtStyleKey } from "@/lib/art-styles";
import { STYLE_PROMPTS } from "@/lib/art-styles";

const VALID_STYLE_KEYS = new Set(ART_STYLES.map((s) => s.key));

const FAL_IMAGE_TO_IMAGE = "fal-ai/fast-lightning-sdxl/image-to-image";

const FAL_KLING = "fal-ai/kling-video/v1.6/standard/image-to-video";

function getFalConfig() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  console.log("Initializing fal with key prefix:", key.substring(0, 8));
  fal.config({ credentials: key });
}

/** Generate a single style image from dog photo using fal. */
export async function generateStyleImage(
  dogPhotoUrl: string,
  dogName: string,
  styleKey: ArtStyleKey
): Promise<string> {
  getFalConfig();
  console.log("FAL_KEY format check:", process.env.FAL_KEY?.substring(0, 15) + "...", "length:", process.env.FAL_KEY?.length);

  const promptFn = STYLE_PROMPTS[styleKey];
  if (!promptFn || !VALID_STYLE_KEYS.has(styleKey)) {
    throw new Error(`Unknown or unsupported style: ${styleKey}`);
  }
  const prompt = promptFn(dogName);

  console.log(`Generating style: ${styleKey}`, {
    model: FAL_IMAGE_TO_IMAGE,
    prompt: prompt.substring(0, 50),
  });

  // All styles use fast-lightning-sdxl image-to-image (one model, works within free concurrency)
  const result = (await fal.subscribe(FAL_IMAGE_TO_IMAGE, {
    input: {
      prompt,
      image_url: dogPhotoUrl,
      strength: 0.85,
      num_inference_steps: "4",
      image_size: "square_hd",
      num_images: 1,
    },
  })) as { data?: { images?: { url: string }[] } };
  const imageUrl = result?.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error(`No image URL for style ${styleKey}`);
  return imageUrl;
}

/** Generate one animation clip via fal Kling image-to-video. */
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
