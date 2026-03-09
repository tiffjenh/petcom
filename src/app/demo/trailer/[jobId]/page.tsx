"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PawCastLogo } from "@/components/shared/PawCastLogo";
import { Volume2, VolumeX } from "lucide-react";

const LOADING_STEPS = [
  "Studying your pup's best angles...",
  "Painting them in animated style...",
  "Writing today's adventure...",
  "Assembling your trailer...",
];

export default function DemoTrailerPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [comedyStyle, setComedyStyle] = useState<string>("");
  const [dogName, setDogName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    params.then((p) => setJobId(p.jobId));
  }, [params]);

  useEffect(() => {
    if (!jobId) return;
    const stepsInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 15000);
    const poll = async () => {
      try {
        const res = await fetch(`/api/preview/status/${jobId}`);
        const data = await res.json();
        if (data.status === "completed" && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setComedyStyle(data.comedyStyle ?? "");
          setDogName(data.dogName ?? "");
          setStatus("ready");
          return;
        }
        if (data.status === "failed") {
          setError(data.error ?? "Generation failed");
          setStatus("failed");
          return;
        }
      } catch (_) {}
    };
    const interval = setInterval(poll, 3000);
    poll();
    return () => {
      clearInterval(interval);
      clearInterval(stepsInterval);
    };
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="font-heading">
              <PawCastLogo size={36} showWordmark />
            </Link>
            <Button asChild variant="ghost">
              <Link href="/demo">Back to demo</Link>
            </Button>
          </div>
        </header>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="font-heading">
              <PawCastLogo size={36} showWordmark />
            </Link>
            <Button asChild variant="ghost">
              <Link href="/demo">Back to demo</Link>
            </Button>
          </div>
        </header>
        <div className="px-4 py-12">
        <div className="mx-auto max-w-lg space-y-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <h1 className="font-heading text-xl font-bold text-destructive">
            Trailer couldn’t be created
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild>
            <Link href="/demo">Back to demo</Link>
          </Button>
        </div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="font-heading">
              <PawCastLogo size={36} showWordmark />
            </Link>
            <Button asChild variant="ghost">
              <Link href="/demo">Back to demo</Link>
            </Button>
          </div>
        </header>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 animate-bounce">
          <span className="text-5xl" aria-hidden>🐾</span>
        </div>
        <p className="text-center text-lg font-medium">Creating your trailer</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {LOADING_STEPS.map((step, i) => (
            <li
              key={step}
              className={i <= loadingStep ? "opacity-100" : "opacity-50"}
            >
              {step}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">~60 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-heading">
            <PawCastLogo size={36} showWordmark />
          </Link>
          <Button asChild variant="ghost">
            <Link href="/demo">Back to demo</Link>
          </Button>
        </div>
      </header>
      <div className="px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold">
            Starring {dogName || "your dog"}
          </h1>
          <Button asChild variant="ghost" size="sm">
            <Link href="/demo">Create another</Link>
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border-2 border-border bg-black">
          <div className="relative aspect-video">
            {videoUrl && (
              <>
                <video
                  src={videoUrl}
                  autoPlay
                  muted={muted}
                  playsInline
                  loop
                  className="h-full w-full object-contain"
                  controls
                />
                <button
                  type="button"
                  className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
        {comedyStyle && (
          <p className="text-center text-sm text-muted-foreground">
            Inspired by {comedyStyle}
          </p>
        )}
        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/demo">Back to demo</Link>
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
