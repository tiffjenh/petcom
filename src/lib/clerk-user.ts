import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

function isDbConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("Connection refused") ||
    msg.includes("getaddrinfo") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("P1001")
  );
}

export async function getOrCreateDbUser() {
  const { userId, ...clerkUser } = await auth();
  if (!userId) return null;

  try {
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
  } catch (err) {
    if (isDbConnectionError(err)) return null;
    throw err;
  }
}

/**
 * Ensure the user has a Subscription record (for subscription gating on dashboard).
 * Creates a free subscription if none exists. Call from dashboard layout.
 * Returns null if the database is unreachable.
 */
export async function getOrCreateSubscription(userId: string) {
  try {
    return await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: "free",
        status: "active",
      },
      update: {},
    });
  } catch (err) {
    if (isDbConnectionError(err)) return null;
    throw err;
  }
}
