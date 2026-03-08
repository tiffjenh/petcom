import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

/** Re-trigger generation for an existing episode (e.g. after failure). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: episodeId } = await params;
    const episode = await prisma.episode.findFirst({
      where: {
        id: episodeId,
        household: { userId: user.id },
      },
    });

    if (!episode) {
      return NextResponse.json({ message: "Episode not found" }, { status: 404 });
    }

    await prisma.episode.update({
      where: { id: episodeId },
      data: { status: "generating" },
    });

    await inngest.send({
      name: "episode/generate",
      data: {
        episodeId: episode.id,
        householdId: episode.householdId,
        episodeNum: episode.episodeNum,
        season: episode.season,
      },
    });

    return NextResponse.json({ episodeId: episode.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed to queue episode" },
      { status: 500 }
    );
  }
}
