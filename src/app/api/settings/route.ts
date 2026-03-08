import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plans";

export async function PATCH(req: Request) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { showTitle, showStyle, comedyNotes, notificationEmail, notificationPush, notificationTime } = body as {
      showTitle?: string;
      showStyle?: string[];
      comedyNotes?: string;
      notificationEmail?: boolean;
      notificationPush?: boolean;
      notificationTime?: string;
    };

    const [household, subscription] = await Promise.all([
      prisma.household.findUnique({ where: { userId: user.id } }),
      prisma.subscription.findUnique({ where: { userId: user.id } }),
    ]);
    if (!household) {
      return NextResponse.json({ message: "No household" }, { status: 404 });
    }
    const limits = getPlanLimits(subscription?.plan);
    const trimmedStyle =
      showStyle !== undefined ? showStyle.slice(0, limits.maxComedyStylePicks) : undefined;

    await Promise.all([
      prisma.household.update({
        where: { id: household.id },
        data: {
          ...(showTitle !== undefined && { showTitle }),
          ...(trimmedStyle !== undefined && { showStyle: trimmedStyle }),
          ...(comedyNotes !== undefined && { comedyNotes }),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          ...(notificationEmail !== undefined && { notificationEmail }),
          ...(notificationPush !== undefined && { notificationPush }),
          ...(notificationTime !== undefined && { notificationTime: notificationTime || null }),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
