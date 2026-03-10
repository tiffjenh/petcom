import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { getPlanLimits } from "@/lib/plans";
import { sendWelcomeEmail } from "@/lib/notify";

type Body = {
  dogName: string;
  breed?: string;
  photoUrls: string[];
  ownerName?: string;
  personality?: string[];
  characterBio?: string;
  showTitle?: string;
  comedyShows?: string[];
};

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
    const maxComedyPicks = limits.maxComedyStylePicks ?? 3;

    const body = (await req.json()) as Body;
    const dogName = body.dogName?.trim();
    const photoUrls = Array.isArray(body.photoUrls) ? body.photoUrls.filter((u) => typeof u === "string" && u.trim()) : [];

    if (!dogName) {
      return NextResponse.json({ message: "Dog name is required" }, { status: 400 });
    }
    if (photoUrls.length === 0) {
      return NextResponse.json({ message: "At least one photo URL is required" }, { status: 400 });
    }

    const personality = (body.personality ?? []).slice(0, 4);
    const comedyShows = (body.comedyShows ?? []).slice(0, maxComedyPicks);
    const showTitle = body.showTitle?.trim() || `Life with ${dogName}`;

    const household = await prisma.household.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        showTitle,
        showStyle: comedyShows,
        ownerName: body.ownerName?.trim() || null,
      },
      update: {
        showTitle,
        showStyle: comedyShows,
        ownerName: body.ownerName?.trim() ?? undefined,
      },
    });

    await prisma.dog.deleteMany({ where: { householdId: household.id } });

    const primaryPhotoUrl = photoUrls[0];
    const dog = await prisma.dog.create({
      data: {
        householdId: household.id,
        name: dogName,
        breed: body.breed?.trim() || null,
        personality,
        characterBio: body.characterBio?.trim() || null,
        photoUrl: primaryPhotoUrl,
      },
    });

    await inngest.send({
      name: "avatar/generate",
      data: {
        householdId: household.id,
        photoUrls,
      },
    });

    const isFirstOnboarding = !user.completedOnboardingAt;
    if (isFirstOnboarding) {
      await prisma.user.update({
        where: { id: user.id },
        data: { completedOnboardingAt: new Date() },
      });
      if (user.email) await sendWelcomeEmail(user.email);
    }

    return NextResponse.json({
      householdId: household.id,
      jobId: household.id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed to create household" },
      { status: 500 }
    );
  }
}
