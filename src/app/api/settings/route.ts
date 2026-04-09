import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plans";
import { inngest } from "@/inngest/client";

export async function PATCH(req: Request) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      showTitle,
      showStyle,
      comedyNotes,
      notificationEmail,
      notificationPush,
      notificationTime,
      locationPhotos,
      castMembers,
    } = body as {
      showTitle?: string;
      showStyle?: string[];
      comedyNotes?: string;
      notificationEmail?: boolean;
      notificationPush?: boolean;
      notificationTime?: string;
      locationPhotos?: Record<string, string[]>;
      castMembers?: Record<string, { name: string; photoUrls: string[] }>;
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

    const householdData: {
      showTitle?: string;
      showStyle?: string[];
      comedyNotes?: string;
      locationPhotos?: object;
    } = {
      ...(showTitle !== undefined && { showTitle }),
      ...(trimmedStyle !== undefined && { showStyle: trimmedStyle }),
      ...(comedyNotes !== undefined && { comedyNotes }),
    };
    if (locationPhotos !== undefined && typeof locationPhotos === "object") {
      const keys = ["living_room", "backyard", "kitchen", "bedroom", "favorite_spot"] as const;
      const sanitized: Record<string, string[]> = {};
      for (const k of keys) {
        const v = locationPhotos[k];
        if (Array.isArray(v)) {
          sanitized[k] = v.filter((u): u is string => typeof u === "string" && u.trim()).slice(0, 3);
        }
      }
      householdData.locationPhotos = sanitized;
    }
    await prisma.household.update({
      where: { id: household.id },
      data: householdData,
    });

    if (castMembers !== undefined && typeof castMembers === "object") {
      const roles = ["owner_1", "owner_2", "pet_2", "pet_3"] as const;
      for (const role of roles) {
        try {
          const entry = castMembers[role];
          if (!entry || typeof entry !== "object") continue;
        const name = typeof entry.name === "string" ? entry.name.trim() : "";
        const photoUrls = Array.isArray(entry.photoUrls)
          ? entry.photoUrls.filter((u): u is string => typeof u === "string" && u.trim()).slice(0, 3)
          : [];
        const primaryPhoto = photoUrls[0] ?? "";
        const existing = await prisma.castMember.findFirst({
          where: { householdId: household.id, role },
        });
        if (existing) {
          if (!name && photoUrls.length === 0) {
            await prisma.castMember.delete({ where: { id: existing.id } });
          } else {
            await prisma.castMember.update({
              where: { id: existing.id },
              data: {
                name: name || existing.name,
                photoUrls,
                photoUrl: primaryPhoto || null,
                avatarStatus: photoUrls.length > 0 ? "pending" : null,
              },
            });
          }
        } else if (name || photoUrls.length > 0) {
          await prisma.castMember.create({
            data: {
              householdId: household.id,
              role,
              name: name || role.replace("_", " "),
              photoUrl: primaryPhoto || null,
              photoUrls,
              avatarStatus: photoUrls.length > 0 ? "pending" : null,
            },
          });
        }
        } catch (castErr) {
          console.error("[settings] cast save failed for role", role, castErr);
          throw castErr;
        }
      }
    }

    // Fire background jobs to generate Pixar avatars for cast members that have photos
    if (castMembers !== undefined && typeof castMembers === "object") {
      const membersWithPhotos = await prisma.castMember.findMany({
        where: { householdId: household.id, photoUrls: { isEmpty: false } },
      });
      for (const member of membersWithPhotos) {
        await inngest.send({
          name: "cast/avatar-generate",
          data: {
            castMemberId: member.id,
            photoUrls: member.photoUrls,
            name: member.name,
            role: member.role,
            householdId: household.id,
          },
        });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(notificationEmail !== undefined && { notificationEmail }),
        ...(notificationPush !== undefined && { notificationPush }),
        ...(notificationTime !== undefined && { notificationTime: notificationTime || null }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[settings] PATCH error", e);
    if (e instanceof Error && e.stack) console.error(e.stack);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
