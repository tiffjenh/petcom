import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Film, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { EpisodePlayer } from "@/components/dashboard/EpisodePlayer";
import { EpisodeShare } from "./episode-share";
import { EpisodeReactions } from "./episode-reactions";
import { EpisodeReadyConfetti } from "@/components/shared/EpisodeReadyConfetti";
import { RegenerateEpisodeButton } from "./regenerate-button";

function formatStructuredScript(script: Record<string, unknown>): string {
  const title = script.episodeTitle as string | undefined;
  const synopsis = script.synopsis as string | undefined;
  const scenes = (script.scenes as Array<Record<string, unknown>>) ?? [];
  const lines: string[] = [];
  if (title) lines.push(title);
  if (synopsis) lines.push("\n" + synopsis);
  for (const s of scenes) {
    lines.push(`\n--- Scene ${s.sceneNumber}: ${s.setting} (${s.type}) ---`);
    if (s.action) lines.push(String(s.action));
    const dialogue = (s.dialogue as Array<{ character: string; line: string; isThoughtBubble?: boolean }>) ?? [];
    for (const d of dialogue) {
      lines.push(d.isThoughtBubble ? `[Thought: ${d.character}] ${d.line}` : `${d.character}: ${d.line}`);
    }
  }
  return lines.join("\n");
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;

  const episode = await prisma.episode.findFirst({
    where: {
      id,
      household: { userId: user.id },
    },
    include: {
      household: {
        select: {
          showTitle: true,
          dogs: { take: 1, orderBy: { createdAt: "asc" }, select: { name: true } },
          user: {
            select: {
              subscription: { select: { plan: true } },
            },
          },
        },
      },
    },
  });

  if (!episode) notFound();
  const showTitle = episode.household?.showTitle ?? "My Show";
  const dogName = episode.household?.dogs?.[0]?.name ?? "my dog";

  const householdId = episode.householdId;
  const allEpisodes = await prisma.episode.findMany({
    where: { householdId },
    orderBy: [{ season: "asc" }, { episodeNum: "asc" }],
  });
  const idx = allEpisodes.findIndex((e) => e.id === id);
  const prevEpisode = idx > 0 ? allEpisodes[idx - 1] : null;
  const nextEpisode = idx >= 0 && idx < allEpisodes.length - 1 ? allEpisodes[idx + 1] : null;

  const scriptObj = episode.script as Record<string, unknown> | null;
  const hasStructuredScript =
    scriptObj &&
    typeof scriptObj === "object" &&
    "scenes" in scriptObj &&
    Array.isArray(scriptObj.scenes);
  const scriptDisplay = hasStructuredScript
    ? formatStructuredScript(scriptObj)
    : scriptObj && "text" in scriptObj
      ? String(scriptObj.text)
      : typeof episode.script === "string"
        ? episode.script
        : JSON.stringify(episode.script, null, 2);

  return (
    <div className="space-y-6">
      <EpisodeReadyConfetti episodeId={episode.id} status={episode.status} />
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/episodes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to episodes
        </Link>
      </Button>

      {/* Custom video player: progress, play/pause, volume, fullscreen, thought bubbles, chapters */}
      {episode.status === "ready" && episode.videoUrl ? (
        <EpisodePlayer
          src={episode.videoUrl}
          poster={episode.thumbnailUrl}
          script={hasStructuredScript ? (scriptObj as Parameters<typeof EpisodePlayer>[0]["script"]) : null}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border-2 border-border bg-black shadow-lg">
          <div className="aspect-video flex flex-col items-center justify-center gap-4 px-4 text-white">
            {episode.status === "generating" ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-center font-medium">Creating your sample video</p>
                <p className="text-center text-sm text-white/80">
                  We're turning your dog into the star of a ~5 min episode. We'll notify you when it's ready — usually a few minutes.
                </p>
              </>
            ) : episode.status === "failed" ? (
              <>
                <Film className="h-12 w-12 text-muted-foreground" />
                <p className="text-center font-medium">Something went wrong</p>
                <p className="text-center text-sm text-white/80">
                  We couldn't finish this episode. You can try again below.
                </p>
                <div className="mt-2">
                  <RegenerateEpisodeButton episodeId={episode.id} />
                </div>
              </>
            ) : (
              <>
                <Film className="h-12 w-12 text-muted-foreground" />
                <p className="text-center">Pending.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>{episode.title}</CardTitle>
          <CardDescription>
            S{episode.season} E{episode.episodeNum}
          </CardDescription>
        </CardHeader>
        {episode.synopsis && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{episode.synopsis}</p>
          </CardContent>
        )}
      </Card>

      {/* Share Bar */}
      {episode.status === "ready" && episode.videoUrl && (
        <EpisodeShare
          episodeId={episode.id}
          title={episode.title}
          videoUrl={episode.videoUrl}
          showTitle={showTitle}
          dogName={dogName}
          canShare
          showWatermarkToggle={episode.household?.user?.subscription?.plan === "pro" || episode.household?.user?.subscription?.plan === "family"}
        />
      )}

      {/* Next / Previous Episode */}
      <div className="flex items-center justify-between gap-4">
        {prevEpisode ? (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/episodes/${prevEpisode.id}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous episode
            </Link>
          </Button>
        ) : (
          <div />
        )}
        {nextEpisode ? (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/episodes/${nextEpisode.id}`}>
              Next episode
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>

      {/* Reactions */}
      {episode.status === "ready" && (
        <EpisodeReactions episodeId={episode.id} />
      )}

      {scriptDisplay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Script</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded bg-muted p-4 text-sm">
              {scriptDisplay}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
