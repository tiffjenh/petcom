"use client";

import React, { useId, useState, useCallback, useRef } from "react";
import { Upload, Film } from "lucide-react";
import { cn } from "@/lib/utils";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,image/webp";
const PHOTO_MAX_MB = 10;
const VIDEO_ACCEPT = "video/mp4,video/quicktime";
const VIDEO_MAX_MB = 50;

type FileSlot = { file: File; previewUrl: string } | null;

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

async function convertIfHeic(file: File): Promise<Blob> {
  if (!isHeicFile(file)) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return blob as Blob;
  } catch (err) {
    console.warn("HEIC conversion failed, using original:", err);
    return file;
  }
}

function useFileSlot(accept: string, maxMb: number) {
  const [slot, setSlot] = useState<FileSlot>(null);
  const [isConverting, setIsConverting] = useState(false);
  const id = useId();
  const currentBlobUrlRef = useRef<string | null>(null);
  const oldUrlToRevokeRef = useRef<string | null>(null);

  const setFileInternal = useCallback(
    (file: File | null, previewBlob?: Blob) => {
      if (!file) {
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
          currentBlobUrlRef.current = null;
        }
        oldUrlToRevokeRef.current = null;
        setSlot(null);
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        return;
      }
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
          currentBlobUrlRef.current = null;
        }
        oldUrlToRevokeRef.current = null;
        setSlot({ file, previewUrl: "" });
        return;
      }
      const oldUrl = currentBlobUrlRef.current;
      const source = previewBlob ?? file;
      const newUrl = URL.createObjectURL(source);
      currentBlobUrlRef.current = newUrl;
      if (oldUrl) oldUrlToRevokeRef.current = oldUrl;
      setSlot({ file, previewUrl: newUrl });
    },
    [maxMb]
  );

  const clear = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
    oldUrlToRevokeRef.current = null;
    setSlot(null);
  }, []);

  const onImageLoad = useCallback(() => {
    if (oldUrlToRevokeRef.current) {
      URL.revokeObjectURL(oldUrlToRevokeRef.current);
      oldUrlToRevokeRef.current = null;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      if (f.type.startsWith("video/")) {
        setFileInternal(f);
        return;
      }
      if (isHeicFile(f)) {
        setIsConverting(true);
        convertIfHeic(f)
          .then((blob) => {
            setFileInternal(f, blob);
          })
          .catch(() => setFileInternal(f))
          .finally(() => setIsConverting(false));
      } else {
        setFileInternal(f);
      }
    },
    [setFileInternal]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      if (f.type.startsWith("video/")) {
        setFileInternal(f);
        return;
      }
      if (isHeicFile(f)) {
        setIsConverting(true);
        convertIfHeic(f)
          .then((blob) => {
            setFileInternal(f, blob);
          })
          .catch(() => setFileInternal(f))
          .finally(() => setIsConverting(false));
      } else {
        setFileInternal(f);
      }
    },
    [setFileInternal]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return { id, slot, isConverting, setFile: setFileInternal, clear, onImageLoad, handleChange, handleDrop, handleDragOver };
}

export function DemoUploadSlot({
  label,
  accept,
  maxMb,
  value,
  onChange,
  onClear,
  onDrop,
  onDragOver,
  onImageLoad,
  isConverting = false,
  inputId,
}: {
  label: string;
  accept: string;
  maxMb: number;
  value: FileSlot;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onImageLoad?: () => void;
  isConverting?: boolean;
  inputId: string;
}) {
  const isVideo = accept.startsWith("video/");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [showFallback, setShowFallback] = React.useState(false);
  const [errorFallbackDataUrl, setErrorFallbackDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setShowFallback(false);
    setErrorFallbackDataUrl(null);
  }, [value?.file]);

  const displayUrl = errorFallbackDataUrl ?? value?.previewUrl ?? null;
  const hasImagePreview = value && displayUrl;
  const hasVideoPlaceholder = value && !displayUrl && isVideo;
  const isEmpty = !value;

  const handleImageError = React.useCallback(() => {
    if (!value?.file || value.file.type.startsWith("video/")) return;
    // If we already tried a data URL and we're still failing, show paw-print fallback.
    if (errorFallbackDataUrl) {
      if (imgRef.current) imgRef.current.style.display = "none";
      setShowFallback(true);
      return;
    }
    // Blob URL failed (e.g. Strict Mode revoke, or HEIC). Try data URL so the photo can show.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setErrorFallbackDataUrl(reader.result);
        setShowFallback(false);
        if (imgRef.current) imgRef.current.style.display = "";
      } else {
        if (imgRef.current) imgRef.current.style.display = "none";
        setShowFallback(true);
      }
    };
    reader.onerror = () => {
      if (imgRef.current) imgRef.current.style.display = "none";
      setShowFallback(true);
    };
    reader.readAsDataURL(value.file);
  }, [value?.file, errorFallbackDataUrl]);

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex w-full aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-muted/50 transition-colors hover:bg-muted",
          value && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={onChange}
          aria-label={label}
        />
        {isConverting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-amber-50">
            <div className="animate-spin text-2xl">🐾</div>
            <span className="text-xs text-amber-600 ml-2">Converting...</span>
          </div>
        )}
        {hasImagePreview && !isConverting && (
          <>
            <img
              ref={imgRef}
              src={displayUrl}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover object-center"
              onLoad={() => onImageLoad?.()}
              onError={handleImageError}
            />
            {showFallback && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-50 rounded-xl">
                <span className="text-3xl">🐾</span>
                <span className="text-xs text-amber-600 mt-1">Photo ready</span>
              </div>
            )}
          </>
        )}
        {hasVideoPlaceholder && (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <Film className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Video</span>
          </div>
        )}
        {isEmpty && (
          <>
            {isVideo ? (
              <Film className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <span className="mt-1 text-xs text-muted-foreground">
              {isVideo ? "Drop or click" : "Drop or click"}
            </span>
            <span className="text-[10px] text-muted-foreground">max {maxMb}MB</span>
          </>
        )}
        {value && (
          <>
            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100">
              Change
            </span>
            <button
              type="button"
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-xs text-white hover:bg-black/70"
              onClick={(e) => (e.preventDefault(), e.stopPropagation(), onClear())}
              aria-label="Remove"
            >
              ✕
            </button>
          </>
        )}
      </div>
      {value && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline hover:text-destructive"
          onClick={(e) => (e.preventDefault(), onClear())}
        >
          Remove
        </button>
      )}
    </div>
  );
}

export function useDemoUploadState() {
  const photo1 = useFileSlot(PHOTO_ACCEPT, PHOTO_MAX_MB);
  const photo2 = useFileSlot(PHOTO_ACCEPT, PHOTO_MAX_MB);
  const photo3 = useFileSlot(PHOTO_ACCEPT, PHOTO_MAX_MB);
  const video = useFileSlot(VIDEO_ACCEPT, VIDEO_MAX_MB);

  const photoSlots = [photo1, photo2, photo3];
  const photos = photoSlots
    .map((p) => p.slot?.file)
    .filter((f): f is File => !!f);
  const hasVideo = !!video.slot?.file;

  return {
    photo1,
    photo2,
    photo3,
    video,
    photos,
    hasVideo,
    photoAccept: PHOTO_ACCEPT,
    photoMaxMb: PHOTO_MAX_MB,
    videoAccept: VIDEO_ACCEPT,
    videoMaxMb: VIDEO_MAX_MB,
  };
}
