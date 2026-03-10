import ffmpeg from "fluent-ffmpeg";

if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);

import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

/** Download a URL to a temp file. Returns path. */
export async function downloadToTemp(url: string, ext: string): Promise<string> {
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

/** Concatenate multiple video files (same codec) into one. Returns path to concatenated file. */
export async function concatenateVideos(paths: string[]): Promise<string> {
  if (paths.length === 0) throw new Error("At least one video path required");
  if (paths.length === 1) return paths[0];
  const listPath = join(tmpdir(), `${randomUUID()}_concat_list.txt`);
  const listContent = paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(listPath, listContent);
  const outPath = join(tmpdir(), `${randomUUID()}_concat.mp4`);
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c", "copy"])
      .output(outPath)
      .on("end", async () => {
        await unlink(listPath).catch(() => {});
        resolve(outPath);
      })
      .on("error", reject)
      .run();
  });
}

/** Mux one video file with one audio file. Output trimmed to shortest. */
export async function assembleTrailer(
  videoClipPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoClipPath)
      .input(audioPath)
      .outputOptions([
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        "-map", "0:v:0",
        "-map", "1:a:0",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

/** Concatenate multiple video clips then mux with audio. */
export async function assembleTrailerFromClips(
  videoClipPaths: string[],
  audioPath: string,
  outputPath: string
): Promise<void> {
  const singleVideo = await concatenateVideos(videoClipPaths);
  await assembleTrailer(singleVideo, audioPath, outputPath);
  if (singleVideo !== videoClipPaths[0]) {
    await unlink(singleVideo).catch(() => {});
  }
}

export { readFile, writeFile, unlink };
