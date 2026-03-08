import { NextResponse } from "next/server";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const member = await prisma.castMember.findFirst({
      where: { id, household: { userId: user.id } },
    });
    if (!member) return NextResponse.json({ message: "Not found" }, { status: 404 });
    await prisma.castMember.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed" }, { status: 500 });
  }
}
