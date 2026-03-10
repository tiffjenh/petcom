import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPreviewRateLimit, checkDemoDailyCap } from "@/lib/preview-rate-limit";
import { generateDogAvatar } from "@/lib/ai/fal-styles";
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
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms for ${label}`)), ms)
    ),
  ]);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const { allowed, remaining } = await checkPreviewRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limit", message: "Demo limit reached. Sign up for unlimited access!" },
      { status: 429 }
    );
  }

  const overCap = await checkDemoDailyCap();
  if (overCap) {
    return NextResponse.json(
      { error: "High demand! Join the waitlist for early access.", waitlist: true },
      { status: 503 }
    );
  }

  let body: { photoUrls?: string[]; dogName?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const photoUrls = Array.isArray(body.photoUrls) ? body.photoUrls : [];
  const dogName = body.dogName?.trim() || "Your dog";
  if (photoUrls.length === 0) {
    return NextResponse.json(
      { error: "photoUrls array with at least one URL is required" },
      { status: 400 }
    );
  }

  const trimmedUrls = photoUrls
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter(Boolean);
  if (trimmedUrls.length === 0) {
    return NextResponse.json(
      { error: "photoUrls must contain at least one valid URL" },
      { status: 400 }
    );
  }

  console.log("Demo generation - single avatar", {
    ip: ip.substring(0, 8),
    dogName,
    photoCount: trimmedUrls.length,
    timestamp: new Date().toISOString(),
  });

  const jobId = randomUUID();
  await prisma.previewGeneration.create({
    data: {
      jobId,
      ip,
      dogName,
      photoUrls: trimmedUrls,
      status: "processing",
    },
  });

  const encoder = new TextEncoder();
  const STYLE_KEY = "cinematicCG";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const styleImages: Record<string, string> = {};

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ jobId, remaining })}\n\n`)
      );

      try {
        const url = await withTimeout(
          generateDogAvatar(trimmedUrls, dogName),
          45000,
          "avatar"
        );
        styleImages[STYLE_KEY] = url;
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ styleKey: STYLE_KEY, imageUrl: url })}\n\n`
          )
        );
        console.log("Avatar complete", { success: true, timestamp: new Date().toISOString() });
      } catch (err: unknown) {
        const errAny = err as { message?: string; body?: unknown; response?: unknown; status?: number };
        const errorMsg = errAny?.message ?? String(err);
        console.error("Avatar failed", {
          message: errorMsg,
          body: errAny?.body ?? errAny?.response,
          status: errAny?.status,
        });
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ styleKey: STYLE_KEY, error: errorMsg })}\n\n`
          )
        );
      }

      try {
        await prisma.previewGeneration.update({
          where: { jobId },
          data: { styleImages, status: "completed", completedAt: new Date() },
        });
      } catch (e) {
        console.error("Preview update error:", e);
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
