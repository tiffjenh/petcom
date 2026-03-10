"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ART_STYLES, ANIMATION_CLIP_LABELS } from "@/lib/art-styles";
import type { ArtStyleKey } from "@/lib/art-styles";

const ROTATING_MESSAGES = [
  "Setting up the shot...",
  "Rendering in 3D...",
];

type StyleImageMap = Partial<Record<ArtStyleKey, string>>;

type Props = {
  locked: boolean;
  styleImages: StyleImageMap;
  styleFailed?: Record<string, boolean>;
  loading: boolean;
  progressPercent: number;
  rotatingMessage: string;
  dogName: string;
  selectedArtStyle: { key: ArtStyleKey; name: string; description: string } | null;
  onSelectStyle: (style: (typeof ART_STYLES)[number]) => void;
  onChooseStyle: () => void;
  onTryAnother: () => void;
};

export function DemoStyleGrid({
  locked,
  styleImages,
  styleFailed = {},
  loading,
  progressPercent,
  rotatingMessage,
  dogName,
  selectedArtStyle,
  onSelectStyle,
  onChooseStyle,
  onTryAnother,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStyle, setModalStyle] = useState<(typeof ART_STYLES)[number] | null>(null);
  const [clips, setClips] = useState<Record<string, string>>({});
  const [clipsLoading, setClipsLoading] = useState(false);
  const [activeClipKey, setActiveClipKey] = useState<string | null>(null);

  const openModal = useCallback(
    (style: (typeof ART_STYLES)[number]) => {
      setModalStyle(style);
      setModalOpen(true);
      setActiveClipKey(null);
      const imageUrl = styleImages[style.key as ArtStyleKey];
      if (!imageUrl) return;
      setClipsLoading(true);
      setClips({});
      fetch("/api/preview/animate-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleImageUrl: imageUrl,
          artStyle: style.name,
          dogName,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          setClips(data.clips || {});
          const keys = Object.keys(data.clips || {});
          if (keys.length) setActiveClipKey(keys[0]);
        })
        .finally(() => setClipsLoading(false));
    },
    [styleImages, dogName]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalStyle(null);
    onTryAnother();
  }, [onTryAnother]);

  const chooseThisStyle = useCallback(() => {
    if (modalStyle) onSelectStyle(modalStyle);
    setModalOpen(false);
    setModalStyle(null);
    onChooseStyle();
  }, [modalStyle, onSelectStyle, onChooseStyle]);

  return (
    <>
      <div className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          {locked
            ? "Upload your dog's photo to see them in both styles"
            : "Click a style to see animations"}
        </p>
        {/* 2 styles: equal cards, 2 columns on desktop and mobile */}
        <div className="grid grid-cols-2 gap-4">
          {ART_STYLES.map((style) => {
            const imageUrl = styleImages[style.key as ArtStyleKey];
            const isLoading = loading && !imageUrl;
            const canSelect = !!imageUrl && !loading;
            return (
              <button
                key={style.key}
                type="button"
                disabled={!canSelect}
                onClick={() => imageUrl && openModal(style)}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-xl border-2 border-border bg-muted transition-all text-left",
                  "hover:border-primary/50 hover:shadow-md",
                  !canSelect && "cursor-not-allowed opacity-90",
                  isLoading && "animate-pulse"
                )}
              >
                <div className="relative aspect-square w-full">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : styleFailed[style.key] ? (
                    <div className="flex flex-col h-full w-full items-center justify-center bg-amber-50">
                      <span className="text-4xl" aria-hidden>🎨</span>
                      <span className="text-xs text-amber-600 mt-1">Tap to retry</span>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <span className="text-4xl" aria-hidden>{style.emoji}</span>
                    </div>
                  )}
                  {isLoading && (
                    <div className="absolute inset-0 bg-muted/80">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </div>
                  )}
                </div>
                <div className="border-t border-border bg-card p-3">
                  <p className="text-sm font-medium leading-tight">
                    {style.emoji} {style.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{style.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-3">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-center text-sm text-muted-foreground">
            {rotatingMessage}
          </p>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent
          className="max-h-[95vh] max-w-4xl overflow-y-auto"
          showClose={true}
        >
          {modalStyle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {modalStyle.emoji} {modalStyle.name}
                  {selectedArtStyle?.key === modalStyle.key && (
                    <span className="rounded bg-primary/20 px-2 py-0.5 text-sm font-normal text-primary">
                      Selected ✓
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {modalStyle.description}
              </p>
              <div className="overflow-hidden rounded-xl border-2 border-border bg-black">
                <div className="relative aspect-video">
                  {activeClipKey && clips[activeClipKey] ? (
                    <video
                      key={activeClipKey}
                      src={clips[activeClipKey]}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : styleImages[modalStyle.key as ArtStyleKey] ? (
                    <img
                      src={styleImages[modalStyle.key as ArtStyleKey]!}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                  {clipsLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <p className="text-sm text-white">Loading animations...</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Animation preview</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(Object.keys(ANIMATION_CLIP_LABELS) as (keyof typeof ANIMATION_CLIP_LABELS)[]).map(
                    (key) => {
                      const url = clips[key];
                      const label = ANIMATION_CLIP_LABELS[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => url && setActiveClipKey(key)}
                          className={cn(
                            "shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-all",
                            activeClipKey === key
                              ? "border-primary ring-2 ring-primary/50"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="aspect-video w-32">
                            {url ? (
                              <video
                                src={url}
                                muted
                                loop
                                playsInline
                                autoPlay
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                {clipsLoading ? "…" : "—"}
                              </div>
                            )}
                          </div>
                          <p className="w-32 truncate p-1 text-center text-xs">
                            {label}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={chooseThisStyle}>
                  Choose This Style
                </Button>
                <Button variant="outline" onClick={closeModal}>
                  Try Another Style
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Rotating message hook for loading state. */
export function useRotatingMessage(messages: string[], intervalMs = 4000) {
  const safeMessages = Array.isArray(messages) && messages.length > 0 ? messages : ["Loading..."];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const len = safeMessages.length;
    if (len <= 0) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % len);
    }, intervalMs);
    return () => clearInterval(id);
  }, [safeMessages.length, intervalMs]);
  return safeMessages[index] ?? "Loading...";
}
