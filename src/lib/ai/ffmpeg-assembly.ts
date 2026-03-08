import ffmpeg from "fluent-ffmpeg";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { writeFile, readFile, unlink } from "fs/promises";

const VERTICAL_W = 1080;
const VERTICAL_H = 1920;
const INTRO_DURATION = 5;
const TITLE_CARD_DURATION = 3;
const CREDITS_DURATION = 5;

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

/** Escape for ffmpeg drawtext (single quotes). */
function escapeDrawText(s: string): string {
  return s.replace(/'/g, "'\\''");
}

/** Generate a short segment: solid color + centered text, silent audio. */
function generateTextSegment(
  text: string,
  durationSec: number,
  outputPath: string
): Promise<void> {
  const escaped = escapeDrawText(text);
  const filter =
    `color=c=#1a1a2e:s=${VERTICAL_W}x${VERTICAL_H}:d=${durationSec}[v];` +
    `[v]drawtext=text='${escaped}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:borderw=2:bordercolor=black[out]`;
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input("anullsrc=r=44100:cl=stereo")
      .inputFormat("lavfi")
      .inputOptions(["-f", "lavfi", "-t", String(durationSec)])
      .outputOptions([
        "-filter_complex",
        filter,
        "-map",
        "[out]",
        "-map",
        "0:a",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

/** Generate credits segment: cast list + "A PawCast Original". */
function generateCreditsSegment(
  castNames: string[],
  outputPath: string
): Promise<void> {
  const line1 = castNames.length ? `Cast: ${castNames.join(", ")}` : "Cast: —";
  const line2 = "A PawCast Original";
  const e1 = escapeDrawText(line1);
  const e2 = escapeDrawText(line2);
  const filter =
    `color=c=#1a1a2e:s=${VERTICAL_W}x${VERTICAL_H}:d=${CREDITS_DURATION}[v];` +
    `[v]drawtext=text='${e1}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-60[vt];` +
    `[vt]drawtext=text='${e2}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2+20[out]`;
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input("anullsrc=r=44100:cl=stereo")
      .inputFormat("lavfi")
      .inputOptions(["-f", "lavfi", "-t", String(CREDITS_DURATION)])
      .outputOptions([
        "-filter_complex",
        filter,
        "-map",
        "[out]",
        "-map",
        "0:a",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

/** Merge one scene clip (URL) + scene audio (buffer), scale to 1080x1920, output MP4 path. */
async function buildSceneSegment(
  clipUrl: string,
  audioBuffer: Buffer
): Promise<string> {
  const videoPath = await downloadToTemp(clipUrl, "mp4");
  const outPath = bufferToTempPath() + "-scene.mp4";
  const hasAudio = audioBuffer.length > 0;
  if (hasAudio) {
    const audioPath = bufferToTempPath() + ".mp3";
    await writeFile(audioPath, audioBuffer);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .input(audioPath)
        .outputOptions([
          "-filter:v",
          `scale=${VERTICAL_W}:${VERTICAL_H}:force_original_aspect_ratio=decrease,pad=${VERTICAL_W}:${VERTICAL_H}:(ow-iw)/2:(oh-ih)/2`,
          "-c:a",
          "aac",
          "-shortest",
        ])
        .output(outPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    await unlink(audioPath).catch(() => {});
  } else {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .input("anullsrc=r=44100:cl=stereo")
        .inputFormat("lavfi")
        .inputOptions(["-f", "lavfi", "-t", "60"])
        .outputOptions([
          "-filter:v",
          `scale=${VERTICAL_W}:${VERTICAL_H}:force_original_aspect_ratio=decrease,pad=${VERTICAL_W}:${VERTICAL_H}:(ow-iw)/2:(oh-ih)/2`,
          "-c:a",
          "aac",
          "-shortest",
        ])
        .output(outPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
  }
  await unlink(videoPath).catch(() => {});
  return outPath;
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
 * Full pipeline: intro (5s) + episode title card (3s) + scene segments + credits (5s).
 * Encodes vertical 1080x1920 and landscape 1920x1080; thumbnail = first frame of scene 2 (or scene 1).
 */
export async function assembleFullEpisode(
  params: AssembleFullEpisodeParams
): Promise<AssembleFullEpisodeResult> {
  const {
    showTitle,
    episodeTitle,
    castNames,
    sceneClipUrls,
    sceneAudioBuffers,
    applyWatermark = true,
  } = params;

  const cleanup: string[] = [];
  const addCleanup = (p: string) => {
    cleanup.push(p);
    return p;
  };

  try {
    const introPath = addCleanup(bufferToTempPath() + "-intro.mp4");
    await generateTextSegment(showTitle, INTRO_DURATION, introPath);

    const titleCardPath = addCleanup(bufferToTempPath() + "-title.mp4");
    await generateTextSegment(episodeTitle, TITLE_CARD_DURATION, titleCardPath);

    const scenePaths: string[] = [];
    for (let i = 0; i < sceneClipUrls.length; i++) {
      const audio = sceneAudioBuffers[i];
      const segmentPath = await buildSceneSegment(
        sceneClipUrls[i],
        audio && audio.length > 0 ? audio : Buffer.alloc(0)
      );
      cleanup.push(segmentPath);
      scenePaths.push(segmentPath);
    }

    const creditsPath = addCleanup(bufferToTempPath() + "-credits.mp4");
    await generateCreditsSegment(castNames, creditsPath);

    const allSegments = [introPath, titleCardPath, ...scenePaths, creditsPath];
    const listPath = join(tmpdir(), `${randomUUID()}-concat.txt`);
    const listContent = allSegments
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join("\n");
    await writeFile(listPath, listContent);
    cleanup.push(listPath);

    const fullVerticalPath = join(tmpdir(), `${randomUUID()}-full-vertical.mp4`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(fullVerticalPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    cleanup.push(fullVerticalPath);

    let verticalBuffer: Buffer;
    if (applyWatermark) {
      const verticalOutPath = addCleanup(bufferToTempPath() + "-vertical-wm.mp4");
      await new Promise<void>((resolve, reject) => {
        ffmpeg(fullVerticalPath)
          .outputOptions([
            "-vf",
            "drawtext=text='PawCast':fontsize=28:fontcolor=white@0.5:x=w-text_w-24:y=h-text_h-24",
            "-c:a",
            "copy",
          ])
          .output(verticalOutPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
      verticalBuffer = await readFile(verticalOutPath);
    } else {
      verticalBuffer = await readFile(fullVerticalPath);
    }

    const fullLandscapePath = join(tmpdir(), `${randomUUID()}-full-landscape.mp4`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(fullVerticalPath)
        .outputOptions([
          "-vf",
          `scale=${1920}:${1080}:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`,
          "-c:a",
          "copy",
        ])
        .output(fullLandscapePath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    cleanup.push(fullLandscapePath);

    let landscapeBuffer: Buffer;
    if (applyWatermark) {
      const landscapeOutPath = addCleanup(bufferToTempPath() + "-landscape-wm.mp4");
      await new Promise<void>((resolve, reject) => {
        ffmpeg(fullLandscapePath)
          .outputOptions([
            "-vf",
            "drawtext=text='PawCast':fontsize=24:fontcolor=white@0.5:x=w-text_w-20:y=h-text_h-20",
            "-c:a",
            "copy",
          ])
          .output(landscapeOutPath)
          .on("end", () => resolve())
          .on("error", reject)
          .run();
      });
      landscapeBuffer = await readFile(landscapeOutPath);
    } else {
      landscapeBuffer = await readFile(fullLandscapePath);
    }

    const thumbSourcePath = scenePaths.length >= 2 ? scenePaths[1] : scenePaths[0];
    const thumbPath = join(tmpdir(), `${randomUUID()}-thumb.jpg`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(thumbSourcePath)
        .outputOptions(["-vframes", "1", "-q:v", "2"])
        .output(thumbPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
    const thumbnailBuffer = await readFile(thumbPath);
    cleanup.push(thumbPath);

    return { verticalBuffer, landscapeBuffer, thumbnailBuffer };
  } finally {
    await Promise.all(cleanup.map((p) => unlink(p).catch(() => {})));
  }
}
