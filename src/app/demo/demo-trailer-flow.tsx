"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDemoUploadState,
  DemoUploadSlot,
} from "./demo-upload-preview";
import { HumorStylePicker, HUMOR_STYLE_OPTIONS } from "@/components/demo/HumorStylePicker";
import { cn } from "@/lib/utils";
import { Share2, Volume2, VolumeX } from "lucide-react";

const PERSONALITY_TRAITS = [
  { id: "chaotic", label: "🌪️ Chaotic" },
  { id: "dramatic", label: "🎭 Dramatic" },
  { id: "foodie", label: "🍖 Foodie" },
  { id: "lazy", label: "😴 Lazy" },
  { id: "anxious", label: "😬 Anxious" },
  { id: "stubborn", label: "🐂 Stubborn" },
  { id: "playful", label: "🎾 Playful" },
  { id: "cuddly", label: "🤗 Cuddly" },
  { id: "adventurous", label: "🏕️ Adventurous" },
  { id: "sassy", label: "💅 Sassy" },
  { id: "nosy", label: "👀 Nosy" },
  { id: "clingy", label: "🐾 Clingy" },
];

const MAX_TRAITS = 4;

type Phase = "form" | "trailer_loading" | "result" | "rate_limit";

export function DemoTrailerFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");
  const dogNameFromUrl = searchParams.get("dogName");

  const {
    photo1,
    photo2,
    photo3,
    photos,
    photoAccept,
    photoMaxMb,
  } = useDemoUploadState();

  const [dogName, setDogName] = useState("");
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [customDetail, setCustomDetail] = useState("");
  const [selectedHumorStyles, setSelectedHumorStyles] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("form");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    videoUrl: string;
    comedyStyle: string;
    dogName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [muted, setMuted] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const displayName = dogName.trim() || "your pup";
  const canSubmit =
    dogName.trim().length > 0 &&
    photos.length >= 1 &&
    selectedHumorStyles.length >= 1;

  const toggleTrait = (id: string) => {
    setSelectedTraits((prev) =>
      prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length >= MAX_TRAITS
          ? prev
          : [...prev, id]
    );
  };

  // Show error from URL when redirected after failed job
  useEffect(() => {
    const err = searchParams.get("error");
    if (err && phase === "form") {
      setError(decodeURIComponent(err));
    }
  }, [searchParams, phase]);

  // When landing with ?jobId=, poll and show result if completed
  useEffect(() => {
    if (!jobIdFromUrl || phase !== "form") return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/preview/status/${jobIdFromUrl}`);
        const data = await res.json();
        if (data.status === "completed" && data.videoUrl) {
          setResult({
            videoUrl: data.videoUrl,
            comedyStyle: data.comedyStyle ?? "Pixar-style",
            dogName: dogNameFromUrl || data.dogName || dogName || "Your dog",
          });
          setPhase("result");
        }
      } catch (_) {}
    };
    poll();
  }, [jobIdFromUrl, phase, dogName, dogNameFromUrl]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || photos.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("photo1", photos[0]);
      if (photos[1]) form.append("photo2", photos[1]);
      if (photos[2]) form.append("photo3", photos[2]);
      const uploadRes = await fetch("/api/preview/upload-photo", {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const { photoUrls } = await uploadRes.json();
      if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
        throw new Error("No photo URLs returned");
      }
      const humorLabels = selectedHumorStyles.map(
        (id) => HUMOR_STYLE_OPTIONS.find((h) => h.id === id)?.label ?? id
      );
      const startRes = await fetch("/api/preview/start-pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrls,
          dogName: dogName.trim(),
          personality: selectedTraits,
          characterBio: customDetail.trim() || undefined,
          humorStyleIds: selectedHumorStyles,
          humorStyleLabels: humorLabels,
        }),
      });
      if (startRes.status === 429) {
        setPhase("rate_limit");
        setError(
          "You've used your 2 free previews today! Come back tomorrow or create a free account."
        );
        setSubmitting(false);
        return;
      }
      if (!startRes.ok) {
        const data = await startRes.json().catch(() => ({}));
        throw new Error(data.error ?? data.message ?? "Failed to start pilot");
      }
      const data = await startRes.json();
      const newJobId = data.jobId;
      if (!newJobId) throw new Error("No job ID returned");
      setJobId(newJobId);
      setPhase("trailer_loading");
      router.push(`/demo/loading?jobId=${encodeURIComponent(newJobId)}&dogName=${encodeURIComponent(dogName.trim())}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, photos, dogName, selectedTraits, customDetail, selectedHumorStyles, router]);

  // —— Rate limit ——
  if (phase === "rate_limit") {
    return (
      <div className="space-y-6 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 p-6">
        <p className="text-center font-medium text-foreground">
          {error ?? "You've used your 2 free previews today! Come back tomorrow or create a free account for weekly episodes."}
        </p>
        <div className="flex justify-center">
          <Button asChild size="lg">
            <Link href="/sign-up">Create free account</Link>
          </Button>
        </div>
      </div>
    );
  }

  // —— Result (video) ——
  if (phase === "result" && result) {
    return (
      <div className="space-y-6">
        <h2 className="font-heading text-2xl font-bold">
          Starring {result.dogName}
        </h2>
        <div className="overflow-hidden rounded-xl border-2 border-border bg-black">
          <div className="relative aspect-video">
            <video
              src={result.videoUrl}
              autoPlay
              muted={muted}
              playsInline
              loop
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Inspired by {result.comedyStyle}
        </p>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({
                  title: `PawCast: Starring ${result.dogName}`,
                  text: `Watch my dog's trailer!`,
                  url: window.location.href,
                });
              }
            }}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-3 text-center text-sm font-medium">
            Want a new episode every week? Enter your email to save your show.
          </p>
          {emailSent ? (
            <p className="text-center text-sm text-green-600">Thanks! We&apos;ll be in touch.</p>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setEmailSent(true);
              }}
            >
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm">
                Save my show
              </Button>
            </form>
          )}
        </div>
        <p className="text-center">
          <button
            type="button"
            className="text-sm text-primary underline hover:no-underline"
            onClick={() => {
              setPhase("form");
              setResult(null);
              setJobId(null);
              setDogName("");
              setSelectedTraits([]);
              setCustomDetail("");
              setSelectedHumorStyles([]);
              photo1.clear();
              photo2.clear();
              photo3.clear();
              router.replace("/demo");
            }}
          >
            Generate another trailer
          </button>
        </p>
      </div>
    );
  }

  // —— Single scrolling form ——
  return (
    <div className="space-y-10">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        One form · One trailer
      </p>

      {/* 1. Photos */}
      <section className="space-y-3">
        <Label>Upload 3 photos of your dog</Label>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, HEIC, max {photoMaxMb}MB each. At least one required.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DemoUploadSlot
            label="Photo 1"
            accept={photoAccept}
            maxMb={photoMaxMb}
            value={photo1.slot}
            onChange={photo1.handleChange}
            onClear={photo1.clear}
            onDrop={photo1.handleDrop}
            onDragOver={photo1.handleDragOver}
            onImageLoad={photo1.onImageLoad}
            isConverting={photo1.isConverting}
            inputId={photo1.id}
          />
          <DemoUploadSlot
            label="Photo 2"
            accept={photoAccept}
            maxMb={photoMaxMb}
            value={photo2.slot}
            onChange={photo2.handleChange}
            onClear={photo2.clear}
            onDrop={photo2.handleDrop}
            onDragOver={photo2.handleDragOver}
            onImageLoad={photo2.onImageLoad}
            isConverting={photo2.isConverting}
            inputId={photo2.id}
          />
          <DemoUploadSlot
            label="Photo 3"
            accept={photoAccept}
            maxMb={photoMaxMb}
            value={photo3.slot}
            onChange={photo3.handleChange}
            onClear={photo3.clear}
            onDrop={photo3.handleDrop}
            onDragOver={photo3.handleDragOver}
            onImageLoad={photo3.onImageLoad}
            isConverting={photo3.isConverting}
            inputId={photo3.id}
          />
        </div>
      </section>

      {/* 2. Dog's name */}
      <section className="space-y-2">
        <Label htmlFor="demo-dog-name">Dog&apos;s name</Label>
        <Input
          id="demo-dog-name"
          value={dogName}
          onChange={(e) => setDogName(e.target.value)}
          placeholder="e.g. Biscuit"
          className="max-w-xs"
        />
      </section>

      {/* 3. Personality */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <Label>What&apos;s {displayName}&apos;s vibe?</Label>
          <span className="text-xs text-muted-foreground">
            {selectedTraits.length}/{MAX_TRAITS} selected
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Pick up to 4 — these shape the script.</p>
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TRAITS.map((trait) => {
            const active = selectedTraits.includes(trait.id);
            const disabled = !active && selectedTraits.length >= MAX_TRAITS;
            return (
              <button
                key={trait.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleTrait(trait.id)}
                className={cn(
                  "rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "border-amber-600 bg-amber-300 text-amber-900 shadow-sm ring-2 ring-amber-500/50 ring-offset-2 dark:border-amber-500 dark:bg-amber-600 dark:text-amber-50 dark:ring-amber-400/50"
                    : "border-border bg-background text-muted-foreground hover:border-amber-400 hover:text-foreground",
                  disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer"
                )}
              >
                {trait.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Anything else */}
      <section className="space-y-2">
        <Label htmlFor="demo-custom-detail">Anything else we should know?</Label>
        <p className="text-xs text-muted-foreground">
          Obsessions, quirks, habits — the weirder the better. Optional.
        </p>
        <textarea
          id="demo-custom-detail"
          rows={3}
          value={customDetail}
          onChange={(e) => setCustomDetail(e.target.value)}
          placeholder={`e.g. "${displayName} steals socks and hides them under the bed. Convinced the vacuum is evil."`}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </section>

      {/* 5. Humor style */}
      <section className="space-y-3">
        <Label>What&apos;s {displayName}&apos;s show like?</Label>
        <HumorStylePicker
          selectedIds={selectedHumorStyles}
          maxPicks={2}
          onSelectionChange={setSelectedHumorStyles}
        />
      </section>

      {error && (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        size="lg"
        className="w-full text-lg"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Starting…" : "Start Filming! 🎬"}
      </Button>
    </div>
  );
}
