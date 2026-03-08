import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { getSupabaseAdmin, getSupabaseStorageBucket } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ message: "No file" }, { status: 400 });
    }

    const bucket = getSupabaseStorageBucket();
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await getSupabaseAdmin().storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { message: error.message || "Upload failed" },
        { status: 500 }
      );
    }

    const { data: urlData } = getSupabaseAdmin().storage
      .from(bucket)
      .getPublicUrl(data.path);
    const url = urlData.publicUrl;

    return NextResponse.json({ url, path: data.path });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
