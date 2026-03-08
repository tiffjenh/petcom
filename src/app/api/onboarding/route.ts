import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { getPlanLimits } from "@/lib/plans";
import { sendWelcomeEmail } from "@/lib/notify";

type DogInput = { name: string; breed?: string; personality?: string[]; characterBio?: string; photoUrl: string };
type CastInput = { name: string; role: string; photoUrl: string };

export async function POST(req: Request) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    const limits = getPlanLimits(subscription?.plan);

    const body = await req.json();
    const {
      showTitle,
      showStyle,
      comedyNotes,
      ownerName,
      dogs,
      castMembers,
    } = body as {
      showTitle?: string;
      showStyle?: string[];
      comedyNotes?: string;
      ownerName?: string;
      dogs?: DogInput[];
      castMembers?: CastInput[];
    };

    const validDogs = (dogs ?? []).filter((d) => d.name && d.photoUrl).slice(0, limits.maxDogs);
    const validCast = (castMembers ?? []).filter((c) => c.name && c.photoUrl).slice(0, limits.maxCastMembers);
    const stylePicks = (showStyle ?? []).slice(0, limits.maxComedyStylePicks);

    const household = await prisma.household.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        showTitle: showTitle || "My Dog's Show",
        showStyle: stylePicks,
        comedyNotes: comedyNotes || null,
        ownerName: ownerName?.trim() || null,
      },
      update: {
        showTitle: showTitle ?? undefined,
        showStyle: stylePicks,
        comedyNotes: comedyNotes ?? undefined,
        ownerName: ownerName?.trim() ?? undefined,
      },
    });

    await prisma.dog.deleteMany({ where: { householdId: household.id } });
    await prisma.castMember.deleteMany({ where: { householdId: household.id } });

    if (validDogs.length) {
      for (const d of validDogs) {
        await prisma.dog.create({
          data: {
            householdId: household.id,
            name: d.name,
            breed: d.breed || null,
            personality: d.personality ?? [],
            characterBio: d.characterBio?.trim() || null,
            photoUrl: d.photoUrl,
          },
        });
      }
    }

    if (validCast.length) {
      for (const c of validCast) {
        await prisma.castMember.create({
          data: {
            householdId: household.id,
            name: c.name,
            role: c.role || "Owner",
            photoUrl: c.photoUrl,
          },
        });
      }
    }

    if (validDogs.length > 0 || validCast.length > 0) {
      await inngest.send({
        name: "avatar/generate",
        data: { householdId: household.id },
      });
    }

    const isFirstOnboarding = !user.completedOnboardingAt;
    if (isFirstOnboarding && (validDogs.length > 0 || validCast.length > 0)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { completedOnboardingAt: new Date() },
      });
      if (user.email) await sendWelcomeEmail(user.email);
    }

    return NextResponse.json({ householdId: household.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed to save" },
      { status: 500 }
    );
  }
}
