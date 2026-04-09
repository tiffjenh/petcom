import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import ffmpeg from "fluent-ffmpeg";
import { getVoiceConfigForArchetype } from "./voice-archetypes";

if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);

let _client: ElevenLabsClient | null = null;
function getClient(): ElevenLabsClient {
  if (!_client) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY is required");
    _client = new ElevenLabsClient({ apiKey: key });
  }
  return _client;
}

const PLACEHOLDER = /^\.{3}$|^\.\.\.$/;
function envVoice(id: string | undefined, fallback: string): string {
  if (!id?.trim() || PLACEHOLDER.test(id.trim())) return fallback;
  return id.trim();
}

const NARRATOR_DEFAULT = "EXAVITQu4vr4xnSDxMaL";
const NARRATOR_VOICE_ID = envVoice(process.env.ELEVENLABS_VOICE_ID_NARRATOR, NARRATOR_DEFAULT);

/** Voice cast: different ElevenLabs voices per character role for TV-show feel. */
export const VOICE_CAST: Record<string, string> = {
  narrator: envVoice(process.env.ELEVENLABS_VOICE_ID_NARRATOR, NARRATOR_DEFAULT),
  dog_main: envVoice(process.env.ELEVENLABS_VOICE_ID_DOG, NARRATOR_DEFAULT),
  dog_large: envVoice(process.env.ELEVENLABS_VOICE_ID_DOG_LARGE, NARRATOR_DEFAULT),
  dog_small: envVoice(process.env.ELEVENLABS_VOICE_ID_DOG_SMALL, NARRATOR_DEFAULT),
  dog_husky: envVoice(process.env.ELEVENLABS_VOICE_ID_HUSKY, NARRATOR_DEFAULT),
  owner: envVoice(process.env.ELEVENLABS_VOICE_ID_OWNER, NARRATOR_DEFAULT),
};

export type SpeakerRole =
  | "narrator"
  | "dog_main"
  | "dog_large"
  | "dog_small"
  | "dog_husky"
  | "owner";

/** Map speaker role to ElevenLabs voice ID (from VOICE_CAST). */
export function getVoiceIdForSpeakerRole(role: SpeakerRole | undefined): string {
  if (!role || !(role in VOICE_CAST)) return VOICE_CAST.narrator;
  return VOICE_CAST[role];
}

/** Slightly echo-y, amused tone for dog thought bubbles (internal narrator). */
export const THOUGHT_BUBBLE_VOICE_ID =
  envVoice(process.env.ELEVENLABS_VOICE_ID_THOUGHT, "pNInz6obpgDQGcFmaJgB");

export async function generateSpeechToBuffer(text: string): Promise<Buffer> {
  const stream = await getClient().textToSpeech.convert(NARRATOR_VOICE_ID, {
    text: text.slice(0, 2500),
    modelId: "eleven_multilingual_v2",
  });
  const chunks: Buffer[] = [];
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

/** Optional voice settings for TTS (ElevenLabs). stability/style 0–1; similarity_boost when supported. */
export type VoiceSettings = { stability?: number; style?: number; similarity_boost?: number };

/** Generate TTS for a single line; returns MP3 buffer. */
export async function generateLineAudio(
  text: string,
  voiceId: string,
  options?: { voice_settings?: VoiceSettings }
): Promise<Buffer> {
  if (!text.trim()) return Buffer.alloc(0);
  const vs = options?.voice_settings;
  const body: Record<string, unknown> = {
    text: text.slice(0, 1000),
    modelId: "eleven_multilingual_v2",
  };
  if (vs && (vs.stability !== undefined || vs.style !== undefined || vs.similarity_boost !== undefined)) {
    body.voice_settings = {
      ...(vs.stability !== undefined && { stability: vs.stability }),
      ...(vs.style !== undefined && { style: vs.style }),
      ...(vs.similarity_boost !== undefined && { similarity_boost: vs.similarity_boost }),
    };
  }
  const stream = await getClient().textToSpeech.convert(voiceId, body);
  const chunks: Buffer[] = [];
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

/** Generate TTS for a single line using a voice archetype (stability/style from archetype). */
export async function generateLineAudioFromArchetype(
  text: string,
  archetypeId: string
): Promise<Buffer> {
  if (!text.trim()) return Buffer.alloc(0);
  const config = getVoiceConfigForArchetype(archetypeId);
  return generateLineAudio(text, config.voiceId, {
    voice_settings: {
      stability: config.stability,
      style: config.style,
      similarity_boost: config.similarity_boost,
    },
  });
}

export type DialogueLineForTts = {
  character: string;
  line: string;
  isThoughtBubble: boolean;
  /** Voice cast role (narrator, dog_main, owner, etc.). When set, overrides characterVoiceMap for voice ID. */
  speakerRole?: SpeakerRole;
  /** When set, use this voice archetype (id) for TTS instead of speakerRole/voiceId. */
  voiceArchetype?: string;
};

/** Map character name → ElevenLabs voice ID. Thought bubbles use a separate voice. Used when speakerRole not set. */
export type CharacterVoiceMap = Record<string, string>;

const MULTI_SPEAKER_GAP_SEC = 0.2;

/** Default archetype by speaker role when using archetype-based TTS (supporting characters). */
function getDefaultArchetypeForSpeakerRole(role: SpeakerRole | undefined): string {
  switch (role) {
    case "dog_main":
      return "professional"; // overridden by mainDogArchetype when provided
    case "dog_large":
      return "chill";
    case "dog_small":
      return "chaos";
    case "owner":
    case "narrator":
    default:
      return "narrator";
  }
}

/** Generate per-line TTS and stitch into one MP3 per scene. Uses archetypes when mainDogArchetype is set; else VOICE_CAST. */
export async function generateSceneAudioTracks(
  scenes: { dialogue: DialogueLineForTts[] }[],
  characterVoiceMap: CharacterVoiceMap,
  thoughtBubbleVoiceId: string = THOUGHT_BUBBLE_VOICE_ID,
  narratorVoiceSettings?: VoiceSettings,
  options?: { mainDogArchetype?: string }
): Promise<Buffer[]> {
  const mainDogArchetype = options?.mainDogArchetype;
  const useArchetypes = !!mainDogArchetype;

  const out: Buffer[] = [];
  for (const scene of scenes) {
    const buffers: Buffer[] = [];
    for (const d of scene.dialogue) {
      if (d.isThoughtBubble) {
        const buf = await generateLineAudio(d.line, thoughtBubbleVoiceId);
        if (buf.length) buffers.push(buf);
        continue;
      }
      if (useArchetypes) {
        const archetypeId =
          d.voiceArchetype ??
          (d.speakerRole === "dog_main" ? mainDogArchetype : getDefaultArchetypeForSpeakerRole(d.speakerRole));
        const config = getVoiceConfigForArchetype(archetypeId);
        const voiceOpts =
          archetypeId === "narrator" && narratorVoiceSettings
            ? { voice_settings: narratorVoiceSettings }
            : {
                voice_settings: {
                  stability: config.stability,
                  style: config.style,
                  similarity_boost: config.similarity_boost,
                },
              };
        const buf = await generateLineAudio(d.line, config.voiceId, voiceOpts);
        if (buf.length) buffers.push(buf);
        continue;
      }
      const voiceId = d.speakerRole
        ? getVoiceIdForSpeakerRole(d.speakerRole)
        : (characterVoiceMap[d.character] ?? VOICE_CAST.narrator);
      const isNarrator =
        (d.character === "Narrator" || d.speakerRole === "narrator") && !d.isThoughtBubble;
      const voiceOpts =
        isNarrator && narratorVoiceSettings
          ? { voice_settings: narratorVoiceSettings }
          : undefined;
      const buf = await generateLineAudio(d.line, voiceId, voiceOpts);
      if (buf.length) buffers.push(buf);
    }
    if (buffers.length === 0) {
      out.push(Buffer.alloc(0));
      continue;
    }
    if (buffers.length === 1) {
      out.push(buffers[0]);
      continue;
    }
    const stitched = await stitchAudioBuffersWithGap(buffers, MULTI_SPEAKER_GAP_SEC);
    out.push(stitched);
  }
  return out;
}

/** Concat MP3 buffers into one file (concat demuxer). Returns single MP3 buffer. */
export async function stitchAudioBuffers(buffers: Buffer[]): Promise<Buffer> {
  return stitchAudioBuffersWithGap(buffers, 0);
}

/** Concat MP3 buffers with optional gap (seconds) between each. Gap 0 = no silence between. */
export async function stitchAudioBuffersWithGap(
  buffers: Buffer[],
  gapSeconds: number
): Promise<Buffer> {
  const dir = tmpdir();
  const paths: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const p = join(dir, `${randomUUID()}-${i}.mp3`);
    await writeFile(p, buffers[i]);
    paths.push(p);
  }
  const outPath = join(dir, `${randomUUID()}-stitched.mp3`);
  if (gapSeconds <= 0 || paths.length <= 1) {
    const listPath = join(dir, `${randomUUID()}-list.txt`);
    const listContent = paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    await writeFile(listPath, listContent);
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(outPath)
        .on("error", reject)
        .on("end", () => resolve())
        .run();
    });
    await unlink(listPath).catch(() => {});
  } else {
    const listParts: string[] = [];
    const toCleanup: string[] = [...paths];
    for (let i = 0; i < paths.length; i++) {
      listParts.push(`file '${paths[i].replace(/'/g, "'\\''")}'`);
      if (i < paths.length - 1) {
        const silencePath = join(dir, `${randomUUID()}-silence.mp3`);
        toCleanup.push(silencePath);
        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input("anullsrc=r=44100:cl=stereo")
            .inputOptions(["-f", "lavfi"])
            .outputOptions(["-t", String(gapSeconds), "-q:a", "9", "-acodec", "libmp3lame"])
            .output(silencePath)
            .on("error", reject)
            .on("end", () => resolve())
            .run();
        });
        listParts.push(`file '${silencePath.replace(/'/g, "'\\''")}'`);
      }
    }
    const listPath = join(dir, `${randomUUID()}-list.txt`);
    toCleanup.push(listPath);
    await writeFile(listPath, listParts.join("\n"));
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(outPath)
        .on("error", reject)
        .on("end", () => resolve())
        .run();
    });
    await Promise.all(toCleanup.map((p) => unlink(p).catch(() => {})));
  }
  const result = await readFile(outPath);
  if (gapSeconds <= 0 || paths.length <= 1) {
    await Promise.all(paths.map((p) => unlink(p).catch(() => {})));
  }
  await unlink(outPath).catch(() => {});
  return result;
}
