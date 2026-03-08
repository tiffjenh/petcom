import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import ffmpeg from "fluent-ffmpeg";

let _client: ElevenLabsClient | null = null;
function getClient(): ElevenLabsClient {
  if (!_client) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY is required");
    _client = new ElevenLabsClient({ apiKey: key });
  }
  return _client;
}

const NARRATOR_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID_NARRATOR || "EXAVITQu4vr4xnSDxMaL";
/** Slightly echo-y, amused tone for dog thought bubbles (internal narrator). */
const THOUGHT_BUBBLE_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID_THOUGHT || "pNInz6obpgDQGcFmaJgB";

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

/** Generate TTS for a single line; returns MP3 buffer. */
export async function generateLineAudio(
  text: string,
  voiceId: string
): Promise<Buffer> {
  if (!text.trim()) return Buffer.alloc(0);
  const stream = await getClient().textToSpeech.convert(voiceId, {
    text: text.slice(0, 1000),
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

export type DialogueLineForTts = {
  character: string;
  line: string;
  isThoughtBubble: boolean;
};

/** Map character name → ElevenLabs voice ID. Thought bubbles use a separate voice. */
export type CharacterVoiceMap = Record<string, string>;

/** Generate per-line TTS and stitch into one MP3 per scene. Returns one Buffer per scene. */
export async function generateSceneAudioTracks(
  scenes: { dialogue: DialogueLineForTts[] }[],
  characterVoiceMap: CharacterVoiceMap,
  thoughtBubbleVoiceId: string = THOUGHT_BUBBLE_VOICE_ID
): Promise<Buffer[]> {
  const defaultVoiceId = NARRATOR_VOICE_ID;
  const getVoiceId = (character: string, isThoughtBubble: boolean) =>
    isThoughtBubble ? thoughtBubbleVoiceId : (characterVoiceMap[character] ?? defaultVoiceId);

  const out: Buffer[] = [];
  for (const scene of scenes) {
    const buffers: Buffer[] = [];
    for (const d of scene.dialogue) {
      const voiceId = getVoiceId(d.character, d.isThoughtBubble);
      const buf = await generateLineAudio(d.line, voiceId);
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
    const stitched = await stitchAudioBuffers(buffers);
    out.push(stitched);
  }
  return out;
}

/** Concat MP3 buffers into one file (concat demuxer). Returns single MP3 buffer. */
export async function stitchAudioBuffers(buffers: Buffer[]): Promise<Buffer> {
  const dir = tmpdir();
  const paths: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const p = join(dir, `${randomUUID()}-${i}.mp3`);
    await writeFile(p, buffers[i]);
    paths.push(p);
  }
  const listPath = join(dir, `${randomUUID()}-list.txt`);
  const listContent = paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(listPath, listContent);
  const outPath = join(dir, `${randomUUID()}-stitched.mp3`);
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
  const result = await readFile(outPath);
  await Promise.all([
    ...paths.map((p) => unlink(p).catch(() => {})),
    unlink(listPath).catch(() => {}),
    unlink(outPath).catch(() => {}),
  ]);
  return result;
}
