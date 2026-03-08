import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Play, Plus, Share2 } from "lucide-react";

export default async function DashboardHomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      subscription: true,
      household: {
        include: {
          episodes: { orderBy: { createdAt: "desc" } },
          dogs: true,
        },
      },
    },
  });

  if (!dbUser) redirect("/sign-in");
  const household = dbUser.household;
  const limits = getPlanLimits(dbUser.subscription?.plan);
  const hasCast = (household?.dogs.length ?? 0) > 0;
  let episodes = household?.episodes ?? [];
  if (limits.episodeArchiveDays != null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - limits.episodeArchiveDays);
    episodes = episodes.filter((ep) => (ep.publishedAt ?? ep.createdAt) >= cutoff);
  }
  const latestEpisode = episodes[0];
  const archive = episodes.slice(1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Home</h1>
        <p className="text-muted-foreground">
          {household?.showTitle ?? "Your show"} · A new episode every day.
        </p>
      </div>

      {!hasCast && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Set up your cast</CardTitle>
            <CardDescription>
              Add your dog and optional household members so we can generate your first episode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/onboarding">
                <Plus className="mr-2 h-4 w-4" />
                Get started
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasCast && (
        <>
          {/* Today's Episode / Latest */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">Today&apos;s Episode</h2>
            {latestEpisode ? (
              <Card className="overflow-hidden">
                <Link href={`/dashboard/episodes/${latestEpisode.id}`}>
                  <div className="relative aspect-video bg-muted">
                    {latestEpisode.thumbnailUrl ? (
                      <img
                        src={latestEpisode.thumbnailUrl}
                        alt={latestEpisode.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Film className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="rounded-full bg-primary p-4 text-primary-foreground shadow-lg">
                        <Play className="h-8 w-8 fill-current" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
                      {latestEpisode.status === "ready"
                        ? "Ready to Watch"
                        : latestEpisode.status === "generating"
                          ? "Generating…"
                          : "Coming Soon"}
                    </div>
                  </div>
                </Link>
                <CardHeader>
                  <CardTitle>{latestEpisode.title}</CardTitle>
                  <CardDescription>
                    S{latestEpisode.season} E{latestEpisode.episodeNum}
                  </CardDescription>
                  <div className="flex gap-2 pt-2">
                    <Button asChild size="sm">
                      <Link href={`/dashboard/episodes/${latestEpisode.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Watch
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/episodes/${latestEpisode.id}`}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Film className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-2 font-medium">No episode yet</p>
                  <p className="mb-4 text-center text-sm text-muted-foreground">
                    Generate your first episode or wait for your daily drop.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/episodes/new">Generate first episode</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Episode Archive */}
          {archive.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Episode Archive</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archive.map((ep) => (
                  <Card key={ep.id} className="overflow-hidden transition-colors hover:bg-muted/50">
                    <Link href={`/dashboard/episodes/${ep.id}`}>
                      <div className="aspect-video bg-muted">
                        {ep.thumbnailUrl ? (
                          <img
                            src={ep.thumbnailUrl}
                            alt={ep.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Film className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <CardHeader className="p-4">
                      <CardTitle className="line-clamp-1 text-base">{ep.title}</CardTitle>
                      <CardDescription>
                        S{ep.season} E{ep.episodeNum}
                        {ep.publishedAt && (
                          <> · {new Date(ep.publishedAt).toLocaleDateString()}</>
                        )}
                      </CardDescription>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/episodes/${ep.id}`}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </Link>
                      </Button>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
