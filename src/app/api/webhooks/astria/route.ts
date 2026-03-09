import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Astria calls this when a tune finishes training. Query: dogId=... */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const dogId = url.searchParams.get("dogId");
    if (!dogId) {
      return NextResponse.json({ error: "Missing dogId" }, { status: 400 });
    }
    const body = await req.json();
    const tuneId = body?.id ?? body?.tune_id;
    if (tuneId == null) {
      return NextResponse.json({ error: "Missing tune id in body" }, { status: 400 });
    }
    await prisma.dog.update({
      where: { id: dogId },
      data: { loraId: String(tuneId) },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Astria webhook]", e);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
