import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const user = await getOrCreateDbUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { householdId } = await params;
  const household = await prisma.household.findFirst({
    where: { id: householdId, userId: user.id },
    include: { dogs: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  if (!household) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const primaryDog = household.dogs[0];
  const avatarReady = !!primaryDog?.animatedAvatar;

  return NextResponse.json({ avatarReady });
}
