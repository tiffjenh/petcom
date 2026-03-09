import axios, { type AxiosInstance } from "axios";

const ASTRIA_BASE = "https://api.astria.ai";

function getClient(): AxiosInstance {
  const key = process.env.ASTRIA_API_KEY;
  if (!key) throw new Error("ASTRIA_API_KEY is required");
  return axios.create({
    baseURL: ASTRIA_BASE,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
}

/** Train a LoRA from dog photos. Returns tune_id (string). Runs async on Astria; training takes 10–20 min. */
export async function trainDogLora(
  dogName: string,
  photoUrls: string[],
  callbackUrl?: string
): Promise<string> {
  if (photoUrls.length === 0) throw new Error("At least one photo URL required");
  const client = getClient();
  const title = `dog-${dogName}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const tune: Record<string, unknown> = {
    title,
    name: "dog",
    branch: "sdxl1",
    model_type: "lora",
    image_urls: photoUrls.slice(0, 3),
  };
  if (callbackUrl) tune.callback = callbackUrl;
  const { data } = await client.post<{ id: number }>("/tunes", { tune });
  if (data?.id == null) throw new Error("Astria tune create returned no id");
  return String(data.id);
}

/** Check if a tune is ready. Returns "training" or "ready". */
export async function checkLoraStatus(
  tuneId: string
): Promise<"training" | "ready"> {
  const client = getClient();
  const { data } = await client.get<{ trained_at?: string | null }>(
    `/tunes/${tuneId}`
  );
  if (data?.trained_at) return "ready";
  return "training";
}

/** Generate an image using the trained LoRA. Returns image URL. Polls until prompt completes. */
export async function generateWithLora(
  tuneId: string,
  prompt: string
): Promise<string> {
  const client = getClient();
  const { data: promptData } = await client.post<{ id: number }>(
    `/tunes/${tuneId}/prompts`,
    {
      prompt: {
        text: prompt,
        super_resolution: true,
        face_correct: true,
      },
    }
  );
  if (promptData?.id == null)
    throw new Error("Astria prompt create returned no id");
  const promptId = promptData.id;

  const maxAttempts = 60;
  const intervalMs = 3000;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const { data: p } = await client.get<{
      image_url?: string;
      image_urls?: string[];
      images?: { url?: string }[];
    }>(`/tunes/${tuneId}/prompts/${promptId}`);
    const url =
      p?.image_url ??
      (Array.isArray(p?.image_urls) && p.image_urls[0]) ??
      (Array.isArray(p?.images) && p.images[0]?.url);
    if (typeof url === "string") return url;
  }
  throw new Error("Astria prompt did not return an image in time");
}
