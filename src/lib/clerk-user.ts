import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getOrCreateDbUser() {
  const { userId, ...clerkUser } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    const email =
      (clerkUser.sessionClaims?.email as string | undefined) ||
      `${userId}@clerk.placeholder`;
    const name = [
      clerkUser.sessionClaims?.firstName,
      clerkUser.sessionClaims?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || undefined;
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email,
        name,
      },
    });
  }

  return user;
}

/**
 * Ensure the user has a Subscription record (for subscription gating on dashboard).
 * Creates a free subscription if none exists. Call from dashboard layout.
 */
export async function getOrCreateSubscription(userId: string) {
  return prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: "free",
      status: "active",
    },
    update: {},
  });
}
