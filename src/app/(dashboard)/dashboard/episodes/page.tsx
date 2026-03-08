import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Plus, Share2 } from "lucide-react";

export default async function EpisodesPage() {
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
  let episodes = household?.episodes ?? [];
  if (limits.episodeArchiveDays != null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - limits.episodeArchiveDays);
    episodes = episodes.filter((ep) => (ep.publishedAt ?? ep.createdAt) >= cutoff);
  }
  const hasCast = (household?.dogs.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Episodes</h1>
          <p className="text-muted-foreground">
            Your daily sitcom. Share to TikTok and Reels.
          </p>
        </div>
        {hasCast && (
          <Button asChild>
            <Link href="/dashboard/episodes/new">
              <Plus className="mr-2 h-4 w-4" />
              Generate episode
            </Link>
          </Button>
        )}
      </div>

      {!hasCast && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Set up your cast first</CardTitle>
            <CardDescription>
              Add your dog and optional cast in onboarding, then we’ll generate episodes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/onboarding">Go to onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasCast && episodes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Film className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 font-medium">No episodes yet</p>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Generate your first episode or wait for your daily drop.
            </p>
            <Button asChild>
              <Link href="/dashboard/episodes/new">Generate first episode</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasCast && episodes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((ep) => (
            <Card key={ep.id} className="animate-spring-in overflow-hidden transition-colors hover:bg-muted/50">
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
                      <Film className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </Link>
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="line-clamp-1 text-base">{ep.title}</CardTitle>
                    <CardDescription>
                      S{ep.season} E{ep.episodeNum} · {ep.publishedAt ? new Date(ep.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/episodes/${ep.id}`} aria-label="Share">
                      <Share2 className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
