process.env.FFMPEG_PATH = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
process.env.FFPROBE_PATH = process.env.FFPROBE_PATH || "/opt/homebrew/bin/ffprobe";

import ffmpeg from "fluent-ffmpeg";
ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
console.log("[ffmpeg-assembly] using ffmpeg at:", process.env.FFMPEG_PATH);

import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { writeFile, readFile, unlink } from "fs/promises";

const VERTICAL_W = 1080;
const VERTICAL_H = 1920;

async function downloadToTemp(url: string, ext: string): Promise<string> {
  const res = await fetch(url);
  if (!res.body) throw new Error("No body");
  const path = join(tmpdir(), `${randomUUID()}.${ext}`);
  const file = createWriteStream(path);
  await pipeline(
    Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
    file
  );
  return path;
}

function bufferToTempPath(): string {
  return join(tmpdir(), `${randomUUID()}`);
}

export type AssembleFullEpisodeParams = {
  showTitle: string;
  episodeTitle: string;
  castNames: string[];
  sceneClipUrls: string[];
  sceneAudioBuffers: Buffer[];
  /** If false (e.g. Pro plan), no PawCast watermark is applied. Default true. */
  applyWatermark?: boolean;
};

export type AssembleFullEpisodeResult = {
  verticalBuffer: Buffer;
  landscapeBuffer: Buffer;
  thumbnailBuffer: Buffer;
};

/**
 * Simple pipeline: download clips → concat video → mux with concat audio → vertical + landscape + thumbnail.
 * No intro/title/credits, no lavfi.
 */
export async function assembleFullEpisode(
  params: AssembleFullEpisodeParams
): Promise<AssembleFullEpisodeResult> {
  const {
    sceneClipUrls,
    sceneAudioBuffers,
    applyWatermark = true,
  } = params;

  if (sceneClipUrls.length === 0) {
    throw new Error("At least one scene clip URL required");
  }

  const cleanup: string[] = [];
  const addCleanup = (p: string) => {
    cleanup.push(p);
    return p;
  };

  try {
    // 1. Download each clip to temp file
    const clipPaths: string[] = [];
    for (let i = 0; i < sceneClipUrls.length; i++) {
      const path = await downloadToTemp(sceneClipUrls[i], "mp4");
      addCleanup(path);
      clipPaths.push(path);
    }

    // 2. Concat all video clips (concat demuxer)
    const listPathV = addCleanup(join(tmpdir(), `${randomUUID()}-vlist.txt`));
    const listContentV = clipPaths
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join("\n");
    await writeFile(listPathV, listContentV);

    const rawVideoPath = addCleanup(join(tmpdir(), `${randomUUID()}-raw-video.mp4`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPathV)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(rawVideoPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    // 3. Write each audio buffer to temp file and concat
    const audioPaths: string[] = [];
    for (let i = 0; i < sceneAudioBuffers.length; i++) {
      const buf = sceneAudioBuffers[i] && sceneAudioBuffers[i].length > 0
        ? sceneAudioBuffers[i]
        : Buffer.alloc(0);
      if (buf.length > 0) {
        const ap = addCleanup(join(tmpdir(), `${randomUUID()}-a${i}.mp3`));
        await writeFile(ap, buf);
        audioPaths.push(ap);
      }
    }

    let rawAudioPath: string | null = null;
    if (audioPaths.length > 0) {
      const listPathA = addCleanup(join(tmpdir(), `${randomUUID()}-alist.txt`));
      const listContentA = audioPaths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join("\n");
      await writeFile(listPathA, listContentA);
      rawAudioPath = addCleanup(join(tmpdir(), `${randomUUID()}-raw-audio.mp3`));
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listPathA)
          .inputOptions(["-f", "concat", "-safe", "0"])
          .outputOptions(["-c", "copy"])
          .output(rawAudioPath!)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
    }

    // 4. Mux concatenated video + audio, scale to vertical 1080x1920
    const fullVerticalPath = addCleanup(join(tmpdir(), `${randomUUID()}-full-vertical.mp4`));
    const scaleFilter = `scale=${VERTICAL_W}:${VERTICAL_H}:force_original_aspect_ratio=decrease,pad=${VERTICAL_W}:${VERTICAL_H}:(ow-iw)/2:(oh-ih)/2`;
    if (rawAudioPath) {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(rawVideoPath)
          .input(rawAudioPath)
          .outputOptions([
            "-vf",
            scaleFilter,
            "-c:a",
            "aac",
            "-shortest",
          ])
          .output(fullVerticalPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(rawVideoPath)
          .outputOptions(["-vf", scaleFilter, "-c:v", "libx264", "-preset", "fast"])
          .output(fullVerticalPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
    }

    // 5. Optional watermark on vertical
    let verticalBuffer: Buffer;
    if (applyWatermark) {
      const verticalWmPath = addCleanup(join(tmpdir(), `${randomUUID()}-vertical-wm.mp4`));
      await new Promise<void>((resolve, reject) => {
        ffmpeg(fullVerticalPath)
          .outputOptions([
            "-vf",
            "drawtext=text='PawCast':fontsize=28:fontcolor=white@0.5:x=w-text_w-24:y=h-text_h-24",
            "-c:a",
            "copy",
          ])
          .output(verticalWmPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
      verticalBuffer = await readFile(verticalWmPath);
    } else {
      verticalBuffer = await readFile(fullVerticalPath);
    }

    // 6. Landscape version (scale from vertical)
    const fullLandscapePath = addCleanup(join(tmpdir(), `${randomUUID()}-full-landscape.mp4`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg(fullVerticalPath)
        .outputOptions([
          "-vf",
          "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
          "-c:a",
          "copy",
        ])
        .output(fullLandscapePath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    let landscapeBuffer: Buffer;
    if (applyWatermark) {
      const landscapeWmPath = addCleanup(join(tmpdir(), `${randomUUID()}-landscape-wm.mp4`));
      await new Promise<void>((resolve, reject) => {
        ffmpeg(fullLandscapePath)
          .outputOptions([
            "-vf",
            "drawtext=text='PawCast':fontsize=24:fontcolor=white@0.5:x=w-text_w-20:y=h-text_h-20",
            "-c:a",
            "copy",
          ])
          .output(landscapeWmPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
      landscapeBuffer = await readFile(landscapeWmPath);
    } else {
      landscapeBuffer = await readFile(fullLandscapePath);
    }

    // 7. Thumbnail = first frame of vertical
    const thumbPath = addCleanup(join(tmpdir(), `${randomUUID()}-thumb.jpg`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg(fullVerticalPath)
        .outputOptions(["-vframes", "1", "-q:v", "2"])
        .output(thumbPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    const thumbnailBuffer = await readFile(thumbPath);

    return { verticalBuffer, landscapeBuffer, thumbnailBuffer };
  } finally {
    await Promise.all(cleanup.map((p) => unlink(p).catch(() => {})));
  }
}
