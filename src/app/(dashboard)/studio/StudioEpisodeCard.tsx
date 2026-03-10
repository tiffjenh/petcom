"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Share2, X } from "lucide-react";

type Episode = {
  id: string;
  title: string;
  synopsis: string;
  status: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  episodeNum: number;
};

type Props = {
  episode: Episode;
  primaryDogName: string | null;
  fallbackThumbUrl: string | null;
};

export function StudioEpisodeCard({ episode: ep, primaryDogName, fallbackThumbUrl }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  // STATE 1 — generating (script not ready yet)
  if (ep.status === "generating") {
    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted-foreground/10 to-muted" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="text-sm font-medium text-muted-foreground">✍️ Writing the script...</span>
            <span className="text-xs text-muted-foreground">
              Your pilot plot is being written based on {primaryDogName ?? "your dog"}&apos;s quirks
            </span>
          </div>
        </div>
        <CardHeader className="p-4">
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
        </CardHeader>
      </Card>
    );
  }

  // STATE 2 — scripted (script ready, video still rendering)
  if (ep.status === "scripted") {
    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-primary/5 to-muted" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl text-muted-foreground">🎬</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <span className="text-xs font-medium text-white/90">🎬 Filming in progress...</span>
          </div>
        </div>
        <CardHeader className="p-4">
          <CardTitle className="line-clamp-1 text-base">{ep.title}</CardTitle>
          <CardDescription className="line-clamp-3 text-sm">{ep.synopsis || `Episode ${ep.episodeNum}`}</CardDescription>
          <p className="mt-1 text-xs text-muted-foreground">Video ready in ~3 minutes</p>
        </CardHeader>
      </Card>
    );
  }

  // STATE 3 — ready (video done)
  console.log("videoUrl:", ep.videoUrl);
  const thumbUrl = ep.thumbnailUrl ?? fallbackThumbUrl;
  const hasVideo = Boolean(ep.videoUrl);

  return (
    <>
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-muted">
          {thumbUrl ? (
            <img src={thumbUrl} alt={ep.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground">🎬</div>
          )}
          {hasVideo && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100"
              aria-label="Watch"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Play className="h-6 w-6" />
              </span>
            </button>
          )}
        </div>
        <CardHeader className="p-4">
          <CardTitle className="line-clamp-1 text-base">{ep.title}</CardTitle>
          <CardDescription className="line-clamp-2 text-sm">{ep.synopsis || `Episode ${ep.episodeNum}`}</CardDescription>
          <div className="mt-2 flex gap-2">
            {hasVideo && (
              <Button size="sm" className="w-fit" onClick={() => setModalOpen(true)}>
                <Play className="mr-2 h-4 w-4" />
                Watch
              </Button>
            )}
            <Button size="sm" variant="outline" className="w-fit" asChild>
              <Link href={`/dashboard/episodes/${ep.id}`}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {modalOpen && ep.videoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Watch episode"
        >
          <div className="relative w-full max-w-sm">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute -top-10 right-0 flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="mb-2 text-center text-lg font-medium text-white">{ep.title}</p>
            <video
              src={ep.videoUrl}
              controls
              autoPlay
              playsInline
              className="max-w-sm w-full rounded-xl"
              onEnded={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
