"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Share2, Copy, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pre-populated caption for TikTok / Reels. */
export function buildShareCaption(showTitle: string, dogName: string): string {
  const tag = dogName.replace(/\s+/g, "");
  return `Meet ${dogName} in today's episode of ${showTitle} 🐾 #PawCast #DogsOfTikTok #${tag || "PawCast"}`;
}

type Props = {
  episodeId: string;
  title: string;
  videoUrl: string | null;
  showTitle: string;
  dogName: string;
  canShare: boolean;
  /** Pro/Family: show "Download without watermark" toggle (default true = no watermark). */
  showWatermarkToggle?: boolean;
};

/** Return type for downloadVerticalMp4 to avoid TSX generic/JSX parse ambiguity */
type DownloadResult = Promise<boolean>;

/** Share confirmation state to avoid TSX generic/JSX parse ambiguity */
type ShareConfirmationState = "tiktok" | "reels" | null;

export function EpisodeShare({
  episodeId,
  title,
  videoUrl,
  showTitle,
  dogName,
  canShare,
  showWatermarkToggle = false,
}: Props) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [preferNoWatermark, setPreferNoWatermark] = useState(true);
  const [shareConfirmation, setShareConfirmation] = useState<ShareConfirmationState>(null);

  useEffect(() => {
    if (!shareConfirmation) return;
    const t = setTimeout(() => setShareConfirmation(null), 3000);
    return () => clearTimeout(t);
  }, [shareConfirmation]);

  const watchUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/episodes/${episodeId}`
      : "";
  const shareCaption = buildShareCaption(showTitle, dogName);

  const copyLink = async () => {
    if (!watchUrl) return;
    try {
      await navigator.clipboard.writeText(watchUrl);
      toast({ title: "Link copied", description: "Paste it anywhere to share." });
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const downloadVerticalMp4 = async (): DownloadResult => {
    if (!videoUrl || !canShare) return false;
    const res = await fetch(videoUrl);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pawcast-${title.replace(/\s+/g, "-")}.mp4`;
    a.click();
    URL.revokeObjectURL(a.href);
    return true;
  };

  const downloadVideo = async () => {
    if (!videoUrl || !canShare) return;
    setDownloading(true);
    try {
      const ok = await downloadVerticalMp4();
      if (ok)
        toast({
          title: "Download started",
          description: "1080×1920 vertical MP4. Upload in TikTok or Instagram Reels.",
        });
      else toast({ title: "Download failed", variant: "destructive" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const shareToTikTok = async () => {
    if (!videoUrl || !canShare) return;
    setDownloading(true);
    setShareConfirmation(null);
    try {
      await navigator.clipboard.writeText(shareCaption);
      const ok = await downloadVerticalMp4();
      if (ok) {
        window.open("https://www.tiktok.com/upload", "_blank");
        setShareConfirmation("tiktok");
        toast({
          title: "Ready for TikTok",
          description: "Caption copied! Paste it when you upload the video.",
        });
      } else {
        toast({ title: "Download failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const shareToReels = async () => {
    if (!videoUrl || !canShare) return;
    setDownloading(true);
    setShareConfirmation(null);
    try {
      await navigator.clipboard.writeText(shareCaption);
      const ok = await downloadVerticalMp4();
      if (ok) {
        window.open("https://www.instagram.com/", "_blank");
        setShareConfirmation("reels");
        toast({
          title: "Ready for Reels",
          description: "Caption copied! Create a Reel and paste the caption.",
        });
      } else {
        toast({ title: "Download failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const nativeShare = async () => {
    if (!watchUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: `PawCast: ${title}`,
        text: `Watch my dog's sitcom episode – ${title}`,
        url: watchUrl,
      });
      toast({ title: "Shared" });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast({ title: "Share failed", variant: "destructive" });
      }
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Share</CardTitle>
        <CardDescription>
          Download the 1080×1920 vertical MP4 and upload in TikTok or Reels. Caption is copied when you use the buttons below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Animated share confirmation */}
        {shareConfirmation && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400",
              "animate-in slide-in-from-top-2 fade-in duration-300"
            )}
          >
            <Check className="h-5 w-5 shrink-0" />
            {shareConfirmation === "tiktok"
              ? "Caption copied & TikTok upload opened — paste and post!"
              : "Caption copied & Instagram opened — create a Reel and paste!"}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {canShare && videoUrl && (
            <>
              <Button variant="outline" size="sm" onClick={shareToTikTok} disabled={downloading}>
                Share to TikTok
              </Button>
              <Button variant="outline" size="sm" onClick={shareToReels} disabled={downloading}>
                Share to Instagram Reels
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </Button>
          {canShare && videoUrl && (
            <Button variant="outline" size="sm" onClick={downloadVideo} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Downloading…" : "Download MP4 (vertical)"}
            </Button>
          )}
          {hasNativeShare && (
            <Button variant="outline" size="sm" onClick={nativeShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share…
            </Button>
          )}
        </div>

        {showWatermarkToggle && canShare && videoUrl && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <input
              type="checkbox"
              id="no-watermark"
              checked={preferNoWatermark}
              onChange={(e) => setPreferNoWatermark(e.target.checked)}
              className="h-4 w-4 rounded border-primary accent-primary"
            />
            <Label htmlFor="no-watermark" className="text-sm font-normal cursor-pointer">
              Download without watermark
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
