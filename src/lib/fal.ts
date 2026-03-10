import { fal } from "@fal-ai/client";

// PAID ONLY — never call from demo routes. Minimax ~$0.015–0.025/video (vs Kling higher).
const FAL_MINIMAX = "fal-ai/minimax-video/image-to-video";
const FAL_HAILUO_02 = "fal-ai/minimax/hailuo-02/standard/image-to-video";

function getFalConfig() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is required");
  fal.config({ credentials: key });
}

export type SceneData = {
  sceneIndex: number;
  description: string;
};

/** Generate one animated scene clip via Minimax. Returns video URL. PAID ONLY — never call from demo routes. */
export async function animateScene(
  imageUrl: string,
  prompt: string,
  _duration: number = 5
): Promise<string> {
  getFalConfig();
  const result = await fal.subscribe(FAL_MINIMAX, {
    input: {
      prompt,
      image_url: imageUrl,
    },
  });
  const video = (result.data as { video?: { url: string } })?.video;
  const url = video?.url;
  if (!url) throw new Error("Minimax returned no video URL");
  return url;
}

/**
 * Generate one scene clip via Hailuo 02 image-to-video.
 * Uses the dog's animated avatar as the first frame. PAID ONLY.
 * Duration: API supports "6" | "10" only (~$0.34/episode at 4×6s 512P + ~$0.13 other ≈ $0.50/episode).
 */
export async function hailuoImageToVideo(
  imageUrl: string,
  prompt: string,
  options?: { duration?: 6 | 10; resolution?: "768P" | "512P" }
): Promise<string> {
  getFalConfig();
  const duration: "6" | "10" = options?.duration === 10 ? "10" : "6";
  const resolution = options?.resolution ?? "512P";
  const result = await fal.subscribe(FAL_HAILUO_02, {
    input: {
      image_url: imageUrl,
      prompt,
      prompt_optimizer: true,
      duration,
      resolution,
    },
  });
  const video = (result.data as { video?: { url: string } })?.video;
  const url = video?.url;
  if (!url) throw new Error("Hailuo 02 returned no video URL");
  return url;
}

/** Build the animation prompt for a trailer scene (tuned for photorealistic animal motion). */
export function generateScenePrompt(
  scene: SceneData,
  dogName: string,
  breed: string
): string {
  const breedStr = breed?.trim() || "dog";
  return [
    `${dogName} the ${breedStr}`,
    scene.description,
    "photorealistic CGI dog, movie-quality animal VFX,",
    "smooth natural animal movement, expressive face,",
    "cinematic camera, shallow depth of field",
  ]
    .filter(Boolean)
    .join(", ");
}
