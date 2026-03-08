import Replicate from "replicate";

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is required");
  return new Replicate({ auth: token });
}

// Stable Video Diffusion: image-to-video (3–5 sec clip at 6fps, 25 frames)
const SVD_MODEL =
  "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b81724346";

const SCENE_CONCURRENCY = 2;

export async function generateVideoClip(
  imageUrl: string,
  _style?: string
): Promise<string> {
  const output = await getReplicate().run(SVD_MODEL as `${string}/${string}:${string}`, {
    input: {
      input_image: imageUrl,
      num_frames: 25,
      fps: 6,
      motion_bucket_id: 127,
      cond_aug: 0.02,
    },
  });

  if (typeof output === "string") return output;
  const url = Array.isArray(output) ? output[0] : (output as { url?: string })?.url;
  if (typeof url === "string") return url;
  throw new Error("Replicate SVD returned no video URL");
}

/** Generate one short animated clip for a scene (avatar image + optional scene prompt for logging). */
export async function generateSceneClip(
  avatarImageUrl: string,
  _sceneDescription?: string
): Promise<string> {
  const output = await getReplicate().run(SVD_MODEL as `${string}/${string}:${string}`, {
    input: {
      input_image: avatarImageUrl,
      num_frames: 25,
      fps: 6,
      motion_bucket_id: 127,
      cond_aug: 0.02,
    },
  });
  if (typeof output === "string") return output;
  const url = Array.isArray(output) ? output[0] : (output as { url?: string })?.url;
  if (typeof url === "string") return url;
  throw new Error("Replicate SVD returned no video URL");
}

/** Run up to CONCURRENCY scene generations in parallel. Returns clip URLs in same order as inputs. */
export async function generateSceneClips(
  inputs: { avatarImageUrl: string; sceneDescription?: string }[]
): Promise<string[]> {
  const results: string[] = new Array(inputs.length);
  const run = async (index: number) => {
    const { avatarImageUrl, sceneDescription } = inputs[index];
    results[index] = await generateSceneClip(avatarImageUrl, sceneDescription);
  };
  for (let i = 0; i < inputs.length; i += SCENE_CONCURRENCY) {
    const chunk = inputs.slice(i, i + SCENE_CONCURRENCY);
    await Promise.all(chunk.map((_, j) => run(i + j)));
  }
  return results;
}
