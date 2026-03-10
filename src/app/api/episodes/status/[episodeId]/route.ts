import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function scriptIsEmpty(script: unknown): boolean {
  if (script == null || typeof script !== "object") return true;
  const o = script as Record<string, unknown>;
  return !o.title && !(Array.isArray(o.scenes) && o.scenes.length > 0);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params;
    if (!episodeId) {
      return NextResponse.json({ error: "episodeId required" }, { status: 400 });
    }
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: {
        status: true,
        title: true,
        synopsis: true,
        script: true,
        videoUrl: true,
        thumbnailUrl: true,
        householdId: true,
      },
    });
    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    let currentStep: "avatar" | "script" | "scenes" | "assembly" | "done" = "avatar";
    if (episode.status === "ready") {
      currentStep = "done";
    } else if (episode.status === "failed") {
      return NextResponse.json({
        status: "failed" as const,
        currentStep: "done",
        title: episode.title ?? undefined,
        synopsis: episode.synopsis ?? undefined,
        videoUrl: episode.videoUrl ?? undefined,
        thumbnailUrl: episode.thumbnailUrl ?? undefined,
        error: "Episode generation failed",
      });
    } else if (episode.status === "scripted") {
      currentStep = episode.videoUrl ? "done" : "assembly";
    } else {
      const household = await prisma.household.findUnique({
        where: { id: episode.householdId },
        include: { dogs: { select: { animatedAvatar: true } } },
      });
      const dog = household?.dogs?.[0];
      const hasAvatar = !!dog?.animatedAvatar;
      const hasScript = !scriptIsEmpty(episode.script);
      if (!hasAvatar) currentStep = "avatar";
      else if (!hasScript) currentStep = "script";
      else currentStep = "scenes";
    }

    return NextResponse.json({
      status: episode.status as "generating" | "scripted" | "ready" | "failed",
      currentStep,
      title: episode.title ?? undefined,
      synopsis: episode.synopsis ?? undefined,
      videoUrl: episode.videoUrl ?? undefined,
      thumbnailUrl: episode.thumbnailUrl ?? undefined,
    });
  } catch (e) {
    console.error("episodes/status error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
