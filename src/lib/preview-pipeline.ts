import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateVideoClip, generateSceneClip } from "@/lib/ai/replicate";
import { generateSpeechToBuffer } from "@/lib/ai/elevenlabs";
import { generateDogAvatar } from "@/lib/ai/avatar";
import * as astria from "@/lib/astria";
import * as fal from "@/lib/fal";
import {
  downloadToTemp,
  assembleTrailer,
  assembleTrailerFromClips,
  readFile,
  unlink,
} from "@/lib/ffmpeg";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const COMEDY_STYLES = [
  "Modern Family",
  "Friends",
  "Parks and Recreation",
  "How I Met Your Mother",
  "The Office",
  "Brooklyn Nine-Nine",
] as const;

function pickComedyStyle(): string {
  return COMEDY_STYLES[Math.floor(Math.random() * COMEDY_STYLES.length)];
}

const DEFAULT_SCENES = [
  "sitting and looking at the camera with a curious expression",
  "wagging tail happily and perking ears up",
  "running forward playfully with tongue out",
];

async function generatePreviewScript(
  dogName: string,
  comedyStyle: string
): Promise<{
  narratorText: string;
  thoughtBubbleText: string;
  sceneDescriptions: [string, string, string];
}> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Write a 30-second trailer for a Pixar-style sitcom starring a dog named ${dogName}. Comedy style: ${comedyStyle}. 
Output JSON only with these keys:
- narratorText: 1-2 sentences for a warm narrator voiceover (e.g. "Meet ${dogName}. This week, one nap turns into the greatest adventure of the year.")
- thoughtBubbleText: one short funny inner thought from the dog (e.g. "Why is the vacuum back? I thought we had a deal.")
- sceneDescriptions: array of exactly 3 short scene descriptions for 5-second video clips (e.g. ["sitting and looking at camera", "wagging tail happily", "running forward playfully"])`,
      },
    ],
  });
  const textBlock = response.content.find((c) => c.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";
  const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim()) as {
    narratorText?: string;
    thoughtBubbleText?: string;
    sceneDescriptions?: string[];
  };
  const scenes = parsed.sceneDescriptions?.slice(0, 3);
  const sceneDescriptions: [string, string, string] = [
    scenes?.[0]?.slice(0, 80) ?? DEFAULT_SCENES[0],
    scenes?.[1]?.slice(0, 80) ?? DEFAULT_SCENES[1],
    scenes?.[2]?.slice(0, 80) ?? DEFAULT_SCENES[2],
  ];
  return {
    narratorText: parsed.narratorText?.slice(0, 200) ?? "Meet " + dogName + ".",
    thoughtBubbleText: parsed.thoughtBubbleText?.slice(0, 100) ?? "...",
    sceneDescriptions,
  };
}

const LORA_WAIT_MS = 2 * 60 * 1000; // 2 min max wait for LoRA on demo
const LORA_POLL_MS = 15 * 1000; // poll every 15s

const PIXAR_AVATAR_PROMPT = (dogName: string) =>
  `ohwx dog, ${dogName}, Pixar 3D animated character portrait, big expressive eyes, warm lighting, friendly smile, Disney/Pixar art style, high detail fur, vibrant colors, white background, character sheet`;

async function getAvatarUrl(
  dogName: string,
  photoUrls: string[],
  existingLoraId: string | null
): Promise<string> {
  let tuneId: string | null = existingLoraId ?? null;

  if (!tuneId && process.env.ASTRIA_API_KEY && photoUrls.length > 0) {
    try {
      tuneId = await astria.trainDogLora(dogName, photoUrls);
      const deadline = Date.now() + LORA_WAIT_MS;
      while (Date.now() < deadline) {
        const status = await astria.checkLoraStatus(tuneId);
        if (status === "ready") break;
        await new Promise((r) => setTimeout(r, LORA_POLL_MS));
      }
      const status = await astria.checkLoraStatus(tuneId);
      if (status !== "ready") tuneId = null;
    } catch (e) {
      console.error("[Astria] LoRA training failed:", e);
      tuneId = null;
    }
  }

  if (tuneId && process.env.ASTRIA_API_KEY) {
    try {
      return await astria.generateWithLora(
        tuneId,
        PIXAR_AVATAR_PROMPT(dogName)
      );
    } catch (e) {
      console.error("[Astria] generateWithLora failed:", e);
    }
  }

  try {
    return await generateDogAvatar(dogName, null);
  } catch (e) {
    console.error("[Replicate] SDXL avatar fallback failed:", e);
    throw new Error("Could not generate avatar");
  }
}

export async function runPreviewPipeline(jobId: string): Promise<void> {
  const record = await prisma.previewGeneration.findUnique({
    where: { jobId },
  });
  if (!record || record.status !== "pending") return;

  await prisma.previewGeneration.update({
    where: { jobId },
    data: { status: "processing" },
  });

  const comedyStyle = record.comedyStyle ?? pickComedyStyle();
  const dogName = record.dogName;
  const breed = "";

  let avatarUrl: string | null = record.avatarUrl ?? null;
  let clipPaths: string[] = [];
  let audioPath: string | null = null;
  let outPath: string | null = null;

  try {
    if (!avatarUrl) {
      avatarUrl = await getAvatarUrl(dogName, record.photoUrls, null);
    }
    await prisma.previewGeneration.update({
      where: { jobId },
      data: { avatarUrl, comedyStyle },
    });

    const {
      narratorText,
      thoughtBubbleText: _thoughtBubbleText,
      sceneDescriptions,
    } = await generatePreviewScript(dogName, comedyStyle);

    const audioBuffer = await generateSpeechToBuffer(narratorText);
    audioPath = join(tmpdir(), `${randomUUID()}.mp3`);
    await writeFile(audioPath, audioBuffer);

    let klingClips: string[] = [];
    try {
      const scenes: fal.SceneData[] = sceneDescriptions.map((desc, i) => ({
        sceneIndex: i,
        description: desc,
      }));
      klingClips = await Promise.all(
        scenes.map((scene) =>
          fal.animateScene(
            avatarUrl!,
            fal.generateScenePrompt(scene, dogName, breed),
            5
          )
        )
      );
    } catch (e) {
      console.error("[fal] Kling scene animation failed:", e);
    }

    if (klingClips.length >= 3) {
      const paths = await Promise.all(
        klingClips.map((url) => downloadToTemp(url, "mp4"))
      );
      clipPaths = paths;
      outPath = join(tmpdir(), `${randomUUID()}_trailer.mp4`);
      await assembleTrailerFromClips(paths, audioPath, outPath);
    } else {
      try {
        const svdUrl = await generateSceneClip(avatarUrl!, undefined);
        const singlePath = await downloadToTemp(svdUrl, "mp4");
        clipPaths = [singlePath];
        outPath = join(tmpdir(), `${randomUUID()}_trailer.mp4`);
        await assembleTrailer(singlePath, audioPath, outPath);
      } catch (e) {
        console.error("[Replicate] SVD fallback failed:", e);
        throw new Error("Could not generate trailer clips");
      }
    }

    const bucket =
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "pawcast-media";
    const key = `previews/${record.jobId}/trailer.mp4`;
    const buf = await readFile(outPath!);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(bucket).upload(key, buf, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(key);
    const trailerUrl = urlData.publicUrl;

    await prisma.previewGeneration.update({
      where: { jobId },
      data: {
        status: "completed",
        trailerUrl,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Trailer generation failed";
    console.error("[Preview pipeline]", raw);
    await prisma.previewGeneration.update({
      where: { jobId },
      data: {
        status: "failed",
        errorMessage: "Trailer generation failed",
      },
    });
    throw err;
  } finally {
    const toUnlink = [...clipPaths, audioPath, outPath].filter(
      Boolean
    ) as string[];
    for (const p of toUnlink) {
      try {
        await unlink(p);
      } catch (_) {}
    }
  }
}
