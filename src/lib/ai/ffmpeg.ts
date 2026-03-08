import ffmpeg from "fluent-ffmpeg";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { writeFile, readFile, unlink } from "fs/promises";

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

async function bufferToTemp(buffer: Buffer, ext: string): Promise<string> {
  const path = join(tmpdir(), `${randomUUID()}.${ext}`);
  await writeFile(path, buffer);
  return path;
}

export async function assembleEpisodeVideo(
  videoUrl: string,
  audioBufferOrUrl: Buffer | string
): Promise<Buffer> {
  let videoPath: string;
  let audioPath: string;

  if (videoUrl.startsWith("http")) {
    videoPath = await downloadToTemp(videoUrl, "mp4");
  } else {
    throw new Error("Video URL must be HTTP");
  }

  if (Buffer.isBuffer(audioBufferOrUrl)) {
    audioPath = await bufferToTemp(audioBufferOrUrl, "mp3");
  } else if (audioBufferOrUrl.startsWith("data:")) {
    const base64 = audioBufferOrUrl.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    audioPath = await bufferToTemp(Buffer.from(base64, "base64"), "mp3");
  } else {
    audioPath = await downloadToTemp(audioBufferOrUrl, "mp3");
  }

  const outputPath = join(tmpdir(), `${randomUUID()}-episode.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)
      .outputOptions(["-c:v copy", "-c:a aac", "-shortest"])
      .output(outputPath)
      .on("end", async () => {
        try {
          const buffer = await readFile(outputPath);
          await unlink(outputPath).catch(() => {});
          await unlink(videoPath).catch(() => {});
          await unlink(audioPath).catch(() => {});
          resolve(buffer);
        } catch (e) {
          reject(e);
        }
      })
      .on("error", reject)
      .run();
  });
}
