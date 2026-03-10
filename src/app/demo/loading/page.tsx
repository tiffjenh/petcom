"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PILOT_MESSAGES = (
  dogName: string
): string[] => [
  `🎭 Getting ${dogName || "your pup"} into costume...`,
  "📋 Writing the pilot script...",
  "🎬 Setting up the cameras...",
  `🐾 Teaching ${dogName || "your pup"} their lines...`,
  "✨ Adding the finishing touches...",
  "🎵 Recording the theme song...",
  "🌟 Almost showtime...",
];

const DEMO_COLORS = {
  deepPlum: "#2D1B1E",
  dustyRose: "#9B8B8E",
} as const;

const POLL_INTERVAL_MS = 3000;
const TOTAL_DURATION = 240; // 4 minutes in seconds (progress 0 → 95%)

const PROGRESS_GRADIENT =
  "linear-gradient(to right, #FF6B8A, #C850C0, #4158D0, #0093E9, #80D0C7, #FFEB3B)";

function getTimeLabel(seconds: number): string {
  if (seconds < 30) return "About 4 minutes remaining";
  if (seconds < 60) return "About 3 minutes remaining";
  if (seconds < 120) return "About 2 minutes remaining";
  if (seconds < 180) return "About 1 minute remaining";
  return "Almost ready...";
}

export default function DemoLoadingPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const dogName = searchParams.get("dogName") ?? "";
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const messages = PILOT_MESSAGES(dogName);
  const rotatingMessage = messages[messageIndex % messages.length];
  const progress = Math.min(95, (elapsed / TOTAL_DURATION) * 100);
  const timeLabel = getTimeLabel(elapsed);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 120000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => i + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/preview/status/${jobId}`);
        const data = await res.json();
        if (data.status === "completed" && data.videoUrl) {
          const q = new URLSearchParams({ jobId });
          if (dogName) q.set("dogName", dogName);
          window.location.href = `/demo?${q.toString()}`;
          return;
        }
        if (data.status === "failed") {
          window.location.href = `/demo?error=${encodeURIComponent(data.error ?? "Generation failed")}`;
          return;
        }
      } catch (_) {}
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">Missing job. Start from the demo.</p>
        <Button asChild>
          <Link href="/demo">Back to demo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 px-4"
      style={{ backgroundColor: DEMO_COLORS.deepPlum }}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 animate-bounce">
        <span className="text-5xl" aria-hidden>
          🐕
        </span>
      </div>
      <p
        className="text-center text-lg font-medium text-white"
        style={{ fontFamily: "Fredoka One, sans-serif" }}
      >
        Greenlit! Your pilot episode is in production...
      </p>
      <p
        className="min-h-[1.5rem] text-center text-sm text-amber-200"
        key={messageIndex}
      >
        {rotatingMessage}
      </p>

      {/* Rainbow gradient progress bar */}
      <div className="flex w-full max-w-[320px] flex-col items-center gap-2">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: PROGRESS_GRADIENT,
            }}
          />
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          ⏱ {timeLabel}
        </p>
      </div>

      {timedOut && (
        <div className="mt-4 max-w-sm rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center text-sm text-foreground">
          <p className="font-medium">Taking longer than usual?</p>
          <p className="mt-1 text-muted-foreground">
            Your pilot episode may still be generating. Make sure the Inngest dev server is running (see docs). You can go back and try again.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/demo">Back to demo</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
