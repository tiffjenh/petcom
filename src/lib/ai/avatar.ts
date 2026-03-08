import Replicate from "replicate";

function getReplicate() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is required");
  return new Replicate({ auth: token });
}

// SDXL: text-to-image for dog avatars (no photo)
const SDXL_MODEL =
  "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

// Face-to-sticker: image + prompt for human avatars (keeps face from photo)
const FACE_TO_STICKER_MODEL =
  "fofr/face-to-sticker:764d4827ea159608a07cdde8ddf1c6000019627515eb02b6b449695fd547e5ef";

const DOG_PROMPT_TEMPLATE =
  "Pixar 3D animated character portrait of a {{breed}} dog named {{name}}, big expressive eyes, warm lighting, friendly smile, Disney/Pixar art style, high detail fur, vibrant colors, white background, character sheet";

const HUMAN_PROMPT =
  "Pixar 3D animated character portrait based on this photo, same facial features and hair color as the photo, Pixar art style, warm expressive eyes, friendly expression, white background, character sheet";

function buildDogPrompt(name: string, breed: string | null): string {
  const breedStr = breed?.trim() || "dog";
  return DOG_PROMPT_TEMPLATE.replace(/\{\{name\}\}/g, name).replace(
    /\{\{breed\}\}/g,
    breedStr
  );
}

/** Generate Pixar-style dog avatar from name + breed (text-to-image via SDXL). */
export async function generateDogAvatar(
  name: string,
  breed: string | null
): Promise<string> {
  const prompt = buildDogPrompt(name, breed);
  const output = await getReplicate().run(
    SDXL_MODEL as `${string}/${string}:${string}`,
    {
      input: {
        prompt,
        width: 1024,
        height: 1024,
        num_outputs: 1,
        apply_watermark: false,
      },
    }
  );
  return extractImageUrl(output);
}

/** Generate Pixar-style human avatar from photo (image-to-image via face-to-sticker). */
export async function generateHumanAvatar(photoUrl: string): Promise<string> {
  const output = await getReplicate().run(
    FACE_TO_STICKER_MODEL as `${string}/${string}:${string}`,
    {
      input: {
        image: photoUrl,
        prompt: HUMAN_PROMPT,
        prompt_strength: 4.5,
        instant_id_strength: 0.7,
      },
    }
  );
  return extractImageUrl(output);
}

function extractImageUrl(output: unknown): string {
  if (typeof output === "string") return output;
  const arr = Array.isArray(output) ? output : [output];
  const first = arr[0];
  if (!first) throw new Error("Avatar generation returned no output");
  if (typeof first === "string") return first;
  if (typeof (first as { url?: string }).url === "string")
    return (first as { url: string }).url;
  if (typeof (first as { url?: () => string }).url === "function")
    return (first as { url: () => string }).url();
  throw new Error("Avatar generation returned invalid output");
}
