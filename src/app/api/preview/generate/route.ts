import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase";
import { checkPreviewRateLimit } from "@/lib/preview-rate-limit";
import { inngest } from "@/inngest/client";
import { randomUUID } from "crypto";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic";
const PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10MB

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

export async function POST(req: Request) {
  try {
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

    const formData = await req.formData();
    const dogName = (formData.get("dogName") as string)?.trim();
    if (!dogName) {
      return NextResponse.json(
        { error: "dogName is required" },
        { status: 400 }
      );
    }

    const multiPhotos = formData.getAll("dogPhotos").filter((f): f is File => f instanceof File && f.size > 0);
    const photos = multiPhotos.slice(0, 3);
    if (photos.length === 0) {
      return NextResponse.json(
        { error: "At least one dog photo is required" },
        { status: 400 }
      );
    }

    for (const f of photos) {
      if (f.size > PHOTO_MAX_BYTES) {
        return NextResponse.json(
          { error: "Each photo must be under 10MB" },
          { status: 400 }
        );
      }
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "pawcast-media";
    const supabase = getSupabaseAdmin();
    const prefix = `previews/${randomUUID()}`;
    const photoUrls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${prefix}/photo_${i}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        console.error("Preview photo upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      photoUrls.push(urlData.publicUrl);
    }

    const jobId = randomUUID();
    await prisma.previewGeneration.create({
      data: {
        jobId,
        ip,
        dogName,
        photoUrls,
        status: "pending",
      },
    });

    await inngest.send({
      name: "preview/generate",
      data: { jobId },
    });

    return NextResponse.json({
      jobId,
      message: "Generation started",
      remaining,
    });
  } catch (e) {
    console.error("Preview generate error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}
