import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateSceneClip } from "@/lib/ai/replicate";
import { generateSpeechToBuffer } from "@/lib/ai/elevenlabs";
import { generateDogAvatar as generateDogAvatarFal } from "@/lib/ai/fal-styles";
import {
  getArtStyleVideoSuffix,
  type TrailerScript,
} from "@/lib/ai/trailer-script";
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
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Write a 30-second trailer for a Pixar-style sitcom starring a dog named ${dogName}. Comedy style: ${comedyStyle}.
Output JSON only with these keys:
- narratorText: 1-2 sentences for a warm narrator voiceover
- thoughtBubbleText: one short funny inner thought from the dog
- sceneDescriptions: array of exactly 3 short scene descriptions for 5-second video clips`,
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

/**
 * Generate Pixar-style avatar: use FAL (photo refs) when we have photoUrls,
 * otherwise existing cached avatar.
 */
async function getAvatarUrl(
  dogName: string,
  photoUrls: string[],
  existingAvatarUrl: string | null
): Promise<string> {
  if (existingAvatarUrl) return existingAvatarUrl;
  if (photoUrls.length === 0) throw new Error("No photo URLs for avatar");

  try {
    return await generateDogAvatarFal(photoUrls, dogName);
  } catch (e) {
    console.error("[FAL] Avatar failed:", e);
    throw new Error("Could not generate avatar");
  }
}

export async function runPreviewPipeline(jobId: string): Promise<void> {
  const record = await prisma.previewGeneration.findUnique({ where: { jobId } });
  if (!record || record.status !== "pending") return;

  await prisma.previewGeneration.update({
    where: { jobId },
    data: { status: "processing" },
  });

  const comedyStyle = record.comedyStyle ?? pickComedyStyle();
  const dogName = record.dogName;
  const breed = "";
  const trailerScript = record.trailerScript as TrailerScript | null;
  const artStyle = record.artStyle ?? "liveAction";

  let clipPaths: string[] = [];
  let audioPath: string | null = null;
  let outPath: string | null = null;

  try {
    // ── STEP 1: avatar + script in parallel ─────────────────────────────────
    // Avatar and script generation are independent — run them at the same time.
    const [avatarUrl, scriptData] = await Promise.all([
      getAvatarUrl(dogName, record.photoUrls, record.avatarUrl ?? null),
      (async () => {
        if (
          trailerScript &&
          Array.isArray(trailerScript.scenes) &&
          trailerScript.scenes.length >= 3
        ) {
          const narratorText =
            [trailerScript.openingSlate, trailerScript.endSlate]
              .filter(Boolean)
              .join(" ") || `Meet ${dogName}. Coming this fall.`;
          return {
            narratorText,
            sceneDescriptions: [
              trailerScript.scenes[0]?.description ?? "",
              trailerScript.scenes[1]?.description ?? "",
              trailerScript.scenes[2]?.description ?? "",
            ] as [string, string, string],
          };
        }
        const generated = await generatePreviewScript(dogName, comedyStyle);
        return {
          narratorText: generated.narratorText,
          sceneDescriptions: generated.sceneDescriptions,
        };
      })(),
    ]);

    await prisma.previewGeneration.update({
      where: { jobId },
      data: { avatarUrl, comedyStyle },
    });

    const { narratorText, sceneDescriptions } = scriptData;
    const artStyleSuffix = getArtStyleVideoSuffix(artStyle);

    // ── STEP 2: audio + all 3 clips in parallel ──────────────────────────────
    // Previously: audio first, then clips sequentially.
    // Now: all 4 tasks fire at once. Saves ~15-30s.
    const clipPromises =
      trailerScript &&
      Array.isArray(trailerScript.scenes) &&
      trailerScript.scenes.length >= 3
        ? trailerScript.scenes.slice(0, 3).map((scene) => {
            const fullPrompt = [scene.visualPrompt, artStyleSuffix]
              .filter(Boolean)
              .join(", ");
            return fal
              .animateScene(
                avatarUrl,
                fullPrompt,
                typeof scene.duration === "number" ? scene.duration : 5
              )
              .catch((e) => {
                console.error("[fal] Kling clip failed:", e);
                return null;
              });
          })
        : sceneDescriptions.map((desc, i) =>
            fal
              .animateScene(
                avatarUrl,
                [
                  fal.generateScenePrompt(
                    { sceneIndex: i, description: desc },
                    dogName,
                    breed
                  ),
                  artStyleSuffix,
                ]
                  .filter(Boolean)
                  .join(", "),
                5
              )
              .catch((e) => {
                console.error("[fal] Kling clip failed:", e);
                return null;
              })
          );

    const [audioBuffer, ...klingResults] = await Promise.all([
      generateSpeechToBuffer(narratorText),
      ...clipPromises,
    ]);

    // Write audio to temp file
    audioPath = join(tmpdir(), `${randomUUID()}.mp3`);
    await writeFile(audioPath, audioBuffer as Buffer);

    const klingClips = klingResults.filter((u): u is string => typeof u === "string");

    // ── STEP 3: assemble ─────────────────────────────────────────────────────
    if (klingClips.length >= 3) {
      const paths = await Promise.all(
        klingClips.map((url) => downloadToTemp(url, "mp4"))
      );
      clipPaths = paths;
      outPath = join(tmpdir(), `${randomUUID()}_trailer.mp4`);
      await assembleTrailerFromClips(paths, audioPath, outPath);
    } else {
      // Fallback: single SVD clip
      try {
        const svdUrl = await generateSceneClip(avatarUrl, undefined);
        const singlePath = await downloadToTemp(svdUrl, "mp4");
        clipPaths = [singlePath];
        outPath = join(tmpdir(), `${randomUUID()}_trailer.mp4`);
        await assembleTrailer(singlePath, audioPath, outPath);
      } catch (e) {
        console.error("[Replicate] SVD fallback failed:", e);
        throw new Error("Could not generate trailer clips");
      }
    }

    // ── STEP 4: upload ───────────────────────────────────────────────────────
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

    await prisma.previewGeneration.update({
      where: { jobId },
      data: {
        status: "completed",
        trailerUrl: urlData.publicUrl,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[Preview pipeline]", raw);
    await prisma.previewGeneration.update({
      where: { jobId },
      data: { status: "failed", errorMessage: raw.slice(0, 500) },
    });
    throw err;
  } finally {
    for (const p of [...clipPaths, audioPath, outPath].filter(Boolean) as string[]) {
      try { await unlink(p); } catch (_) {}
    }
  }
}
