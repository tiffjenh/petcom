import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { generateDogAvatar } from "@/lib/ai/avatar";
import {
  canRegenerateAvatar,
  avatarLimitMessage,
  getAvatarRegenUpdate,
} from "@/lib/avatar-limits";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateDbUser();
    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const dog = await prisma.dog.findFirst({
      where: { id, household: { userId: user.id } },
    });
    if (!dog)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    const plan = subscription?.plan ?? "free";
    const entity = {
      avatarRegenCount: dog.avatarRegenCount,
      avatarRegenMonth: dog.avatarRegenMonth ?? null,
      avatarRegenCountInMonth: dog.avatarRegenCountInMonth ?? 0,
    };

    if (!canRegenerateAvatar(entity, plan)) {
      return NextResponse.json(
        {
          message: avatarLimitMessage(entity, plan),
          code: "AVATAR_LIMIT",
        },
        { status: 402 }
      );
    }

    const url = await generateDogAvatar(dog.name, dog.breed);
    const regenUpdate = getAvatarRegenUpdate(entity, plan);
    await prisma.dog.update({
      where: { id },
      data: {
        animatedAvatar: url,
        ...regenUpdate,
      },
    });

    return NextResponse.json({ ok: true, animatedAvatar: url });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Regeneration failed" },
      { status: 500 }
    );
  }
}
