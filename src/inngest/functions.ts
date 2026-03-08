import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { generateScript } from "@/lib/ai/script";
import { generateSceneClips } from "@/lib/ai/replicate";
import { generateDogAvatar, generateHumanAvatar } from "@/lib/ai/avatar";
import {
  generateSceneAudioTracks,
  type CharacterVoiceMap,
  THOUGHT_BUBBLE_VOICE_ID,
} from "@/lib/ai/elevenlabs";
import { assembleFullEpisode } from "@/lib/ai/ffmpeg-assembly";
import { getSupabaseAdmin, getSupabaseStorageBucket } from "@/lib/supabase";
import { notifyEpisodeReady, sendShareReminderEmail, sendUpgradePromptEmail } from "@/lib/notify";
import { randomUUID } from "crypto";
import type { EpisodeScriptJson, ScriptScene } from "@/lib/ai/script";

const VOICE_POOL =
  process.env.ELEVENLABS_VOICE_IDS?.split(",").filter(Boolean) ?? [
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
    for (const d of scene.dialogue) {
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
  comedyNotes: string | null;
  ownerName: string | null;
  plan: string | null;
  dogs: { id: string; name: string; breed: string | null; personality: string[]; characterBio: string | null; photoUrl: string; animatedAvatar: string | null; voiceId: string | null }[];
  castMembers: { id: string; name: string; role: string; photoUrl: string; animatedAvatar: string | null; voiceId: string | null }[];
};

export const generateEpisodeFunction = inngest.createFunction(
  {
    id: "generate-episode",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "episode/generate" },
  async ({ event, step }) => {
    const { episodeId, householdId, episodeNum, season } = event.data;

    try {
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
      return {
        episodeId,
        householdId: h.id,
        userId: h.userId,
        episodeNum,
        season,
        showTitle: h.showTitle,
        showStyle: h.showStyle,
        comedyNotes: h.comedyNotes,
        ownerName: h.ownerName ?? null,
        plan: h.user?.subscription?.plan ?? null,
        dogs: h.dogs.map((d) => ({
          id: d.id,
          name: d.name,
          breed: d.breed,
          personality: d.personality,
          characterBio: d.characterBio ?? null,
          photoUrl: d.photoUrl,
          animatedAvatar: d.animatedAvatar,
          voiceId: d.voiceId,
        })),
        castMembers: h.castMembers.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          photoUrl: c.photoUrl,
          animatedAvatar: c.animatedAvatar,
          voiceId: c.voiceId,
        })),
      } satisfies HouseholdPayload;
    });

    const { script, characterVoiceMap } = await step.run("generate-script", async () => {
      const scriptResult = await generateScript({
        showTitle: householdPayload.showTitle,
        selectedShows: householdPayload.showStyle,
        comedyNotes: householdPayload.comedyNotes,
        ownerName: householdPayload.ownerName,
        dogs: householdPayload.dogs.map((d) => ({
          name: d.name,
          breed: d.breed,
          personality: d.personality,
          characterBio: d.characterBio,
        })),
        castMembers: householdPayload.castMembers.map((c) => ({
          name: c.name,
          role: c.role,
        })),
        episodeNumber: householdPayload.episodeNum,
        season: householdPayload.season,
      });
      await prisma.episode.update({
        where: { id: householdPayload.episodeId },
        data: {
          title: scriptResult.episodeTitle,
          synopsis: scriptResult.synopsis,
          script: JSON.parse(JSON.stringify(scriptResult)),
        },
      });
      const map = buildCharacterVoiceMap(
        householdPayload.dogs,
        householdPayload.castMembers,
        scriptResult
      );
      await persistVoiceIds(householdPayload.dogs, householdPayload.castMembers, map);
      return { script: scriptResult, characterVoiceMap: map };
    });

    const primaryDog = householdPayload.dogs[0];
    if (!primaryDog) throw new Error("No dog");
    const fallbackAvatar = primaryDog.animatedAvatar ?? primaryDog.photoUrl;

    const sceneClipUrls = await step.run("animate-scenes", async () => {
      const sceneInputs = script.scenes.map((scene) => ({
        avatarImageUrl: getAvatarForScene(
          scene,
          householdPayload.dogs,
          householdPayload.castMembers,
          fallbackAvatar
        ),
        sceneDescription: scene.setting,
      }));
      return generateSceneClips(sceneInputs);
    });

    const audioBase64ByScene = await step.run("generate-audio", async () => {
      const sceneAudioBuffers = await generateSceneAudioTracks(
        script.scenes,
        characterVoiceMap,
        THOUGHT_BUBBLE_VOICE_ID
      );
      return sceneAudioBuffers.map((buf) => Buffer.from(buf).toString("base64"));
    });

    const urls = await step.run("assemble-video", async () => {
      const sceneAudioBuffers: Buffer[] = audioBase64ByScene.map((b64) =>
        Buffer.from(b64, "base64")
      );
      const plan = householdPayload.plan ?? "free";
      const applyWatermark = plan !== "pro" && plan !== "family";
      const castNames = [
        ...householdPayload.dogs.map((d) => d.name),
        ...householdPayload.castMembers.map((c) => c.name),
      ];
      const { verticalBuffer, landscapeBuffer, thumbnailBuffer } =
        await assembleFullEpisode({
          showTitle: householdPayload.showTitle,
          episodeTitle: script.episodeTitle,
          castNames,
          sceneClipUrls,
          sceneAudioBuffers,
          applyWatermark,
        });
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
        await notifyEpisodeReady({
          episodeTitle: script.episodeTitle,
          episodeId: householdPayload.episodeId,
          thumbnailUrl: urls.thumbnailUrl ?? null,
          userId: householdPayload.userId,
        });
      }
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
    const { householdId } = event.data;
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

    for (const dog of household.dogs) {
      try {
        const url = await generateDogAvatar(dog.name, dog.breed);
        await prisma.dog.update({
          where: { id: dog.id },
          data: { animatedAvatar: url },
        });
        results.dogs++;
      } catch (e) {
        results.errors.push(`Dog ${dog.name}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }

    for (const member of household.castMembers) {
      try {
        const url = await generateHumanAvatar(member.photoUrl);
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

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - x.getUTCDay());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

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
