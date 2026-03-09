import { fal } from "@fal-ai/client";

const FAL_KLING = "fal-ai/kling-video/v1.6/standard/image-to-video";

function getFalConfig() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is required");
  fal.config({ credentials: key });
}

export type SceneData = {
  sceneIndex: number;
  description: string;
};

/** Generate one animated scene clip via Kling. Returns video URL. */
export async function animateScene(
  imageUrl: string,
  prompt: string,
  duration: number = 5
): Promise<string> {
  getFalConfig();
  const result = await fal.subscribe(FAL_KLING, {
    input: {
      prompt,
      image_url: imageUrl,
      duration: String(Math.min(10, Math.max(5, duration))) as "5" | "10",
    },
  });
  const video = (result.data as { video?: { url?: string } })?.video;
  const url = video?.url;
  if (!url) throw new Error("Kling returned no video URL");
  return url;
}

/** Build the animation prompt for a trailer scene. */
export function generateScenePrompt(
  scene: SceneData,
  dogName: string,
  breed: string
): string {
  const breedStr = breed?.trim() || "dog";
  return `${dogName} the ${breedStr}, ${scene.description}, Pixar-style 3D animated, smooth motion, vertical video`;
}
