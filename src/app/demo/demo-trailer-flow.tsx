"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useDemoUploadState,
  DemoUploadSlot,
} from "./demo-upload-preview";
import {
  DemoStyleGrid,
  useRotatingMessage,
} from "./demo-art-styles";
import { StepComedyStyle } from "@/components/onboarding/StepComedyStyle";
import { cn } from "@/lib/utils";
import { Share2, Volume2, VolumeX } from "lucide-react";
import { ART_STYLES, type ArtStyleKey } from "@/lib/art-styles";

const VALID_STYLE_KEYS = new Set(ART_STYLES.map((s) => s.key));

const LOADING_STEPS = [
  "📸 Studying your pup's best angles...",
  "🎨 Painting them in animated style...",
  "✍️ Writing today's adventure...",
  "🎬 Assembling your trailer...",
];

const TRAILER_LOADING_STEPS = (
  selectedStyleName: string,
  comedyLabel: string
) => [
  `🎨 Setting up the ${selectedStyleName} world...`,
  `✍️ Writing ${comedyLabel}...`,
  "🎙️ Recording the narrator voiceover...",
  "🎬 Editing the final trailer...",
];

const STYLE_LOADING_MESSAGES = [
  "Trying the watercolor brush...",
  "Adding some anime sparkles...",
  "Rendering in 3D...",
  "Inking the comic...",
  "Opening the storybook...",
  "Pixelating...",
  "Setting up the shot...",
];

const STYLE_PROGRESS_MESSAGES: Record<string, string> = {
  liveAction: "📸 Developing the photo-real version...",
  cinematicCG: "🎬 Rendering the 3D cinematic look...",
  anime: "⚡ Adding anime sparkles...",
  watercolor: "🎨 Applying watercolor washes...",
  comicBook: "💬 Inking the comic book panels...",
  storybook: "📖 Illustrating the storybook pages...",
  pixelArt: "👾 Placing the pixels one by one...",
};

type Phase =
  | "upload"
  | "styles_loading"
  | "style_picker"
  | "comedy_picker"
  | "trailer_loading"
  | "result"
  | "rate_limit";

const DEMO_COLORS = {
  deepPlum: "#2D1B1E",
  warmCream: "#FDDEA0",
  dustyRose: "#9B8B8E",
  coralOrange: "#F26744",
  softLavender: "#B8A4E3",
} as const;

const DEMO_STORAGE_KEY = "pawcast-demo-flow";

type StyleImageMap = Partial<Record<ArtStyleKey, string>>;

type SavedDemoState = {
  phase: Phase;
  dogName: string;
  styleImages: StyleImageMap;
  selectedArtStyle: { key: string; name: string; description: string } | null;
  comedyNames: string[];
  jobId: string | null;
};

export function DemoTrailerFlow() {
  const router = useRouter();
  const {
    photo1,
    photo2,
    photo3,
    video,
    photos,
    photoAccept,
    photoMaxMb,
    videoAccept,
    videoMaxMb,
  } = useDemoUploadState();

  const [dogName, setDogName] = useState("");
  const [phase, setPhase] = useState<Phase>("upload");
  const [styleImages, setStyleImages] = useState<StyleImageMap>({});
  const [styleFailed, setStyleFailed] = useState<Record<string, boolean>>({});
  const [stylesProgress, setStylesProgress] = useState(0);
  const [selectedArtStyle, setSelectedArtStyle] = useState<{
    key: ArtStyleKey;
    name: string;
    description: string;
  } | null>(null);
  const [comedyNames, setComedyNames] = useState<string[]>([]);

  const [jobId, setJobId] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<{
    videoUrl: string;
    comedyStyle: string;
    dogName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [showUnfinishedBanner, setShowUnfinishedBanner] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const savedStateRef = useRef<SavedDemoState | null>(null);
  const styleLoadStartRef = useRef<number>(0);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(DEMO_STORAGE_KEY) : null;
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedDemoState;
      if (saved?.phase && saved.phase !== "upload") {
        savedStateRef.current = saved;
        setShowUnfinishedBanner(true);
      }
    } catch (_) {}
  }, []);

  const persistDemoState = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const payload: SavedDemoState = {
        phase,
        dogName,
        styleImages,
        selectedArtStyle: selectedArtStyle
          ? { key: selectedArtStyle.key, name: selectedArtStyle.name, description: selectedArtStyle.description }
          : null,
        comedyNames,
        jobId,
      };
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }, [phase, dogName, styleImages, selectedArtStyle, comedyNames, jobId]);

  useEffect(() => {
    if (phase === "upload" && !showUnfinishedBanner) return;
    if (phase === "result") {
      try {
        sessionStorage.removeItem(DEMO_STORAGE_KEY);
      } catch (_) {}
      return;
    }
    persistDemoState();
  }, [phase, persistDemoState, showUnfinishedBanner]);

  const canGenerateStyles = photos.length >= 1 && dogName.trim().length > 0;
  const stylesLoading = phase === "styles_loading";
  const stylesLocked = phase === "upload" && Object.keys(styleImages).length === 0;
  const rotatingMessage = useRotatingMessage(STYLE_LOADING_MESSAGES, 4000);

  useEffect(() => {
    if (phase !== "styles_loading") return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - styleLoadStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleContinueUnfinished = () => {
    const saved = savedStateRef.current;
    if (!saved) return;
    setDogName(saved.dogName);
    // Only keep styleImages for keys that still exist (avoid stale removed styles)
    const filteredStyleImages: StyleImageMap = {};
    if (saved.styleImages && typeof saved.styleImages === "object") {
      for (const [key, url] of Object.entries(saved.styleImages)) {
        if (VALID_STYLE_KEYS.has(key as ArtStyleKey) && url) filteredStyleImages[key as ArtStyleKey] = url;
      }
    }
    setStyleImages(filteredStyleImages);
    setComedyNames(saved.comedyNames ?? []);
    setJobId(saved.jobId ?? null);
    if (saved.selectedArtStyle && VALID_STYLE_KEYS.has(saved.selectedArtStyle.key as ArtStyleKey)) {
      setSelectedArtStyle({
        key: saved.selectedArtStyle.key as ArtStyleKey,
        name: saved.selectedArtStyle.name,
        description: saved.selectedArtStyle.description,
      });
    } else setSelectedArtStyle(null);
    // Never restore to styles_loading (no active stream); show style picker or upload instead
    const restoredPhase =
      saved.phase === "styles_loading"
        ? Object.keys(filteredStyleImages).length > 0
          ? "style_picker"
          : "upload"
        : saved.phase;
    setPhase(restoredPhase);
    setShowUnfinishedBanner(false);
  };

  const handleStartOver = () => {
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch (_) {}
    savedStateRef.current = null;
    setShowUnfinishedBanner(false);
    setPhase("upload");
    photo1.clear();
    photo2.clear();
    photo3.clear();
    video.clear();
    setDogName("");
    setStyleImages({});
    setStyleFailed({});
    setSelectedArtStyle(null);
    setComedyNames([]);
    setJobId(null);
    setResult(null);
    setError(null);
    setLoadingTimeout(false);
  };

  const startStyleGeneration = useCallback(async () => {
    if (!canGenerateStyles || !photos[0]) return;
    setError(null);
    setPhase("styles_loading");
    setStyleImages({});
    setStyleFailed({});
    setStylesProgress(0);
    setElapsedSeconds(0);
    styleLoadStartRef.current = Date.now();
    try {
      const form = new FormData();
      form.append("photo", photos[0]);
      const uploadRes = await fetch("/api/preview/upload-photo", {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const { url: dogPhotoUrl } = await uploadRes.json();
      const res = await fetch("/api/preview/generate-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dogPhotoUrl,
          dogName: dogName.trim(),
        }),
      });
      if (res.status === 429) {
        setPhase("rate_limit");
        setError("You've used your 2 free previews today! Come back tomorrow or create a free account.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPhase("upload");
        setError(data.error ?? "Failed to start style generation");
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setPhase("upload");
        setError("No response body");
        return;
      }
      const totalStyles = ART_STYLES.length;
      let completedCount = 0;
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            setPhase("style_picker");
            setStylesProgress(100);
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.jobId) continue;
              if (data.done) {
                setPhase("style_picker");
                setStylesProgress(100);
                reader.releaseLock();
                return;
              }
              if (data.styleKey && data.imageUrl) {
                completedCount += 1;
                setStylesProgress(Math.round((completedCount / totalStyles) * 100));
                setStyleImages((prev) => ({
                  ...prev,
                  [data.styleKey]: data.imageUrl,
                }));
              }
              if (data.styleKey && data.error) {
                console.error(`Style ${data.styleKey} failed:`, data.error);
                completedCount += 1;
                setStyleFailed((prev) => ({ ...prev, [data.styleKey]: true }));
                setStylesProgress(Math.round((completedCount / totalStyles) * 100));
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
        setPhase("style_picker");
        setStylesProgress(100);
      } finally {
        reader.releaseLock();
      }
    } catch (e) {
      setPhase("upload");
      setError(e instanceof Error ? e.message : "Style generation failed");
    }
  }, [canGenerateStyles, dogName, photos]);

  const selectedStyleImageUrl = selectedArtStyle
    ? styleImages[selectedArtStyle.key]
    : null;
  const canGenerateTrailer =
    !!selectedStyleImageUrl &&
    dogName.trim().length > 0 &&
    comedyNames.length >= 1 &&
    comedyNames.length <= 3;
  const showTrailerLoading = phase === "trailer_loading";

  const startTrailerGeneration = useCallback(async () => {
    if (!canGenerateTrailer || !selectedStyleImageUrl) return;
    setError(null);
    setPhase("trailer_loading");
    setLoadingStep(0);
    try {
      const res = await fetch("/api/preview/generate-from-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleImageUrl: selectedStyleImageUrl,
          dogName: dogName.trim(),
          comedyStyle: comedyNames.join(", ") || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setPhase("rate_limit");
        setError(data.message ?? "Rate limit exceeded.");
        return;
      }
      if (!res.ok) {
        setPhase("comedy_picker");
        setError(data.error ?? "Failed to start trailer");
        return;
      }
      setJobId(data.jobId);
    } catch (e) {
      setPhase("comedy_picker");
      setError(e instanceof Error ? e.message : "Network error");
    }
  }, [canGenerateTrailer, selectedStyleImageUrl, dogName, comedyNames]);

  useEffect(() => {
    if (phase !== "trailer_loading" || !jobId) return;
    setLoadingTimeout(false);
    const timeoutId = setTimeout(() => setLoadingTimeout(true), 120000);
    const stepsInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 15000);
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/preview/status/${jobId}`);
        const data = await res.json();
        if (data.status === "completed" && data.videoUrl) {
          setResult({
            videoUrl: data.videoUrl,
            comedyStyle: data.comedyStyle ?? comedyNames[0] ?? "Pixar-style",
            dogName,
          });
          setPhase("result");
          setJobId(null);
        } else if (data.status === "failed") {
          setError(data.error ?? "Generation failed");
          setPhase("comedy_picker");
          setJobId(null);
        }
      } catch (_) {}
    }, 3000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(stepsInterval);
      clearInterval(pollInterval);
    };
  }, [phase, jobId, dogName, comedyNames]);

  if (phase === "styles_loading") {
    const TOTAL_STYLES = Math.max(1, ART_STYLES.length);
    const completedCount =
      Object.keys(styleImages).length + Object.keys(styleFailed).length;
    const progress =
      completedCount === 0
        ? 3
        : Math.round((completedCount / TOTAL_STYLES) * 100);
    const completedKeys = new Set([
      ...Object.keys(styleImages),
      ...Object.keys(styleFailed),
    ]);
    const nextIncomplete = ART_STYLES.find((s) => !completedKeys.has(s.key));
    const lastStyle = ART_STYLES[ART_STYLES.length - 1];
    const currentStyleKey =
      (typeof nextIncomplete?.key === "string" ? nextIncomplete.key : null) ??
      (typeof lastStyle?.key === "string" ? lastStyle.key : null) ??
      "liveAction";
    const progressMessage =
      (currentStyleKey && STYLE_PROGRESS_MESSAGES[currentStyleKey]) ?? "Working on styles...";
    const avgSecondsPerStyle = 12;
    const estimatedTotal = TOTAL_STYLES * avgSecondsPerStyle;
    const remaining = Math.max(0, estimatedTotal - elapsedSeconds);
    const timeDisplay =
      completedCount === 0
        ? `~${estimatedTotal} seconds`
        : remaining > 0
          ? `~${remaining}s remaining`
          : "Almost done...";

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 px-4"
        style={{ backgroundColor: DEMO_COLORS.deepPlum }}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 animate-bounce">
          <span className="text-5xl" aria-hidden>🐕</span>
        </div>
        <p className="text-center text-lg font-medium text-white" style={{ fontFamily: "Fredoka One, sans-serif" }}>
          Painting your pup in 7 styles...
        </p>
        <p className="text-center text-sm" style={{ color: DEMO_COLORS.dustyRose }}>
          {timeDisplay}
        </p>
        <div className="w-full max-w-xs space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-2 rounded-full bg-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-center text-xs mt-2" style={{ color: DEMO_COLORS.dustyRose }}>
            {completedCount} of {TOTAL_STYLES} styles ready
          </p>
        </div>
        <p className="text-center text-sm text-amber-200 min-h-[1.5rem]">
          {progressMessage}
        </p>
        {completedCount < TOTAL_STYLES && (
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="sr-only">Generating</span>
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse [animation-delay:150ms]" />
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse [animation-delay:300ms]" />
          </div>
        )}
      </div>
    );
  }

  const trailerSteps = TRAILER_LOADING_STEPS(
    selectedArtStyle?.name ?? "Style",
    comedyNames.length ? comedyNames.join(" + ") : "your chosen shows"
  );

  if (phase === "trailer_loading") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 px-4"
        style={{ backgroundColor: DEMO_COLORS.deepPlum }}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 animate-bounce">
          <span className="text-5xl" aria-hidden>🐾</span>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide opacity-70 text-white">Step 4 of 4</p>
        <p className="text-center text-lg font-medium text-white" style={{ fontFamily: "Fredoka One, sans-serif" }}>
          Creating your trailer
        </p>
        <ul className="space-y-2 text-sm" style={{ color: DEMO_COLORS.dustyRose }}>
          {trailerSteps.map((step, i) => (
            <li
              key={step}
              className={cn(
                "transition-opacity",
                i <= loadingStep ? "opacity-100" : "opacity-50"
              )}
            >
              {step}
            </li>
          ))}
        </ul>
        <p className="text-sm" style={{ color: DEMO_COLORS.dustyRose }}>~60 seconds</p>
        {loadingTimeout && (
          <div className="mt-4 max-w-sm rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center text-sm text-foreground">
            <p className="font-medium">Taking longer than usual?</p>
            <p className="mt-1 text-muted-foreground">
              Run the Inngest dev server:{" "}
              <code className="rounded bg-muted px-1">npx inngest-cli@latest dev</code>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setPhase("comedy_picker");
                setJobId(null);
                setLoadingTimeout(false);
              }}
            >
              Back
            </Button>
          </div>
        )}
      </div>
    );
  }

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
              setPhase("upload");
              setResult(null);
              setDogName("");
              setStyleImages({});
              setSelectedArtStyle(null);
              setComedyNames([]);
              photo1.clear();
              photo2.clear();
              photo3.clear();
              video.clear();
            }}
          >
            Generate another trailer
          </button>
        </p>
      </div>
    );
  }

  // —— Step 1: Upload ——
  if (phase === "upload") {
    return (
      <div className="space-y-10">
        {showUnfinishedBanner && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            <span>You have an unfinished demo — </span>
            <button
              type="button"
              onClick={handleContinueUnfinished}
              className="font-medium text-amber-700 underline underline-offset-2 hover:no-underline dark:text-amber-400"
            >
              Continue where you left off
            </button>
            <span> or </span>
            <button
              type="button"
              onClick={handleStartOver}
              className="font-medium text-amber-700 underline underline-offset-2 hover:no-underline dark:text-amber-400"
            >
              Start over
            </button>
          </div>
        )}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step 1 of 4</p>
        <section className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Upload up to 3 photos of your dog. JPG, PNG, HEIC, max {photoMaxMb}MB each.
          </p>
          <div className="grid grid-cols-3 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="demo-video">Upload a short video of your dog (optional)</Label>
            <p className="text-xs text-muted-foreground">
              MP4, MOV, max {videoMaxMb}MB
            </p>
            <DemoUploadSlot
              label="Video (optional)"
              accept={videoAccept}
              maxMb={videoMaxMb}
              value={video.slot}
              onChange={video.handleChange}
              onClear={video.clear}
              onDrop={video.handleDrop}
              onDragOver={video.handleDragOver}
              onImageLoad={video.onImageLoad}
              isConverting={video.isConverting}
              inputId="demo-video"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-dog-name">Dog&apos;s name</Label>
            <Input
              id="demo-dog-name"
              value={dogName}
              onChange={(e) => setDogName(e.target.value)}
              placeholder="e.g. Biscuit"
              className="max-w-xs"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            size="lg"
            className="w-full text-lg"
            disabled={!canGenerateStyles}
            onClick={startStyleGeneration}
          >
            Animate My Pet 🎬
          </Button>
        </section>
      </div>
    );
  }

  // —— Step 2: Style picker (Warm Cream) ——
  if (phase === "style_picker") {
    return (
      <div
        className="min-h-[80vh] rounded-2xl px-4 py-6 pb-28"
        style={{ backgroundColor: DEMO_COLORS.warmCream }}
      >
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground/80 hover:text-foreground"
              onClick={() => setPhase("upload")}
            >
              ← Back
            </Button>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">Step 2 of 4</p>
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Pick an art style for {dogName || "your pup"}
          </h2>
          <p className="text-sm text-foreground/80">
            Click a style to see a short animation, then choose one for your trailer.
          </p>
          <DemoStyleGrid
            locked={false}
            styleImages={styleImages}
            styleFailed={styleFailed}
            loading={false}
            progressPercent={stylesProgress}
            rotatingMessage={rotatingMessage}
            dogName={dogName}
            selectedArtStyle={selectedArtStyle}
            onSelectStyle={(style) =>
              setSelectedArtStyle({
                key: style.key as ArtStyleKey,
                name: style.name,
                description: style.description,
              })
            }
            onChooseStyle={() => {}}
            onTryAnother={() => {}}
          />
        </div>
        {/* Sticky bar: Next → comedy picker */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-foreground/10 px-4 py-4"
          style={{ backgroundColor: DEMO_COLORS.warmCream }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {selectedArtStyle ? (
              <p className="text-sm text-foreground/80">
                Selected: <span className="font-semibold text-foreground">{selectedArtStyle.name}</span>
              </p>
            ) : (
              <p className="text-sm text-foreground/70">Tap a style above to select one</p>
            )}
            <Button
              size="lg"
              className="min-w-[200px] shrink-0 text-lg"
              style={{ backgroundColor: DEMO_COLORS.coralOrange, color: "white" }}
              disabled={!selectedArtStyle}
              onClick={() => setPhase("comedy_picker")}
            >
              Next: Pick comedy vibe →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // —— Step 3: Comedy picker (Warm Cream) ——
  if (phase === "comedy_picker") {
    return (
      <div
        className="min-h-[80vh] rounded-2xl px-4 py-6 pb-28"
        style={{ backgroundColor: DEMO_COLORS.warmCream }}
      >
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground/80 hover:text-foreground"
              onClick={() => setPhase("style_picker")}
            >
              ← Back
            </Button>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">Step 3 of 4</p>
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Pick your comedy vibe
          </h2>
          {selectedArtStyle && (
            <p className="rounded-lg border border-foreground/15 bg-white/50 px-3 py-2 text-sm text-foreground/90">
              Style: <span className="font-medium">{selectedArtStyle.name}</span>
            </p>
          )}
          <p className="text-sm text-foreground/80">
            Choose 1–3 shows that match the tone you want (e.g. Modern Family, Friends, Brooklyn Nine-Nine).
          </p>
          <StepComedyStyle
            selectedNames={comedyNames}
            maxPicks={3}
            onSelectionChange={setComedyNames}
          />
        </div>
        {/* Sticky bar: Generate trailer */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-foreground/10 px-4 py-4"
          style={{ backgroundColor: DEMO_COLORS.warmCream }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              size="lg"
              className="min-w-[220px] text-lg"
              style={{ backgroundColor: DEMO_COLORS.coralOrange, color: "white" }}
              disabled={!canGenerateTrailer}
              onClick={startTrailerGeneration}
            >
              Generate My Trailer 🎬
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
