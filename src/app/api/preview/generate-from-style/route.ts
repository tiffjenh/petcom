import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPreviewRateLimit } from "@/lib/preview-rate-limit";
import { inngest } from "@/inngest/client";
import { randomUUID } from "crypto";

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

/** Generate a 30s trailer using an existing style image as the avatar (e.g. after user picks a style). */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { allowed, remaining } = await checkPreviewRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "rate_limit",
          message:
            "You've used your 2 free previews today! Come back tomorrow or create a free account.",
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const styleImageUrl = (body.styleImageUrl as string)?.trim();
    const dogName = (body.dogName as string)?.trim();
    const comedyStyle = typeof body.comedyStyle === "string" ? body.comedyStyle.trim() || null : null;
    if (!styleImageUrl || !dogName) {
      return NextResponse.json(
        { error: "styleImageUrl and dogName are required" },
        { status: 400 }
      );
    }

    const jobId = randomUUID();
    await prisma.previewGeneration.create({
      data: {
        jobId,
        ip,
        dogName,
        photoUrls: [styleImageUrl],
        avatarUrl: styleImageUrl,
        comedyStyle,
        status: "pending",
      },
    });

    await inngest.send({
      name: "preview/generate",
      data: { jobId },
    });

    return NextResponse.json({
      jobId,
      message: "Trailer generation started",
      remaining,
    });
  } catch (e) {
    console.error("Preview generate-from-style error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}
