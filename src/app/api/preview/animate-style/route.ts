import { NextResponse } from "next/server";

// PAID ONLY — Kling video is never used in the free demo (costs ~$1.68/run).
// Animation clips are only for paid users via /api/trailer/generate or /api/episodes/generate.
// Return empty clips so the style picker modal still works without breaking.
export async function POST() {
  return NextResponse.json({ clips: {} });
}
