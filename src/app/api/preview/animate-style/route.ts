import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateKlingClip } from "@/lib/ai/fal-styles";
import { ANIMATION_CLIP_PROMPTS } from "@/lib/art-styles";

const CLIP_KEYS = Object.keys(ANIMATION_CLIP_PROMPTS) as (keyof typeof ANIMATION_CLIP_PROMPTS)[];

export async function POST(req: Request) {
  let body: { styleImageUrl?: string; artStyle?: string; dogName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const styleImageUrl = body.styleImageUrl?.trim();
  const artStyle = body.artStyle?.trim();
  const dogName = body.dogName?.trim() || "Your dog";
  if (!styleImageUrl || !artStyle) {
    return NextResponse.json(
      { error: "styleImageUrl and artStyle are required" },
      { status: 400 }
    );
  }

  const cached = await prisma.previewStyleClipCache.findUnique({
    where: {
      styleImageUrl_artStyle: { styleImageUrl, artStyle },
    },
  });
  if (cached) {
    const clips = cached.clips as Record<string, string>;
    return NextResponse.json({ clips });
  }

  const results = await Promise.all(
    CLIP_KEYS.map(async (key) => {
      const prompt = ANIMATION_CLIP_PROMPTS[key](dogName, artStyle);
      try {
        const url = await generateKlingClip(styleImageUrl, prompt);
        return { key, url };
      } catch (err) {
        return { key, url: null as string | null };
      }
    })
  );

  const clips: Record<string, string> = {};
  results.forEach((r) => {
    if (r.url) clips[r.key] = r.url;
  });

  await prisma.previewStyleClipCache.upsert({
    where: {
      styleImageUrl_artStyle: { styleImageUrl, artStyle },
    },
    create: {
      styleImageUrl,
      artStyle,
      clips,
    },
    update: { clips },
  });

  return NextResponse.json({ clips });
}
