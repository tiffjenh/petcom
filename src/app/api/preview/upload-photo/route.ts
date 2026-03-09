import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export const maxDuration = 30;

const PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "A single photo file is required" },
        { status: 400 }
      );
    }
    if (file.size > PHOTO_MAX_BYTES) {
      return NextResponse.json(
        { error: "Photo must be under 10MB" },
        { status: 400 }
      );
    }
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "pawcast-media";
    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (e) {
      console.error("Preview photo upload: Supabase not configured", e);
      return NextResponse.json(
        { error: "Upload failed. Connect Supabase (see docs/CONNECTING_SERVICES.md)." },
        { status: 503 }
      );
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `previews/${randomUUID()}/style_photo.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
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
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error("Upload photo error:", e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    const hint = msg.includes("Supabase") ? msg : "Upload failed. Is Supabase connected? See docs/CONNECTING_SERVICES.md.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
