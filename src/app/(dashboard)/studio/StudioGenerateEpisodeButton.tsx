"use client";

import dynamic from "next/dynamic";

const GenerateEpisodeButton = dynamic(
  () =>
    import("@/app/(dashboard)/dashboard/episodes/new/generate-button").then(
      (mod) => mod.GenerateEpisodeButton
    ),
  { ssr: false }
);

export function StudioGenerateEpisodeButton({
  householdId,
  episodeNum,
  season,
}: {
  householdId: string;
  episodeNum: number;
  season: number;
}) {
  return (
    <GenerateEpisodeButton
      householdId={householdId}
      episodeNum={episodeNum}
      season={season}
    />
  );
}
