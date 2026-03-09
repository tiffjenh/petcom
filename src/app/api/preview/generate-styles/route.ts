import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPreviewRateLimit } from "@/lib/preview-rate-limit";
import { generateStyleImage } from "@/lib/ai/fal-styles";
import { ART_STYLES } from "@/lib/art-styles";
import type { ArtStyleKey } from "@/lib/art-styles";
import { randomUUID } from "crypto";

export const maxDuration = 60;

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  styleKey: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout after ${ms}ms for ${styleKey}`)),
        ms
      )
    ),
  ]);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, remaining } = await checkPreviewRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "rate_limit",
        message:
          "You've used your 2 free previews today! Come back tomorrow or create a free account for weekly episodes.",
      },
      { status: 429 }
    );
  }

  let body: { dogPhotoUrl?: string; dogName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const dogPhotoUrl = body.dogPhotoUrl?.trim();
  const dogName = body.dogName?.trim() || "Your dog";
  if (!dogPhotoUrl) {
    return NextResponse.json(
      { error: "dogPhotoUrl is required" },
      { status: 400 }
    );
  }

  console.log("generate-styles called", {
    dogName,
    timestamp: new Date().toISOString(),
  });

  const jobId = randomUUID();
  await prisma.previewGeneration.create({
    data: {
      jobId,
      ip,
      dogName,
      photoUrls: [dogPhotoUrl],
      status: "processing",
    },
  });

  const encoder = new TextEncoder();
  const styleKeys = ART_STYLES.map((s) => s.key as ArtStyleKey);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const styleImages: Record<string, string> = {};

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ jobId, remaining })}\n\n`
        )
      );

      const runOne = async (key: ArtStyleKey) => {
        try {
          const url = await withTimeout(
            generateStyleImage(dogPhotoUrl, dogName, key),
            45000,
            key
          );
          styleImages[key] = url;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ styleKey: key, imageUrl: url })}\n\n`
            )
          );
          console.log(`Style complete: ${key}`, {
            success: true,
            timestamp: new Date().toISOString(),
          });
        } catch (err: unknown) {
          const errAny = err as { message?: string; body?: unknown; response?: unknown; status?: number };
          const errorMsg = errAny?.message ?? String(err);
          const errorBody = errAny?.body ?? errAny?.response ?? "";
          console.error(`Style failed: ${key}`, {
            message: errorMsg,
            body: typeof errorBody === "object" ? JSON.stringify(errorBody) : String(errorBody),
            status: errAny?.status,
          });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ styleKey: key, error: errorMsg })}\n\n`
            )
          );
          console.log(`Style complete: ${key}`, {
            success: false,
            timestamp: new Date().toISOString(),
          });
        }
      };

      try {
        for (const key of styleKeys) {
          await runOne(key);
        }
        await prisma.previewGeneration.update({
          where: { jobId },
          data: { styleImages, status: "completed", completedAt: new Date() },
        });
      } catch (err) {
        console.error("Style generation error:", err);
      } finally {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
