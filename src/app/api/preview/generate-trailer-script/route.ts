import { NextResponse } from "next/server";
import { generateTrailerScript } from "@/lib/ai/trailer-script";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      dogName,
      petPersonality,
      selectedTraits,
      selectedObsessions,
      customDetail,
      artStyle,
      selectedShows,
    } = body;

    const name = typeof dogName === "string" ? dogName.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "dogName is required" },
        { status: 400 }
      );
    }

    const trailerScript = await generateTrailerScript({
      dogName: name,
      petPersonality: typeof petPersonality === "string" ? petPersonality : "",
      selectedTraits: Array.isArray(selectedTraits) ? selectedTraits : [],
      selectedObsessions: Array.isArray(selectedObsessions)
        ? selectedObsessions
        : [],
      customDetail: typeof customDetail === "string" ? customDetail : "",
      artStyle:
        artStyle === "cinematicCG" ? "cinematicCG" : "liveAction",
      selectedShows: Array.isArray(selectedShows) ? selectedShows : [],
    });

    return NextResponse.json({ trailerScript });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("generate-trailer-script error:", err.message, err.stack);
    return NextResponse.json(
      {
        error: err.message || "Trailer script generation failed",
      },
      { status: 500 }
    );
  }
}
