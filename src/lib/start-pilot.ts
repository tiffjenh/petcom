import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { sendWelcomeEmail } from "@/lib/notify";

export type StartPilotBody = {
  dogName: string;
  breed?: string;
  ownerName?: string;
  showTitle?: string;
  personality?: string[];
  characterBio?: string;
  humorStyles?: string[];
  humorStyleLabels?: string[]; // demo flow sends this
  photoUrls: string[];
};

export async function runStartPilot(user: User, body: StartPilotBody) {
  const photoUrls = Array.isArray(body.photoUrls)
    ? body.photoUrls.filter((u: unknown) => typeof u === "string" && (u as string).trim())
    : [];
  const dogName = typeof body.dogName === "string" ? body.dogName.trim() : "";
  const breed = typeof body.breed === "string" ? body.breed.trim() || undefined : undefined;
  const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() || undefined : undefined;
  const showTitle = typeof body.showTitle === "string" ? body.showTitle.trim() : "";
  const personality = Array.isArray(body.personality) ? body.personality : [];
  const characterBio = typeof body.characterBio === "string" ? body.characterBio.trim() || undefined : undefined;
  const humorStyles =
    Array.isArray(body.humorStyles) && body.humorStyles.length > 0
      ? body.humorStyles
      : Array.isArray(body.humorStyleLabels)
        ? body.humorStyleLabels
        : [];

  if (!dogName || photoUrls.length === 0) {
    return NextResponse.json(
      { error: "dogName and photoUrls (at least one) are required" },
      { status: 400 }
    );
  }

  const finalShowTitle = showTitle || `Life with ${dogName}`;

  const household = await prisma.household.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      showTitle: finalShowTitle,
      showStyle: humorStyles.length > 0 ? humorStyles : ["Pixar-style sitcom"],
      ownerName: ownerName ?? null,
    },
    update: {
      showTitle: finalShowTitle,
      showStyle: humorStyles.length > 0 ? humorStyles : ["Pixar-style sitcom"],
      ownerName: ownerName ?? undefined,
    },
  });

  await prisma.dog.deleteMany({ where: { householdId: household.id } });
  const dog = await prisma.dog.create({
    data: {
      householdId: household.id,
      name: dogName,
      breed: breed ?? null,
      personality,
      characterBio: characterBio ?? null,
      photoUrl: photoUrls[0],
    },
  });

  const episode = await prisma.episode.create({
    data: {
      householdId: household.id,
      title: "Pilot",
      episodeNum: 1,
      season: 1,
      synopsis: "Your first episode is being filmed...",
      script: {},
      status: "generating",
    },
  });

  if (!process.env.INNGEST_EVENT_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Inngest is not configured. Add INNGEST_EVENT_KEY to .env.local and run the Inngest dev server (npm run inngest:dev). Get the event key from the Inngest dev UI (e.g. http://localhost:8288).",
      },
      { status: 503 }
    );
  }

  const isFirstOnboarding = !user.completedOnboardingAt;
  if (isFirstOnboarding) {
    await prisma.user.update({
      where: { id: user.id },
      data: { completedOnboardingAt: new Date() },
    });
    if (user.email) await sendWelcomeEmail(user.email);
  }

  await inngest.send({
    name: "episode/generate",
    data: {
      episodeId: episode.id,
      householdId: household.id,
      dogId: dog.id,
      photoUrls,
      dogName,
      breed: breed ?? null,
      personality,
      characterBio: characterBio ?? null,
      humorStyles,
      ownerName: ownerName ?? null,
      showTitle: finalShowTitle,
    },
  });

  return NextResponse.json({
    episodeId: episode.id,
    householdId: household.id,
    jobId: episode.id,
  });
}
