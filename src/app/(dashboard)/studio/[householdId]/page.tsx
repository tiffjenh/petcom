import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudioEpisodeCard } from "../StudioEpisodeCard";

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

  const primaryDog = household.dogs[0];
  const starImageUrl = primaryDog
    ? (primaryDog.animatedAvatar ?? primaryDog.photoUrl)
    : null;

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
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
              {starImageUrl ? (
                <img
                  src={starImageUrl}
                  alt={primaryDog.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground">
                  🐕
                </div>
              )}
            </div>
            {primaryDog.characterBio && (
              <p className="max-w-xl text-sm text-muted-foreground">
                {primaryDog.characterBio}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Episodes */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Episodes</h2>
        {household.episodes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No episodes yet.</p>
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
