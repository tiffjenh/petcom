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
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const VERTICAL_W = 1080;
const VERTICAL_H = 1920;

/** Get duration in seconds (decimal) via ffprobe. */
async function getDuration(filePath: string): Promise<number> {
  const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const s = stdout.trim();
  const d = parseFloat(s);
  if (Number.isNaN(d) || d <= 0) throw new Error(`Invalid duration: ${s}`);
  return d;
}

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
  const { sceneClipUrls, sceneAudioBuffers } = params;

  if (sceneClipUrls.length === 0) {
    throw new Error("At least one scene clip URL required");
  }

  const cleanup: string[] = [];
  const addCleanup = (p: string) => {
    cleanup.push(p);
    return p;
  };

  try {
    // 1. Per scene: download clip, write audio, get durations, extend clip to match audio length (loop or trim)
    const extendedClipPaths: string[] = [];
    const audioPathsCollected: string[] = [];
    for (let i = 0; i < sceneClipUrls.length; i++) {
      const clipPath = addCleanup(await downloadToTemp(sceneClipUrls[i], "mp4"));
      const audioBuf = sceneAudioBuffers[i]?.length ? sceneAudioBuffers[i] : null;
      let outClipPath = clipPath;

      if (audioBuf && audioBuf.length > 0) {
        const audioPath = addCleanup(join(tmpdir(), `${randomUUID()}-a${i}.mp3`));
        await writeFile(audioPath, audioBuf);
        audioPathsCollected.push(audioPath);
        const clipDuration = await getDuration(clipPath);
        const audioDuration = await getDuration(audioPath);

        if (Math.abs(clipDuration - audioDuration) > 0.5) {
          const targetSec = audioDuration;
          outClipPath = addCleanup(join(tmpdir(), `${randomUUID()}-extended-${i}.mp4`));
          if (clipDuration < targetSec) {
            // Loop video to match narration: ffmpeg -stream_loop -1 -t [audioDuration] -i [videoClip] ...
            await new Promise<void>((resolve, reject) => {
              ffmpeg()
                .input(clipPath)
                .inputOptions(["-stream_loop", "-1"])
                .outputOptions(["-t", String(targetSec), "-c:v", "libx264", "-preset", "fast", "-an"])
                .output(outClipPath)
                .on("end", () => resolve())
                .on("error", reject)
                .run();
            });
          } else {
            await new Promise<void>((resolve, reject) => {
              ffmpeg(clipPath)
                .outputOptions(["-t", String(targetSec), "-c:v", "libx264", "-preset", "fast", "-an"])
                .output(outClipPath)
                .on("end", () => resolve())
                .on("error", reject)
                .run();
            });
          }
        }
      }
      extendedClipPaths.push(outClipPath);
    }

    // 2. Concat all (possibly extended) video clips
    const listPathV = addCleanup(join(tmpdir(), `${randomUUID()}-vlist.txt`));
    const listContentV = extendedClipPaths
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

    // 3. Concat audio (paths already written in step 1)
    const audioPaths = audioPathsCollected;
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

      // Optional: mix in background music at 15% volume (env BACKGROUND_MUSIC_URL = royalty-free MP3 URL)
      const musicUrl = process.env.BACKGROUND_MUSIC_URL?.trim();
      if (musicUrl) {
        const musicPath = addCleanup(await downloadToTemp(musicUrl, "mp3"));
        const mixedPath = addCleanup(join(tmpdir(), `${randomUUID()}-mixed-audio.mp3`));
        await new Promise<void>((resolve, reject) => {
          ffmpeg(rawAudioPath!)
            .input(musicPath)
            .outputOptions([
              "-filter_complex",
              "[0:a]volume=1[nar];[1:a]volume=0.15[bg];[nar][bg]amix=inputs=2:duration=first:dropout_transition=0[aout]",
              "-map",
              "[aout]",
              "-c:a",
              "libmp3lame",
              "-q:a",
              "4",
            ])
            .output(mixedPath)
            .on("end", () => resolve())
            .on("error", reject)
            .run();
        });
        rawAudioPath = mixedPath;
      }
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

    // 5. Vertical output (no watermark)
    const verticalBuffer = await readFile(fullVerticalPath);

    // 6. Landscape version (scale from vertical, no watermark)
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

    const landscapeBuffer = await readFile(fullLandscapePath);

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

/** V1: 8 clips (4 scenes × 2), 4 scene audio buffers. Hard cuts within scene; 3-frame fade to black between scenes. Hold last frame if audio > video (cap 20s). */
export type AssembleV1EpisodeParams = {
  showTitle: string;
  episodeTitle: string;
  /** 8 clip URLs in order: Scene1-ClipA, Scene1-ClipB, Scene2-ClipA, Scene2-ClipB, Scene3-ClipA, Scene3-ClipB, Scene4-ClipA, Scene4-ClipB */
  clipUrls: string[];
  /** 4 or 6 scene narrator audio buffers (concatenated). */
  sceneAudioBuffers: Buffer[];
};

const V1_FADE_DURATION_SEC = 0.1; // 3 frames at 30fps
const V1_HOLD_LAST_FRAME_CAP_SEC = 20;
const PILOT90_HOLD_LAST_FRAME_CAP_SEC = 30;

/**
 * V1 episode assembly: 8 or 12 clips (4 or 6 scenes × 2), 3×0.1s fade to black between scenes. Audio concat; if audio > video, hold last frame (cap 20s or 30s for 6 scenes). Music 12%, fade out last 3s.
 */
export async function assembleV1Episode(
  params: AssembleV1EpisodeParams
): Promise<AssembleFullEpisodeResult> {
  const { clipUrls, sceneAudioBuffers } = params;
  const sceneCount = sceneAudioBuffers.length;
  const expectedClips = sceneCount * 2;
  if (clipUrls.length !== expectedClips) {
    throw new Error(`assembleV1Episode expects ${expectedClips} clip URLs (${sceneCount} scenes × 2), got ${clipUrls.length}`);
  }
  if (sceneCount !== 4 && sceneCount !== 6) {
    throw new Error(`assembleV1Episode expects 4 or 6 scene audio buffers, got ${sceneCount}`);
  }
  const holdCapSec = sceneCount === 6 ? PILOT90_HOLD_LAST_FRAME_CAP_SEC : V1_HOLD_LAST_FRAME_CAP_SEC;

  const cleanup: string[] = [];
  const addCleanup = (p: string) => {
    cleanup.push(p);
    return p;
  };

  try {
    const clipPaths: string[] = [];
    for (let i = 0; i < clipUrls.length; i++) {
      clipPaths.push(addCleanup(await downloadToTemp(clipUrls[i], "mp4")));
    }

    const blackPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-black.mp4`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input("color=c=black:s=1280x720:d=" + V1_FADE_DURATION_SEC)
        .inputOptions(["-f", "lavfi"])
        .outputOptions(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", String(V1_FADE_DURATION_SEC)])
        .output(blackPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    const listParts: string[] = [];
    for (let i = 0; i < clipPaths.length; i++) {
      if (i >= 2 && i % 2 === 0) listParts.push(`file '${blackPath.replace(/'/g, "'\\''")}'`);
      listParts.push(`file '${clipPaths[i].replace(/'/g, "'\\''")}'`);
    }
    const listPathV = addCleanup(join(tmpdir(), `${randomUUID()}-v1-vlist.txt`));
    await writeFile(listPathV, listParts.join("\n"));
    const rawVideoPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-raw.mp4`));
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

    const videoDuration = await getDuration(rawVideoPath);
    const audioListPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-alist.txt`));
    const audioPaths: string[] = [];
    for (let i = 0; i < sceneAudioBuffers.length; i++) {
      const p = addCleanup(join(tmpdir(), `${randomUUID()}-v1-a${i}.mp3`));
      await writeFile(p, sceneAudioBuffers[i]);
      audioPaths.push(p);
    }
    await writeFile(
      audioListPath,
      audioPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n")
    );
    const concatAudioPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-concat-audio.mp3`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(audioListPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(concatAudioPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    let finalAudioPath = concatAudioPath;
    const audioDuration = await getDuration(concatAudioPath);

    const musicUrl = process.env.BACKGROUND_MUSIC_URL?.trim();
    if (musicUrl) {
      const musicPath = addCleanup(await downloadToTemp(musicUrl, "mp3"));
      const mixedPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-mixed.mp3`));
      await new Promise<void>((resolve, reject) => {
        ffmpeg(concatAudioPath)
          .input(musicPath)
          .outputOptions([
            "-filter_complex",
            "[0:a]volume=1[nar];[1:a]volume=0.12,afade=t=out:st=" + Math.max(0, audioDuration - 3) + ":d=3[bg];[nar][bg]amix=inputs=2:duration=first:dropout_transition=0[aout]",
            "-map", "[aout]",
            "-c:a", "libmp3lame", "-q:a", "4",
          ])
          .output(mixedPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
      finalAudioPath = mixedPath;
    }

    const extendSec = Math.min(holdCapSec, Math.max(0, audioDuration - videoDuration));
    let videoForMux = rawVideoPath;
    if (extendSec > 0.5) {
      const lastClipPath = clipPaths[clipPaths.length - 1];
      const holdPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-hold.mp4`));
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(lastClipPath)
          .inputOptions(["-stream_loop", "-1"])
          .outputOptions(["-t", String(extendSec), "-c:v", "libx264", "-preset", "fast", "-an"])
          .output(holdPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
      const extendedListPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-extended.txt`));
      await writeFile(
        extendedListPath,
        `file '${rawVideoPath.replace(/'/g, "'\\''")}'\nfile '${holdPath.replace(/'/g, "'\\''")}'`
      );
      videoForMux = addCleanup(join(tmpdir(), `${randomUUID()}-v1-extended.mp4`));
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(extendedListPath)
          .inputOptions(["-f", "concat", "-safe", "0"])
          .outputOptions(["-c", "copy"])
          .output(videoForMux)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
    }

    const scaleFilter = `scale=${VERTICAL_W}:${VERTICAL_H}:force_original_aspect_ratio=decrease,pad=${VERTICAL_W}:${VERTICAL_H}:(ow-iw)/2:(oh-ih)/2`;
    const fullVerticalPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-vertical.mp4`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoForMux)
        .input(finalAudioPath)
        .outputOptions(["-vf", scaleFilter, "-c:a", "aac", "-shortest"])
        .output(fullVerticalPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    const verticalBuffer = await readFile(fullVerticalPath);

    const fullLandscapePath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-landscape.mp4`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg(fullVerticalPath)
        .outputOptions([
          "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
          "-c:a", "copy",
        ])
        .output(fullLandscapePath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    const landscapeBuffer = await readFile(fullLandscapePath);

    const thumbPath = addCleanup(join(tmpdir(), `${randomUUID()}-v1-thumb.jpg`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg(clipPaths[0])
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

/** Pilot documentary: flat list of clip URLs (20), one continuous audio track. 2-frame fade to black between scenes only. */
export type AssemblePilotEpisodeParams = {
  showTitle: string;
  episodeTitle: string;
  /** All 20 clip URLs in scene order (2 per scene). */
  clipUrls: string[];
  /** Single continuous narration audio (all segments concatenated, no gaps). */
  fullAudioBuffer: Buffer;
};

const PILOT_CLIP_W = 512;
const PILOT_CLIP_H = 512;
/** 2 frames at 24fps for fade between scenes. */
const PILOT_FADE_DURATION_SEC = 2 / 24;

/**
 * Assemble pilot: concat all clips with hard cuts; insert 2-frame fade to black between every 2 clips (scene boundary).
 * Mux with full narration audio. Optional background music at 15% if BACKGROUND_MUSIC_URL set.
 */
export async function assemblePilotEpisode(
  params: AssemblePilotEpisodeParams
): Promise<AssembleFullEpisodeResult> {
  const { clipUrls, fullAudioBuffer } = params;
  if (clipUrls.length !== 20) {
    throw new Error(`Pilot expects exactly 20 clip URLs, got ${clipUrls.length}`);
  }

  const cleanup: string[] = [];
  const addCleanup = (p: string) => {
    cleanup.push(p);
    return p;
  };

  try {
    // 1. Download all 20 clips
    const clipPaths: string[] = [];
    for (let i = 0; i < clipUrls.length; i++) {
      clipPaths.push(addCleanup(await downloadToTemp(clipUrls[i], "mp4")));
    }

    // 2. Create one 2-frame black segment for scene boundaries
    const blackPath = addCleanup(join(tmpdir(), `${randomUUID()}-black.mp4`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input("color=c=black:s=" + PILOT_CLIP_W + "x" + PILOT_CLIP_H + ":d=" + PILOT_FADE_DURATION_SEC)
        .inputOptions(["-f", "lavfi"])
        .outputOptions(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", String(PILOT_FADE_DURATION_SEC)])
        .output(blackPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    // 3. Build concat list: clip0, clip1, black, clip2, clip3, black, ... clip18, clip19
    const listParts: string[] = [];
    for (let i = 0; i < clipPaths.length; i++) {
      if (i >= 2 && i % 2 === 0) {
        listParts.push(`file '${blackPath.replace(/'/g, "'\\''")}'`);
      }
      listParts.push(`file '${clipPaths[i].replace(/'/g, "'\\''")}'`);
    }
    const listPathV = addCleanup(join(tmpdir(), `${randomUUID()}-pilot-vlist.txt`));
    await writeFile(listPathV, listParts.join("\n"));

    const rawVideoPath = addCleanup(join(tmpdir(), `${randomUUID()}-pilot-raw.mp4`));
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

    // 4. Write full audio, optionally mix with background music
    const audioPath = addCleanup(join(tmpdir(), `${randomUUID()}-pilot-audio.mp3`));
    await writeFile(audioPath, fullAudioBuffer);
    let finalAudioPath = audioPath;
    const musicUrl = process.env.BACKGROUND_MUSIC_URL?.trim();
    if (musicUrl) {
      const musicPath = addCleanup(await downloadToTemp(musicUrl, "mp3"));
      const mixedPath = addCleanup(join(tmpdir(), `${randomUUID()}-pilot-mixed.mp3`));
      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioPath)
          .input(musicPath)
          .outputOptions([
            "-filter_complex",
            "[0:a]volume=1[nar];[1:a]volume=0.15[bg];[nar][bg]amix=inputs=2:duration=first:dropout_transition=0[aout]",
            "-map", "[aout]",
            "-c:a", "libmp3lame", "-q:a", "4",
          ])
          .output(mixedPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
      finalAudioPath = mixedPath;
    }

    // 5. Mux video + audio, scale to vertical 1080x1920
    const scaleFilter = `scale=${VERTICAL_W}:${VERTICAL_H}:force_original_aspect_ratio=decrease,pad=${VERTICAL_W}:${VERTICAL_H}:(ow-iw)/2:(oh-ih)/2`;
    const fullVerticalPath = addCleanup(join(tmpdir(), `${randomUUID()}-pilot-vertical.mp4`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg(rawVideoPath)
        .input(finalAudioPath)
        .outputOptions(["-vf", scaleFilter, "-c:a", "aac", "-shortest"])
        .output(fullVerticalPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    const verticalBuffer = await readFile(fullVerticalPath);

    // 6. Landscape
    const fullLandscapePath = addCleanup(join(tmpdir(), `${randomUUID()}-pilot-landscape.mp4`));
    await new Promise<void>((resolve, reject) => {
      ffmpeg(fullVerticalPath)
        .outputOptions([
          "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
          "-c:a", "copy",
        ])
        .output(fullLandscapePath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    const landscapeBuffer = await readFile(fullLandscapePath);

    // 7. Thumbnail
    const thumbPath = addCleanup(join(tmpdir(), `${randomUUID()}-pilot-thumb.jpg`));
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
