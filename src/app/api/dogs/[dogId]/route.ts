import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";

const MAX_PHOTOS = 10;
const MAX_WARDROBE_ITEMS = 20;
const MAX_PHOTOS_PER_WARDROBE = 3;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ dogId: string }> }
) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { dogId } = await params;
    const dog = await prisma.dog.findFirst({
      where: { id: dogId, household: { userId: user.id } },
    });
    if (!dog) {
      return NextResponse.json({ message: "Dog not found" }, { status: 404 });
    }

    const body = await req.json();
    const { photoUrls, wardrobeItems } = body as {
      photoUrls?: string[];
      wardrobeItems?: { label: string; photoUrls: string[] }[];
    };

    const updates: { photoUrls?: string[]; photoUrl?: string; wardrobeItems?: object } = {};

    if (photoUrls !== undefined) {
      const arr = Array.isArray(photoUrls)
        ? photoUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0).slice(0, MAX_PHOTOS)
        : [];
      updates.photoUrls = arr;
      updates.photoUrl = arr[0] ?? dog.photoUrl;
    }

    if (wardrobeItems !== undefined) {
      const items = Array.isArray(wardrobeItems)
        ? wardrobeItems
            .slice(0, MAX_WARDROBE_ITEMS)
            .filter((i) => i && typeof i.label === "string" && i.label.trim())
            .map((i) => ({
              label: (i.label as string).trim(),
              photoUrls: (Array.isArray(i.photoUrls) ? i.photoUrls : [])
                .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
                .slice(0, MAX_PHOTOS_PER_WARDROBE),
            }))
        : [];
      updates.wardrobeItems = items as object;
    }

    await prisma.dog.update({
      where: { id: dogId },
      data: updates,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
