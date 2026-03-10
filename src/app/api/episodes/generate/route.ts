import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { getPlanLimits } from "@/lib/plans";
import { getNextEpisodeConcept } from "@/lib/episodeDirector";

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - x.getUTCDay());
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { householdId, episodeNum, season } = body as {
      householdId?: string;
      episodeNum?: number;
      season?: number;
    };

    const [household, subscription] = await Promise.all([
      prisma.household.findFirst({
        where: { id: householdId, userId: user.id },
        include: { dogs: true },
      }),
      prisma.subscription.findUnique({ where: { userId: user.id } }),
    ]);
    if (!household || household.dogs.length === 0) {
      return NextResponse.json(
        { message: "Set up your household and dog first in onboarding" },
        { status: 400 }
      );
    }
    const limits = getPlanLimits(subscription?.plan);
    const weekStart = startOfWeek(new Date());
    const episodesThisWeek = await prisma.episode.count({
      where: {
        householdId: household.id,
        createdAt: { gte: weekStart },
      },
    });
    if (episodesThisWeek >= limits.maxEpisodesPerWeek) {
      return NextResponse.json(
        {
          message:
            limits.maxEpisodesPerWeek < 7
              ? "You've reached your limit of 3 episodes per week on the Free plan. Upgrade to Pro for daily episodes."
              : "Episode limit reached for this week.",
        },
        { status: 402 }
      );
    }

    const { concept, summary } = await getNextEpisodeConcept(household.id);
    const nextNum = episodeNum ?? (await prisma.episode.count({ where: { householdId: household.id } })) + 1;
    const nextSeason = season ?? 1;

    const episode = await prisma.episode.create({
      data: {
        householdId: household.id,
        title: concept.title,
        episodeNum: nextNum,
        season: nextSeason,
        synopsis: "",
        script: {},
        status: "generating",
        plannedConcept: concept as object,
      },
    });

    await inngest.send({
      name: "episode/generate",
      data: {
        episodeId: episode.id,
        householdId: household.id,
        episodeNum: episode.episodeNum,
        season: episode.season,
      },
    });

    return NextResponse.json({ episodeId: episode.id, summary });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed to queue episode" },
      { status: 500 }
    );
  }
}
