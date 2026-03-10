import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export const maxDuration = 30;

const PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const photo1 = formData.get("photo1") as File | null;
    const photo2 = formData.get("photo2") as File | null;
    const photo3 = formData.get("photo3") as File | null;

    if (!photo1 || !(photo1 instanceof File) || photo1.size === 0) {
      return NextResponse.json(
        { error: "At least one photo (photo1) is required" },
        { status: 400 }
      );
    }

    const files = [photo1, photo2, photo3].filter(
      (f): f is File => f != null && f instanceof File && f.size > 0
    );

    for (const file of files) {
      if (file.size > PHOTO_MAX_BYTES) {
        return NextResponse.json(
          { error: "Each photo must be under 10MB" },
          { status: 400 }
        );
      }
    }

    const bucket =
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "pawcast-media";
    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error("Preview photo upload: Supabase not configured", e);
      return NextResponse.json(
        {
          error:
            "Upload failed. Connect Supabase (see docs/CONNECTING_SERVICES.md).",
        },
        { status: 503 }
      );
    }

    const sessionId = randomUUID();
    const photoUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `previews/${sessionId}/photo_${i + 1}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });
      if (error) {
        console.error("Preview photo upload error:", error.message, error);
        const isBadGateway = /bad gateway|502/i.test(error.message);
        const hint = isBadGateway
          ? `Upload failed: Supabase returned Bad Gateway. Check that your project is active (not paused) in the Supabase dashboard, then try again. Ensure a public bucket named "${bucket}" exists in Storage.`
          : error.message
            ? `Upload failed: ${error.message}. Create a public bucket named "${bucket}" in Supabase → Storage.`
            : "Upload failed. Check Supabase storage and bucket (e.g. pawcast-media).";
        return NextResponse.json({ error: hint }, { status: 500 });
      }
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      photoUrls.push(urlData.publicUrl);
    }

    return NextResponse.json({ photoUrls, sessionId });
  } catch (e) {
    console.error("Upload photo error:", e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    const hint = msg.includes("Supabase") ? msg : "Upload failed. Is Supabase connected? See docs/CONNECTING_SERVICES.md.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
