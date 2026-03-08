"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/** Client-only: pick a photo and show preview. No server upload, no auth. */
export function DemoUploadAndPreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputId = useRef(`demo-upload-${Math.random().toString(36).slice(2)}`).current;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor={inputId}
        className={cn(
          "relative flex h-32 w-32 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-muted/50 transition-colors hover:bg-muted",
          previewUrl && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/webp"
          className="sr-only"
          onChange={handleFile}
        />
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100">
              Change photo
            </span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="mt-2 text-xs text-muted-foreground">Click to upload</span>
          </>
        )}
      </label>
      {previewUrl && (
        <button
          type="button"
          className="text-sm text-muted-foreground underline hover:text-foreground"
          onClick={() => {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
