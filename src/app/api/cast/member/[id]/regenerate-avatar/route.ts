import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { generateHumanAvatar } from "@/lib/ai/avatar";
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
    const member = await prisma.castMember.findFirst({
      where: { id, household: { userId: user.id } },
    });
    if (!member)
      return NextResponse.json({ message: "Not found" }, { status: 404 });

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    const plan = subscription?.plan ?? "free";
    const entity = {
      avatarRegenCount: member.avatarRegenCount,
      avatarRegenMonth: member.avatarRegenMonth ?? null,
      avatarRegenCountInMonth: member.avatarRegenCountInMonth ?? 0,
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

    const url = await generateHumanAvatar(member.photoUrl);
    const regenUpdate = getAvatarRegenUpdate(entity, plan);
    await prisma.castMember.update({
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
