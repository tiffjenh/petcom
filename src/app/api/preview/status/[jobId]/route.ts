import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const row = await prisma.previewGeneration.findUnique({
    where: { jobId },
    select: {
      status: true,
      trailerUrl: true,
      comedyStyle: true,
      avatarUrl: true,
      errorMessage: true,
      dogName: true,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({
    status: row.status,
    videoUrl: row.trailerUrl ?? undefined,
    comedyStyle: row.comedyStyle ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    error: row.errorMessage ?? undefined,
    dogName: row.dogName ?? undefined,
  });
}
