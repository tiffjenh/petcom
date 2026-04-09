import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { runPreviewPipeline } from "@/lib/preview-pipeline";
import * as astria from "@/lib/astria";
import { generateScript } from "@/lib/ai/script";
import {
  generateEpisodeScript,
  saveEpisodeSituation,
  type DirectorScriptJson,
  type PlannedConcept,
} from "@/lib/episodeDirector";
import {
  generateDogAvatar as generateDogAvatarFal,
  generateHumanAvatarFal,
  HAILUO_SCENE_PROMPT_PREFIX,
  HAILUO_SCENE_PROMPT_SUFFIX,
} from "@/lib/ai/fal-styles";
import { generateHumanAvatar } from "@/lib/ai/avatar";
import { hailuoImageToVideo } from "@/lib/fal";
import {
  generateSceneAudioTracks,
  generateSpeechToBuffer,
  generateLineAudio,
  generateLineAudioFromArchetype,
  stitchAudioBuffersWithGap,
  getVoiceIdForSpeakerRole,
  stitchAudioBuffers,
  type CharacterVoiceMap,
  type SpeakerRole,
  THOUGHT_BUBBLE_VOICE_ID,
} from "@/lib/ai/elevenlabs";
import {
  getPrimaryComedyCategory,
  getNarratorVoiceSettingsForStyle,
  getNarratorVoiceSettingsFromStyleId,
} from "@/lib/prompts/scriptPrompt";
import { generateEpisodeScript as generatePilotEpisodeScriptFromEpisodeScript } from "@/lib/ai/episode-script";
import { assembleFullEpisode, assemblePilotEpisode, assembleV1Episode } from "@/lib/ai/ffmpeg-assembly";
import {
  PILOT_EPISODE_ID,
  HAILUO_PILOT_PREFIX,
  PILOT_SCRIPT,
  PILOT_END_CARD,
  PILOT_TITLE,
  PILOT_SHOW_TITLE,
  PILOT_SYNOPSIS,
} from "@/lib/ai/pilot-documentary-script";
import { getSupabaseAdmin, getSupabaseStorageBucket } from "@/lib/supabase";
import { notifyEpisodeReady, sendShareReminderEmail, sendUpgradePromptEmail } from "@/lib/notify";
import { randomUUID } from "crypto";
import type { EpisodeScriptJson, ScriptScene } from "@/lib/ai/script";

const VOICE_POOL_RAW =
  process.env.ELEVENLABS_VOICE_IDS?.split(",").map((s) => s.trim()).filter((s) => s && s !== "...") ?? [];
const VOICE_POOL =
  VOICE_POOL_RAW.length > 0
    ? VOICE_POOL_RAW
    : [
        "EXAVITQu4vr4xnSDxMaL",
        "pNInz6obpgDQGcFmaJgB",
        "VR6AewLTidWG4xSOukaG",
        "TxGEqnHWrfWFTfGW9XjX",
      ];

function buildCharacterVoiceMap(
  dogs: { id: string; name: string; voiceId: string | null }[],
  castMembers: { id: string; name: string; voiceId: string | null }[],
  script: EpisodeScriptJson
): CharacterVoiceMap {
  const map: CharacterVoiceMap = {};
  const names = new Set<string>();
  for (const scene of script.scenes) {
    for (const d of scene.dialogue ?? []) {
      if (!d.isThoughtBubble) names.add(d.character);
    }
  }
  let voiceIndex = 0;
  for (const name of names) {
    if (map[name]) continue;
    const dog = dogs.find((d) => d.name === name);
    const cast = castMembers.find((c) => c.name === name);
    const entity = dog ?? cast;
    if (entity?.voiceId) {
      map[name] = entity.voiceId;
    } else {
      map[name] = VOICE_POOL[voiceIndex % VOICE_POOL.length];
      voiceIndex++;
    }
  }
  return map;
}

async function persistVoiceIds(
  dogs: { id: string; name: string; voiceId: string | null }[],
  castMembers: { id: string; name: string; voiceId: string | null }[],
  characterVoiceMap: CharacterVoiceMap
): Promise<void> {
  for (const d of dogs) {
    const voiceId = characterVoiceMap[d.name];
    if (voiceId && !d.voiceId) {
      await prisma.dog.update({ where: { id: d.id }, data: { voiceId } });
    }
  }
  for (const c of castMembers) {
    const voiceId = characterVoiceMap[c.name];
    if (voiceId && !c.voiceId) {
      await prisma.castMember.update({ where: { id: c.id }, data: { voiceId } });
    }
  }
}

function getAvatarForScene(
  scene: ScriptScene,
  dogs: { name: string; photoUrl: string; animatedAvatar: string | null }[],
  castMembers: { name: string; photoUrl: string; animatedAvatar: string | null }[],
  fallbackAvatar: string
): string {
  const first = scene.characters[0];
  if (!first) return fallbackAvatar;
  const dog = dogs.find((d) => d.name === first);
  const cast = castMembers.find((c) => c.name === first);
  const entity = dog ?? cast;
  if (!entity) return fallbackAvatar;
  return entity.animatedAvatar ?? entity.photoUrl;
}

/** Serializable payload from fetch-household for use in later steps. */
type HouseholdPayload = {
  episodeId: string;
  householdId: string;
  userId: string;
  episodeNum: number;
  season: number;
  showTitle: string;
  showStyle: string[];
  humorStyles?: string[];
  comedyNotes: string | null;
  ownerName: string | null;
  plan: string | null;
  plannedConcept?: PlannedConcept | null;
  dogs: { id: string; name: string; breed: string | null; personality: string[]; characterBio: string | null; photoUrl: string; photoUrls?: string[]; animatedAvatar: string | null; voiceId: string | null; voiceArchetype: string | null }[];
  castMembers: { id: string; name: string; role: string; photoUrl: string; animatedAvatar: string | null; voiceId: string | null }[];
};

type PilotGeneratePayload = {
  episodeId: string;
  householdId: string;
  dogId: string;
  photoUrls: string[];
  dogName: string;
  breed: string | null;
  personality: string[];
  characterBio: string | null;
  humorStyles: string[];
  ownerName: string | null;
  showTitle: string;
};

// Pilot: 4 scenes × 6s @ 512P ≈ ~$0.34 video + ~$0.13 other ≈ $0.50/episode (target ~2 min assembled).
const MAX_PILOT_SCENES = 4;
const PILOT_VIDEO_PROMPT_SUFFIX = ", Pixar 3D animated style, smooth motion, expressive dog character";

/** Build Hailuo prompt from scene type and cameraStyle (comedy-style-driven). */
function buildClipPrompt(
  scene: {
    type?: string;
    isConfessional?: boolean;
    cameraStyle?: string;
    setting?: string;
    action?: string;
  },
  clipType: "wide" | "closeup"
): string {
  const isConfessional =
    scene.isConfessional === true || scene.type === "confessional";
  const cameraStyle = (scene.cameraStyle ?? "").trim();
  const setting = (scene.setting ?? "").trim();
  const action = (scene.action ?? "").trim();

  if (isConfessional) {
    return `Pixar 3D animated dog sitting facing camera directly. Extremely expressive face, natural subtle mouth movement. Slight jaw movement, eyebrow raises, head tilts. Huge expressive eyes, warm interview lighting. Slightly blurred background, TV interview setup feel. ${clipType === "closeup" ? "Extreme close-up on face." : "Medium shot, full upper body visible."} Dug Days Disney+ quality. No text, no watermarks.`;
  }

  return `Pixar 3D animated scene, Dug Days Disney+ quality. ${cameraStyle || "Warm golden cinematic lighting, lush saturated green grass."} ${setting}. ${action}. ${clipType === "closeup" ? "Close-up reaction shot, huge expressive eyes." : "Wide shot showing full action."} Warm cinematic Pixar lighting, vivid colors. Smooth natural character movement. No text, no watermarks.`;
}

export const generateEpisodeFunction = inngest.createFunction(
  {
    id: "generate-episode",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "episode/generate" },
  async ({ event, step }) => {
    const data = event.data as PilotGeneratePayload | { episodeId: string; householdId: string; episodeNum: number; season: number };
    const { episodeId, householdId } = data;
    const isPilot =
      "dogId" in data &&
      "photoUrls" in data &&
      Array.isArray((data as PilotGeneratePayload).photoUrls) &&
      (data as PilotGeneratePayload).photoUrls.length > 0;

    try {
    // Hardcoded 90s pilot: "The Ball. A Documentary." — 10 scenes × 2 clips = 20 Hailuo, continuous narration
    if (episodeId === PILOT_EPISODE_ID) {
      const pilotDocPayload = await step.run("pilot-doc-fetch", async () => {
        const episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          include: {
            household: {
              include: {
                user: { select: { id: true } },
                dogs: true,
              },
            },
          },
        });
        if (!episode || episode.householdId !== householdId) throw new Error("Pilot episode not found");
        await prisma.episode.update({
          where: { id: episodeId },
          data: { status: "generating" },
        });
        const h = episode.household;
        const primaryDog = h.dogs[0];
        if (!primaryDog) throw new Error("Pilot household has no dog");
        let avatarUrl = primaryDog.animatedAvatar;
        if (!avatarUrl) {
          const dogWithUrls = primaryDog as { photoUrls?: string[] };
          const photoUrls =
            Array.isArray(dogWithUrls.photoUrls) && dogWithUrls.photoUrls.length > 0
              ? dogWithUrls.photoUrls
              : [primaryDog.photoUrl];
          const { primary, alt } = await generateDogAvatarFal(photoUrls, primaryDog.name, primaryDog.breed);
          avatarUrl = primary;
          await prisma.dog.update({
            where: { id: primaryDog.id },
            data: { animatedAvatar: primary, animatedAvatarAlt: alt } as Prisma.DogUpdateInput,
          });
        }
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            title: PILOT_TITLE,
            synopsis: PILOT_SYNOPSIS,
            script: {
              episodeTitle: PILOT_TITLE,
              synopsis: PILOT_SYNOPSIS,
              scenes: PILOT_SCRIPT.map((s) => ({
                sceneNumber: s.sceneNumber,
                type: s.type,
                setting: s.setting,
                action: s.action,
                narratorLine: s.narratorLine,
                speakerRole: s.speakerRole,
              })),
            },
          },
        });
        return {
          episodeId,
          householdId: h.id,
          userId: h.userId,
          avatarUrl: avatarUrl as string,
        };
      });

      const FAL_TIMEOUT_MS = 3 * 60 * 1000;
      const allClipUrls = await step.run("pilot-doc-animate", async () => {
        const urls: string[] = [];
        for (let s = 0; s < PILOT_SCRIPT.length; s++) {
          const scene = PILOT_SCRIPT[s];
          for (let c = 0; c < 2; c++) {
            const prompt = HAILUO_PILOT_PREFIX + scene.clipPrompts[c];
            try {
              const url = await Promise.race([
                hailuoImageToVideo(pilotDocPayload.avatarUrl, prompt, {
                  duration: 5,
                  resolution: "512P",
                }),
                new Promise<string>((_, rej) =>
                  setTimeout(() => rej(new Error("FAL timeout after 3 minutes")), FAL_TIMEOUT_MS)
                ),
              ]);
              urls.push(url);
              console.log(`[pilot-doc] Scene ${s + 1} clip ${c + 1}/2 done`);
            } catch (err) {
              console.error(`[pilot-doc] Scene ${s + 1} clip ${c + 1} failed:`, err);
              throw err;
            }
          }
        }
        return urls;
      });

      const fullAudioBase64 = await step.run("pilot-doc-audio", async () => {
        const buffers: Buffer[] = [];
        for (const scene of PILOT_SCRIPT) {
          const voiceId = getVoiceIdForSpeakerRole(scene.speakerRole as SpeakerRole);
          const buf = await generateLineAudio(scene.narratorLine, voiceId);
          if (buf.length) buffers.push(buf);
        }
        const endVoiceId = getVoiceIdForSpeakerRole(PILOT_END_CARD.speakerRole as SpeakerRole);
        const endBuf = await generateLineAudio(PILOT_END_CARD.narratorLine, endVoiceId);
        if (endBuf.length) buffers.push(endBuf);
        const fullAudio = await stitchAudioBuffers(buffers);
        return Buffer.from(fullAudio).toString("base64");
      });

      const pilotUrls = await step.run("pilot-doc-assemble", async () => {
        const fullAudioBuffer = Buffer.from(fullAudioBase64, "base64");
        const { verticalBuffer, landscapeBuffer, thumbnailBuffer } = await assemblePilotEpisode({
          showTitle: PILOT_SHOW_TITLE,
          episodeTitle: PILOT_TITLE,
          clipUrls: allClipUrls,
          fullAudioBuffer,
        });
        const bucket = getSupabaseStorageBucket();
        const uid = randomUUID();
        const basePath = `${pilotDocPayload.userId}/episodes/${episodeId}-${uid}`;
        const admin = getSupabaseAdmin();
        const up = (path: string, buf: Buffer, contentType: string) =>
          admin.storage.from(bucket).upload(path, buf, { contentType, upsert: true });
        const [{ error: e1 }, { error: e2 }, { error: e3 }] = await Promise.all([
          up(`${basePath}.mp4`, verticalBuffer, "video/mp4"),
          up(`${basePath}-landscape.mp4`, landscapeBuffer, "video/mp4"),
          up(`${basePath}-thumb.jpg`, thumbnailBuffer, "image/jpeg"),
        ]);
        if (e1 || e2 || e3) throw new Error([e1?.message, e2?.message, e3?.message].filter(Boolean).join("; "));
        return {
          videoUrl: admin.storage.from(bucket).getPublicUrl(`${basePath}.mp4`).data.publicUrl,
          videoUrlLandscape: admin.storage.from(bucket).getPublicUrl(`${basePath}-landscape.mp4`).data.publicUrl,
          thumbnailUrl: admin.storage.from(bucket).getPublicUrl(`${basePath}-thumb.jpg`).data.publicUrl,
        };
      });

      await step.run("pilot-doc-save", async () => {
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            status: "ready",
            videoUrl: pilotUrls.videoUrl,
            videoUrlLandscape: pilotUrls.videoUrlLandscape,
            thumbnailUrl: pilotUrls.thumbnailUrl,
            publishedAt: new Date(),
          },
        });
        if (pilotDocPayload.userId) {
          await notifyEpisodeReady({
            episodeTitle: PILOT_TITLE,
            episodeId,
            thumbnailUrl: pilotUrls.thumbnailUrl ?? null,
            userId: pilotDocPayload.userId,
          });
        }
      });

      return {
        success: true,
        episodeId,
        videoUrl: pilotUrls.videoUrl,
        videoUrlLandscape: pilotUrls.videoUrlLandscape,
        thumbnailUrl: pilotUrls.thumbnailUrl,
      };
    }

    if (isPilot) {
      const pilot = data as PilotGeneratePayload;
      const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: {
          household: {
            include: {
              user: { include: { subscription: { select: { plan: true } } } },
            },
          },
        },
      });
      if (!episode || episode.householdId !== householdId) throw new Error("Episode not found");

      const dog = await prisma.dog.findUnique({ where: { id: pilot.dogId } });
      if (!dog) throw new Error("Dog not found");
      const userId = episode.household.userId;
      const plan = episode.household.user?.subscription?.plan ?? "free";

      const avatarUrl = await step.run("pilot-generate-avatar", async () => {
        const { primary, alt } = await generateDogAvatarFal(pilot.photoUrls, pilot.dogName, pilot.breed);
        await prisma.dog.update({
          where: { id: pilot.dogId },
          data: { animatedAvatar: primary, animatedAvatarAlt: alt } as Prisma.DogUpdateInput,
        });
        return primary;
      });

      const script = await step.run("pilot-generate-script", async () => {
        const result = await generatePilotEpisodeScriptFromEpisodeScript({
          dogName: pilot.dogName,
          breed: pilot.breed,
          personality: pilot.personality,
          characterBio: pilot.characterBio,
          ownerName: pilot.ownerName,
          showTitle: pilot.showTitle,
          humorStyles: pilot.humorStyles,
        });
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            title: result.title,
            synopsis: result.synopsis,
            script: JSON.parse(JSON.stringify(result.raw)),
          },
        });
        return result;
      });

      const scenesToAnimate = script.scenes.slice(0, MAX_PILOT_SCENES);
      const sceneClipUrls = await step.run("pilot-animate-scenes", async () => {
        const urls: string[] = [];
        for (const scene of scenesToAnimate) {
          const prompt = (scene.action || scene.setting || "") + PILOT_VIDEO_PROMPT_SUFFIX;
          const url = await hailuoImageToVideo(avatarUrl, prompt, {
            duration: 6,
            resolution: "512P",
          });
          urls.push(url);
        }
        return urls;
      });

      await step.run("pilot-mark-scripted", async () => {
        await prisma.episode.update({
          where: { id: episodeId },
          data: { status: "scripted" },
        });
        return { ok: true };
      });

      const audioBase64ByScene = await step.run("pilot-generate-voiceover", async () => {
        const buffers: Buffer[] = [];
        for (const scene of scenesToAnimate) {
          const text = (scene.narratorLine || scene.action || scene.setting || "").trim();
          const buf = text ? await generateSpeechToBuffer(text) : Buffer.alloc(0);
          buffers.push(buf);
        }
        return buffers.map((b) => Buffer.from(b).toString("base64"));
      });

      const urls = await step.run("pilot-assemble", async () => {
        const sceneAudioBuffers: Buffer[] = audioBase64ByScene.map((b64) => Buffer.from(b64, "base64"));
        const { verticalBuffer, landscapeBuffer, thumbnailBuffer } = await assembleFullEpisode({
          showTitle: pilot.showTitle,
          episodeTitle: script.title,
          castNames: [pilot.dogName],
          sceneClipUrls,
          sceneAudioBuffers,
        });
        const bucket = getSupabaseStorageBucket();
        const uid = randomUUID();
        const basePath = `${userId}/episodes/${episodeId}-${uid}`;
        const supabase = getSupabaseAdmin().storage.from(bucket);
        const [{ error: upV }, { error: upL }, { error: upT }] = await Promise.all([
          supabase.upload(`${basePath}.mp4`, verticalBuffer, { contentType: "video/mp4", upsert: true }),
          supabase.upload(`${basePath}-landscape.mp4`, landscapeBuffer, { contentType: "video/mp4", upsert: true }),
          supabase.upload(`${basePath}-thumb.jpg`, thumbnailBuffer, { contentType: "image/jpeg", upsert: true }),
        ]);
        if (upV) throw new Error(upV.message);
        if (upL) throw new Error(upL.message);
        if (upT) throw new Error(upT.message);
        return {
          videoUrl: getSupabaseAdmin().storage.from(bucket).getPublicUrl(`${basePath}.mp4`).data.publicUrl,
          videoUrlLandscape: getSupabaseAdmin().storage.from(bucket).getPublicUrl(`${basePath}-landscape.mp4`).data.publicUrl,
          thumbnailUrl: getSupabaseAdmin().storage.from(bucket).getPublicUrl(`${basePath}-thumb.jpg`).data.publicUrl,
        };
      });

      await step.run("pilot-save-notify", async () => {
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            status: "ready",
            videoUrl: urls.videoUrl,
            videoUrlLandscape: urls.videoUrlLandscape,
            thumbnailUrl: urls.thumbnailUrl,
            publishedAt: new Date(),
          },
        });
        await notifyEpisodeReady({
          episodeTitle: script.title,
          episodeId,
          thumbnailUrl: urls.thumbnailUrl ?? null,
          userId,
        });
      });

      return {
        success: true,
        episodeId,
        videoUrl: urls.videoUrl,
        videoUrlLandscape: urls.videoUrlLandscape,
        thumbnailUrl: urls.thumbnailUrl,
      };
    }

    const { episodeNum, season } = data as { episodeId: string; householdId: string; episodeNum: number; season: number };
    const sceneCount = (data as { sceneCount?: number }).sceneCount ?? 4;
    console.log("[episode] sceneCount:", sceneCount);

    const householdPayload = await step.run("fetch-household", async () => {
      const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: {
          household: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  subscription: { select: { plan: true } },
                },
              },
              dogs: true,
              castMembers: true,
            },
          },
        },
      });
      if (!episode || episode.householdId !== householdId) {
        throw new Error("Episode not found");
      }
      await prisma.episode.update({
        where: { id: episodeId },
        data: { status: "generating" },
      });
      const h = episode.household;
      const plannedConcept = episode.plannedConcept as PlannedConcept | null | undefined;
      return {
        episodeId,
        householdId: h.id,
        userId: h.userId,
        episodeNum,
        season,
        showTitle: h.showTitle,
        showStyle: h.showStyle,
        humorStyles: h.showStyle,
        comedyNotes: h.comedyNotes,
        ownerName: h.ownerName ?? null,
        plan: h.user?.subscription?.plan ?? null,
        plannedConcept: plannedConcept ?? undefined,
        dogs: h.dogs.map((d) => ({
          id: d.id,
          name: d.name,
          breed: d.breed,
          personality: d.personality,
          characterBio: d.characterBio ?? null,
          photoUrl: d.photoUrl,
          photoUrls: (d as { photoUrls?: string[] }).photoUrls,
          animatedAvatar: d.animatedAvatar,
          voiceId: d.voiceId,
          voiceArchetype: (d as { voiceArchetype?: string | null }).voiceArchetype ?? null,
        })),
        castMembers: h.castMembers.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          photoUrl: ((c as { photoUrls?: string[] }).photoUrls?.[0]) ?? c.photoUrl ?? "",
          animatedAvatar: c.animatedAvatar,
          voiceId: c.voiceId,
        })),
      } satisfies HouseholdPayload;
    });

    const { script, characterVoiceMap } = await step.run("generate-script", async () => {
      const scriptResult = (await generateEpisodeScript(
        householdPayload.householdId,
        {
          plannedConcept: householdPayload.plannedConcept,
          sceneCount,
        }
      )) as DirectorScriptJson;
      console.log("[script] generated:", JSON.stringify(scriptResult, null, 2).slice(0, 2000));
      await prisma.episode.update({
        where: { id: householdPayload.episodeId },
        data: {
          title: scriptResult.episodeTitle,
          synopsis: scriptResult.synopsis,
          script: JSON.parse(JSON.stringify(scriptResult)),
          status: "scripted",
        },
      });
      await saveEpisodeSituation(householdPayload.episodeId, scriptResult);
      const map = buildCharacterVoiceMap(
        householdPayload.dogs as { id: string; name: string; voiceId: string | null }[],
        householdPayload.castMembers as { id: string; name: string; voiceId: string | null }[],
        scriptResult as EpisodeScriptJson
      );
      await persistVoiceIds(
        householdPayload.dogs as { id: string; name: string; voiceId: string | null }[],
        householdPayload.castMembers as { id: string; name: string; voiceId: string | null }[],
        map
      );
      return { script: scriptResult, characterVoiceMap: map };
    });

    const primaryDog = householdPayload.dogs[0];
    if (!primaryDog) throw new Error("No dog");

    const ensureAvatar = await step.run("ensure-dog-avatar", async () => {
      if (primaryDog.animatedAvatar) {
        return { primaryAvatarUrl: primaryDog.animatedAvatar };
      }
      const photoUrls = Array.isArray(primaryDog.photoUrls) && primaryDog.photoUrls.length > 0
        ? primaryDog.photoUrls
        : [primaryDog.photoUrl];
      const { primary, alt } = await generateDogAvatarFal(photoUrls, primaryDog.name, primaryDog.breed);
      await prisma.dog.update({
        where: { id: primaryDog.id },
        data: { animatedAvatar: primary, animatedAvatarAlt: alt } as Prisma.DogUpdateInput,
      });
      return { primaryAvatarUrl: primary };
    });

    const avatarForScenes = ensureAvatar.primaryAvatarUrl as string;

    const castWithAvatars = householdPayload.castMembers.filter(
      (c): c is typeof householdPayload.castMembers[0] & { animatedAvatar: string } =>
        !!c.animatedAvatar
    );

    const styleId =
      householdPayload.humorStyles?.[0]?.trim() ||
      householdPayload.showStyle?.[0]?.trim() ||
      "mockumentary";

    const FAL_TIMEOUT_MS = 3 * 60 * 1000;
    const sceneClipUrls = await step.run("animate-scenes", async () => {
      const urls: (string | null)[] = [];
      const scenes = script.scenes.slice(0, sceneCount);
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        for (const clipType of ["wide", "closeup"] as const) {
          const prompt = buildClipPrompt(
            {
              type: scene.type,
              isConfessional: (scene as { isConfessional?: boolean }).isConfessional,
              cameraStyle: (scene as { cameraStyle?: string }).cameraStyle,
              setting: scene.setting,
              action: scene.action,
            },
            clipType
          );
          try {
            const clipUrl = await Promise.race([
              hailuoImageToVideo(avatarForScenes, prompt, { duration: 5, resolution: "720P" }),
              new Promise<string>((_, rej) =>
                setTimeout(() => rej(new Error("FAL timeout after 3 minutes")), FAL_TIMEOUT_MS)
              ),
            ]);
            urls.push(clipUrl);
            console.log(`[animate] Scene ${i + 1} ${clipType}:`, clipUrl?.slice(0, 50) + "...");
          } catch (err) {
            console.error(`[animate] Scene ${i + 1} ${clipType} failed:`, err);
            urls.push(null);
          }
        }
      }
      return urls;
    });

    const audioBase64ByScene = await step.run("generate-audio", async () => {
      const scenesForV1 = script.scenes.slice(0, sceneCount);
      const hasDialogueLines = scenesForV1.some((s) => {
        const dl = (s as { dialogueLines?: unknown[] }).dialogueLines;
        return Array.isArray(dl) && dl.length > 0;
      });

      if (hasDialogueLines) {
        const MULTI_SPEAKER_GAP_SEC = 0.2;
        const sceneBuffers: Buffer[] = [];
        for (const scene of scenesForV1) {
          const dialogueLines =
            (scene as {
              dialogueLines?: { speaker: string; voiceArchetype: string; line: string; clipIndex?: number }[];
            }).dialogueLines ?? [];
          if (dialogueLines.length === 0) {
            sceneBuffers.push(Buffer.alloc(0));
            continue;
          }
          const lineBuffers: Buffer[] = [];
          for (const dl of dialogueLines) {
            const buf = await generateLineAudioFromArchetype(
              dl.line,
              dl.voiceArchetype ?? "narrator"
            );
            if (buf.length) lineBuffers.push(buf);
          }
          if (lineBuffers.length === 0) {
            sceneBuffers.push(Buffer.alloc(0));
          } else if (lineBuffers.length === 1) {
            sceneBuffers.push(lineBuffers[0]);
          } else {
            const stitched = await stitchAudioBuffersWithGap(
              lineBuffers,
              MULTI_SPEAKER_GAP_SEC
            );
            sceneBuffers.push(stitched);
          }
        }
        const totalBytes = sceneBuffers.reduce((s, b) => s + b.length, 0);
        const approxDurationSec = Math.round(totalBytes / 2000);
        console.log("[audio] dialogueLines path: scene buffers:", sceneBuffers.length, "total bytes:", totalBytes, "~" + approxDurationSec + "s");
        return sceneBuffers.map((buf) => Buffer.from(buf).toString("base64"));
      }

      const styleSources = householdPayload.humorStyles?.length
        ? householdPayload.humorStyles
        : (householdPayload.showStyle ?? []);
      const primaryCategory =
        getPrimaryComedyCategory(styleSources) ??
        getPrimaryComedyCategory(["mockumentary"]);
      const narratorVoiceSettings =
        getNarratorVoiceSettingsFromStyleId(styleId);
      const scenesForAudio = scenesForV1.map((scene) => {
        if (scene.dialogue?.length) {
          return {
            dialogue: scene.dialogue.map((d) => ({
              character: d.character,
              line: d.line,
              isThoughtBubble: d.isThoughtBubble ?? false,
              speakerRole: (d.speakerRole ??
                (scene as { speakerRole?: SpeakerRole }).speakerRole ??
                "narrator") as SpeakerRole,
              voiceArchetype: (d as { voiceArchetype?: string }).voiceArchetype,
            })),
          };
        }
        const line = (scene.narratorLine ?? scene.action ?? "").trim();
        const speakerRole =
          (scene as { speakerRole?: string }).speakerRole ?? "narrator";
        return {
          dialogue: line
            ? [
                {
                  character: "Narrator",
                  line,
                  isThoughtBubble: false,
                  speakerRole: (speakerRole as SpeakerRole) || "narrator",
                },
              ]
            : [],
        };
      });
      const mainDogArchetype =
        typeof (primaryDog as { voiceArchetype?: string | null })
          .voiceArchetype === "string"
          ? (primaryDog as { voiceArchetype: string }).voiceArchetype
          : undefined;
      const sceneAudioBuffers = await generateSceneAudioTracks(
        scenesForAudio,
        characterVoiceMap,
        THOUGHT_BUBBLE_VOICE_ID,
        narratorVoiceSettings,
        mainDogArchetype ? { mainDogArchetype } : undefined
      );
      return sceneAudioBuffers.map((buf) => Buffer.from(buf).toString("base64"));
    });

    const urls = await step.run("assemble-video", async () => {
      const sceneAudioBuffers: Buffer[] = audioBase64ByScene.map((b64) =>
        Buffer.from(b64, "base64")
      );
      const validClipUrls = sceneClipUrls.filter((u): u is string => u != null);
      const castNames: string[] = [
        ...householdPayload.dogs.map((d) => String(d.name)),
        ...householdPayload.castMembers.map((c) => String(c.name)),
      ];
      let verticalBuffer: Buffer;
      let landscapeBuffer: Buffer;
      let thumbnailBuffer: Buffer;
      const expectedClips = sceneCount * 2;
      if (validClipUrls.length >= expectedClips && sceneAudioBuffers.length >= sceneCount) {
        const result = await assembleV1Episode({
          showTitle: householdPayload.showTitle,
          episodeTitle: String(script.episodeTitle ?? ""),
          clipUrls: validClipUrls.slice(0, expectedClips),
          sceneAudioBuffers: sceneAudioBuffers.slice(0, sceneCount),
        });
        verticalBuffer = result.verticalBuffer;
        landscapeBuffer = result.landscapeBuffer;
        thumbnailBuffer = result.thumbnailBuffer;
      } else {
        const clipsForAssembly = validClipUrls;
        const audioForAssembly = sceneAudioBuffers.slice(0, validClipUrls.length);
        const result = await assembleFullEpisode({
          showTitle: householdPayload.showTitle,
          episodeTitle: String(script.episodeTitle ?? ""),
          castNames,
          sceneClipUrls: clipsForAssembly,
          sceneAudioBuffers: audioForAssembly.length ? audioForAssembly : sceneAudioBuffers.map((_, i) => (validClipUrls[i] ? sceneAudioBuffers[Math.min(i, sceneAudioBuffers.length - 1)] : Buffer.alloc(0))).filter((b) => b.length > 0),
        });
        verticalBuffer = result.verticalBuffer;
        landscapeBuffer = result.landscapeBuffer;
        thumbnailBuffer = result.thumbnailBuffer;
      }
      const bucket = getSupabaseStorageBucket();
      const uid = randomUUID();
      const basePath = `${householdPayload.userId}/episodes/${householdPayload.episodeId}-${uid}`;
      const { error: upV } = await getSupabaseAdmin().storage
        .from(bucket)
        .upload(`${basePath}.mp4`, verticalBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });
      if (upV) throw new Error(upV.message);
      const { error: upL } = await getSupabaseAdmin().storage
        .from(bucket)
        .upload(`${basePath}-landscape.mp4`, landscapeBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });
      if (upL) throw new Error(upL.message);
      const { error: upT } = await getSupabaseAdmin().storage
        .from(bucket)
        .upload(`${basePath}-thumb.jpg`, thumbnailBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
      if (upT) throw new Error(upT.message);
      return {
        videoUrl: getSupabaseAdmin().storage.from(bucket).getPublicUrl(`${basePath}.mp4`).data.publicUrl,
        videoUrlLandscape: getSupabaseAdmin().storage.from(bucket).getPublicUrl(`${basePath}-landscape.mp4`).data.publicUrl,
        thumbnailUrl: getSupabaseAdmin().storage.from(bucket).getPublicUrl(`${basePath}-thumb.jpg`).data.publicUrl,
      };
    });

    await step.run("save-and-notify", async () => {
      await prisma.episode.update({
        where: { id: householdPayload.episodeId },
        data: {
          status: "ready",
          videoUrl: urls.videoUrl,
          videoUrlLandscape: urls.videoUrlLandscape,
          thumbnailUrl: urls.thumbnailUrl,
          publishedAt: new Date(),
        },
      });
      if (householdPayload.userId) {
        const episodeScript = script as DirectorScriptJson;
        await notifyEpisodeReady({
          episodeTitle: episodeScript.episodeTitle,
          episodeId: householdPayload.episodeId,
          thumbnailUrl: urls.thumbnailUrl ?? null,
          userId: householdPayload.userId,
        });
      }
      console.log("[cost] Episode complete:", {
        episodeId: householdPayload.episodeId,
        clips: 8,
        estimatedCost: "$1.38",
        breakdown: {
          video: "8 × $0.15 = $1.20",
          audio: "$0.10",
          script: "$0.03",
          avatar: "$0.05 amortized",
        },
      });
    });

    return {
      success: true,
      episodeId: householdPayload.episodeId,
      videoUrl: urls.videoUrl,
      videoUrlLandscape: urls.videoUrlLandscape,
      thumbnailUrl: urls.thumbnailUrl,
    };
    } catch (err) {
      await prisma.episode.update({
        where: { id: episodeId },
        data: { status: "failed" },
      }).catch(() => {});
      throw err;
    }
  }
);

/** Generate Pixar-style avatars for all dogs and cast in a household. Triggered after onboarding or cast update. */
export const generateAvatarsFunction = inngest.createFunction(
  {
    id: "generate-avatars",
    retries: 1,
    concurrency: { limit: 10 },
  },
  { event: "avatar/generate" },
  async ({ event }) => {
    const { householdId, photoUrls: eventPhotoUrls } = event.data as {
      householdId: string;
      photoUrls?: string[];
    };
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: { dogs: true, castMembers: true },
    });
    if (!household) return { success: false, reason: "Household not found" };

    const results: { dogs: number; cast: number; errors: string[] } = {
      dogs: 0,
      cast: 0,
      errors: [],
    };

    const dogPhotoUrls = eventPhotoUrls && eventPhotoUrls.length > 0
      ? eventPhotoUrls
      : null;

    for (const dog of household.dogs) {
      try {
        const dogPhotos = (dog as unknown as { photoUrls?: string[] }).photoUrls;
        const photoUrls = dogPhotoUrls ?? (Array.isArray(dogPhotos) && dogPhotos.length > 0 ? dogPhotos : [dog.photoUrl]);
        const { primary, alt } = await generateDogAvatarFal(photoUrls, dog.name, dog.breed);
        await prisma.dog.update({
          where: { id: dog.id },
          data: { animatedAvatar: primary, animatedAvatarAlt: alt } as Prisma.DogUpdateInput,
        });
        results.dogs++;
      } catch (e) {
        results.errors.push(`Dog ${dog.name}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }

    for (const member of household.castMembers) {
      try {
        const photoUrl = (member as { photoUrls?: string[] }).photoUrls?.[0] ?? member.photoUrl;
        if (!photoUrl) {
          results.errors.push(`Cast ${member.name}: No photo`);
          continue;
        }
        const url = await generateHumanAvatar(photoUrl);
        await prisma.castMember.update({
          where: { id: member.id },
          data: { animatedAvatar: url },
        });
        results.cast++;
      } catch (e) {
        results.errors.push(`Cast ${member.name}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }

    return { success: true, ...results };
  }
);

/** Generate Pixar-style avatar for a single cast member. Triggered when cast photos are saved. */
export const generateCastAvatarFunction = inngest.createFunction(
  {
    id: "generate-cast-avatar",
    retries: 1,
    concurrency: { limit: 5 },
  },
  { event: "cast/avatar-generate" },
  async ({ event, step }) => {
    const { castMemberId, photoUrls, name, role, householdId } = event.data as {
      castMemberId: string;
      photoUrls: string[];
      name: string;
      role: string;
      householdId: string;
    };
    if (!photoUrls?.length) {
      await prisma.castMember.update({
        where: { id: castMemberId },
        data: { avatarStatus: "failed" } as Prisma.CastMemberUpdateInput,
      });
      return { success: false, reason: "No photo URLs" };
    }

    await step.run("set-generating", async () => {
      await prisma.castMember.update({
        where: { id: castMemberId },
        data: { avatarStatus: "generating" } as Prisma.CastMemberUpdateInput,
      });
      return {};
    });

    const isPet = role === "pet_2" || role === "pet_3";
    let avatarUrl: string;
    try {
      avatarUrl = await step.run("generate-avatar", async () => {
        if (isPet) {
          const res = await generateDogAvatarFal(photoUrls, name);
          return res.primary;
        }
        return await generateHumanAvatarFal(photoUrls);
      });
    } catch (err) {
      await prisma.castMember.update({
        where: { id: castMemberId },
        data: { avatarStatus: "failed" } as Prisma.CastMemberUpdateInput,
      });
      throw err;
    }

    await step.run("save-avatar", async () => {
      await prisma.castMember.update({
        where: { id: castMemberId },
        data: { animatedAvatar: avatarUrl, avatarStatus: "ready" } as Prisma.CastMemberUpdateInput,
      });
      return {};
    });

    return { success: true, castMemberId, avatarUrl };
  }
);

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - x.getUTCDay());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/** Weekly cron: every Monday 9am UTC. Only households with active subscription. */
export const weeklyEpisodeCron = inngest.createFunction(
  { id: "weekly-episode-cron" },
  { cron: "0 9 * * 1" },
  async ({ step }) => {
    const activeHouseholds = await step.run("fetch-active-households", async () => {
      return prisma.household.findMany({
        where: {
          user: {
            subscription: { status: "active" },
          },
        },
        include: { dogs: true },
      });
    });
    const results: { householdId: string; episodeId?: string; error?: string }[] = [];
    for (const household of activeHouseholds) {
      if (household.dogs.length === 0) continue;
      const episodeCount = await prisma.episode.count({
        where: { householdId: household.id },
      });
      const nextNum = episodeCount + 1;
      try {
        const newEpisode = await prisma.episode.create({
          data: {
            householdId: household.id,
            episodeNum: nextNum,
            season: 1,
            title: `Episode ${nextNum}`,
            synopsis: "",
            script: {},
            status: "pending",
          },
        });
        await inngest.send({
          name: "episode/generate",
          data: {
            episodeId: newEpisode.id,
            episodeNum: newEpisode.episodeNum,
            householdId: household.id,
            season: newEpisode.season,
          },
        });
        results.push({ householdId: household.id, episodeId: newEpisode.id });
      } catch (e) {
        results.push({
          householdId: household.id,
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    }
    console.log("[cron] Triggered", results.length, "episodes");
    return { triggered: results.length, results };
  }
);

/** Daily cron: midnight UTC for V1. (3:00 AM user-local would require per-user scheduling.) */
export const dailyEpisodeCron = inngest.createFunction(
  { id: "daily-episode-cron" },
  { cron: "0 0 * * *" },
  async () => {
    const { getPlanLimits } = await import("@/lib/plans");
    const households = await prisma.household.findMany({
      include: { dogs: true, user: { include: { subscription: true } } },
    });
    const weekStart = startOfWeek(new Date());
    const results: { householdId: string; episodeId?: string; error?: string }[] = [];
    for (const household of households) {
      if (household.dogs.length === 0) continue;
      const limits = getPlanLimits(household.user?.subscription?.plan);
      const episodesThisWeek = await prisma.episode.count({
        where: {
          householdId: household.id,
          createdAt: { gte: weekStart },
        },
      });
      if (episodesThisWeek >= limits.maxEpisodesPerWeek) continue;
      const lastEpisode = await prisma.episode.findFirst({
        where: { householdId: household.id },
        orderBy: { episodeNum: "desc" },
      });
      const nextNum = (lastEpisode?.episodeNum ?? 0) + 1;
      const season = lastEpisode?.season ?? 1;
      try {
        const episode = await prisma.episode.create({
          data: {
            householdId: household.id,
            title: `Episode ${nextNum}`,
            episodeNum: nextNum,
            season,
            synopsis: "",
            script: {},
            status: "generating",
          },
        });
        await inngest.send({
          name: "episode/generate",
          data: {
            episodeId: episode.id,
            householdId: household.id,
            episodeNum: nextNum,
            season,
          },
        });
        results.push({ householdId: household.id, episodeId: episode.id });
      } catch (e) {
        results.push({
          householdId: household.id,
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    }
    return { triggered: results.length, results };
  }
);

const ONBOARDING_CRON = "0 10 * * *"; // 10:00 UTC daily

/** Onboarding email sequence: Day 3 share reminder, Day 7 upgrade prompt. */
export const onboardingSequenceCron = inngest.createFunction(
  { id: "onboarding-sequence-cron" },
  { cron: ONBOARDING_CRON },
  async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pawcast.com";
    const now = new Date();

    const threeDaysAgoStart = new Date(now);
    threeDaysAgoStart.setUTCDate(threeDaysAgoStart.getUTCDate() - 4);
    const threeDaysAgoEnd = new Date(now);
    threeDaysAgoEnd.setUTCDate(threeDaysAgoEnd.getUTCDate() - 3);

    const sevenDaysAgoStart = new Date(now);
    sevenDaysAgoStart.setUTCDate(sevenDaysAgoStart.getUTCDate() - 8);
    const sevenDaysAgoEnd = new Date(now);
    sevenDaysAgoEnd.setUTCDate(sevenDaysAgoEnd.getUTCDate() - 7);

    const day3Users = await prisma.user.findMany({
      where: {
        completedOnboardingAt: { gte: threeDaysAgoStart, lt: threeDaysAgoEnd },
      },
      select: { email: true },
    });
    const day7Users = await prisma.user.findMany({
      where: {
        completedOnboardingAt: { gte: sevenDaysAgoStart, lt: sevenDaysAgoEnd },
      },
      select: { email: true },
    });

    for (const u of day3Users) {
      if (u.email) await sendShareReminderEmail(u.email, `${baseUrl}/dashboard`);
    }
    for (const u of day7Users) {
      if (u.email) await sendUpgradePromptEmail(u.email);
    }

    return { day3: day3Users.length, day7: day7Users.length };
  }
);

export const previewGenerateFunction = inngest.createFunction(
  {
    id: "preview-generate",
    retries: 1,
    concurrency: { limit: 3 },
  },
  { event: "preview/generate" },
  async ({ event, step }) => {
    const { jobId } = event.data;
    await step.run("run-preview-pipeline", async () => {
      await runPreviewPipeline(jobId);
      return { ok: true };
    });
    return { jobId };
  }
);

export const dogLoraTrainFunction = inngest.createFunction(
  {
    id: "dog-lora-train",
    retries: 1,
  },
  { event: "dog/lora-train" },
  async ({ event, step }) => {
    const { dogId, dogName, photoUrls } = event.data as {
      dogId: string;
      dogName: string;
      photoUrls: string[];
    };
    if (!process.env.ASTRIA_API_KEY) {
      console.error("[Astria] ASTRIA_API_KEY not set, skipping LoRA training");
      return { skipped: true };
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:2000";
    const callbackUrl = `${baseUrl}/api/webhooks/astria?dogId=${encodeURIComponent(dogId)}`;
    const tuneId = await step.run("train-lora", async () => {
      try {
        return await astria.trainDogLora(dogName, photoUrls, callbackUrl);
      } catch (e) {
        console.error("[Astria] LoRA training failed:", e);
        throw e;
      }
    });
    return { dogId, tuneId };
  }
);
