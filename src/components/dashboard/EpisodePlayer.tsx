"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EpisodeScriptJson, ScriptScene } from "@/lib/ai/script";

type ScriptLike = {
  scenes?: Array<{
    sceneNumber: number;
    setting: string;
    type: string;
    dialogue?: Array< { character: string; line: string; isThoughtBubble?: boolean }>;
  }>;
};

type Props = {
  src: string;
  poster?: string | null;
  script?: ScriptLike | EpisodeScriptJson | null;
  className?: string;
};

export function EpisodePlayer({ src, poster, script, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const video = videoRef.current;
  const scenes = script?.scenes ?? [];
  const sceneCount = scenes.length;

  const updateTime = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setCurrentTime(v.currentTime);
      setDuration(v.duration);
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDurationChange = () => setDuration(v.duration);
    const onLoadedMetadata = () => {
      setDuration(v.duration);
      setLoaded(true);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("durationchange", onDurationChange);
    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("durationchange", onDurationChange);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) v.volume = volume;
  };

  const setVol = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, value));
    v.volume = clamped;
    setVolume(clamped);
    setMuted(clamped === 0);
    v.muted = clamped === 0;
  };

  const seek = (time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, duration || 0));
    setCurrentTime(v.currentTime);
  };

  const seekToScene = (sceneIndex: number) => {
    if (!duration || sceneCount === 0) return;
    const start = (duration * sceneIndex) / sceneCount;
    seek(start);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  // Current scene index (0-based) for chapter and thought bubble
  const currentSceneIndex =
    duration > 0 && sceneCount > 0
      ? Math.min(
          Math.floor((currentTime / duration) * sceneCount),
          sceneCount - 1
        )
      : 0;
  const currentScene = scenes[currentSceneIndex];
  const thoughtLines =
    currentScene?.dialogue?.filter((d) => d.isThoughtBubble) ?? [];
  const sceneStart =
    duration > 0 && sceneCount > 0
      ? (duration * currentSceneIndex) / sceneCount
      : 0;
  const sceneEnd =
    duration > 0 && sceneCount > 0
      ? (duration * (currentSceneIndex + 1)) / sceneCount
      : duration;
  const sceneDuration = sceneEnd - sceneStart;
  const sceneProgress =
    sceneDuration > 0 ? (currentTime - sceneStart) / sceneDuration : 0;
  const thoughtIndex =
    thoughtLines.length > 0
      ? Math.min(
          Math.floor(sceneProgress * thoughtLines.length),
          thoughtLines.length - 1
        )
      : 0;
  const currentThought = thoughtLines[thoughtIndex];

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden rounded-xl border-2 border-border bg-black shadow-lg",
        className
      )}
    >
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          playsInline
          className="h-full w-full object-contain"
          onClick={togglePlay}
        />

        {/* Thought bubble overlay during dog inner monologue */}
        {currentThought && (
          <div
            className="absolute bottom-20 left-4 right-4 animate-in fade-in duration-300"
            aria-live="polite"
          >
            <div className="rounded-2xl border-2 border-primary/30 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
              <p className="text-sm font-medium text-foreground">
                {currentThought.character}
              </p>
              <p className="text-sm italic text-muted-foreground">
                &ldquo;{currentThought.line}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Custom controls overlay (shown on hover or when not playing) */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent p-2">
          {/* Progress bar */}
          <div
            className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/30"
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const t = (x / rect.width) * (duration || 0);
              seek(t);
            }}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded p-1.5 text-white hover:bg-white/20"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="rounded p-1.5 text-white hover:bg-white/20"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => setVol(Number(e.target.value))}
                className="h-1.5 w-20 accent-primary"
              />
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded p-1.5 text-white hover:bg-white/20"
              aria-label="Fullscreen"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chapter markers */}
      {loaded && sceneCount > 0 && (
        <div className="border-t border-border bg-muted/30 px-3 py-2">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Chapters
          </p>
          <div className="flex flex-wrap gap-2">
            {scenes.map((scene, i) => (
              <button
                key={i}
                type="button"
                onClick={() => seekToScene(i)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  currentSceneIndex === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {scene.sceneNumber}. {scene.setting}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
