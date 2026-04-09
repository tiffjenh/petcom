import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudioEpisodeCard } from "../StudioEpisodeCard";
import { StudioGenerateEpisodeButton } from "../StudioGenerateEpisodeButton";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ householdId: string }>;
}) {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const { householdId } = await params;
  const household = await prisma.household.findFirst({
    where: { id: householdId, userId: user.id },
    include: {
      dogs: true,
      episodes: { orderBy: { episodeNum: "desc" } },
    },
  });

  if (!household) redirect("/dashboard");

  const lastEpisode = await prisma.episode.findFirst({
    where: { householdId: household.id },
    orderBy: { episodeNum: "desc" },
  });
  const nextEpisodeNum = (lastEpisode?.episodeNum ?? 0) + 1;
  const nextSeason = lastEpisode?.season ?? 1;

  const primaryDog = household.dogs[0];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold">Studio</h1>
        <p className="text-muted-foreground">{household.showTitle}</p>
      </div>

      {/* Star profile card */}
      {primaryDog && (
        <Card>
          <CardHeader>
            <CardTitle>Your Star</CardTitle>
            <CardDescription>
              {primaryDog.name}
              {primaryDog.breed ? ` · ${primaryDog.breed}` : ""}
              {" · "}
              {household.showTitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div className="relative h-[200px] w-[200px] shrink-0 overflow-hidden rounded-2xl border-2 border-primary/30 bg-muted">
              {primaryDog.animatedAvatar ? (
                <>
                  <img
                    src={primaryDog.animatedAvatar}
                    alt={primaryDog.name}
                    className="h-full w-full object-cover"
                  />
                  <p className="absolute bottom-0 left-0 right-0 bg-black/60 py-1.5 text-center text-xs text-white">
                    ✨ Animated by PetCom
                  </p>
                </>
              ) : (
                <>
                  <img
                    src={primaryDog.photoUrl}
                    alt={primaryDog.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                    <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-white" />
                    <p className="mt-2 text-center text-sm font-medium">
                      🎨 Creating your Pixar avatar…
                    </p>
                  </div>
                </>
              )}
            </div>
            {primaryDog.characterBio && (
              <p className="max-w-xl text-sm text-muted-foreground">
                &ldquo;{primaryDog.characterBio}&rdquo;
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Episodes */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Episodes</h2>
          <StudioGenerateEpisodeButton
            householdId={household.id}
            episodeNum={nextEpisodeNum}
            season={nextSeason}
          />
        </div>
        {household.episodes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No episodes yet. Generate your first episode above.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {household.episodes.map((ep) => (
              <StudioEpisodeCard
                key={ep.id}
                episode={{
                  id: ep.id,
                  title: ep.title,
                  synopsis: ep.synopsis,
                  status: ep.status,
                  thumbnailUrl: ep.thumbnailUrl,
                  videoUrl: ep.videoUrl,
                  episodeNum: ep.episodeNum,
                }}
                primaryDogName={primaryDog?.name ?? null}
                fallbackThumbUrl={primaryDog?.animatedAvatar ?? primaryDog?.photoUrl ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
