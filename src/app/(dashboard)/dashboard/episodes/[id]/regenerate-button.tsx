"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

export function RegenerateEpisodeButton({ episodeId }: { episodeId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to start");
      }
      toast({
        title: "Creating your video again",
        description: "We'll notify you when it's ready. This page will update automatically.",
      });
      router.refresh();
    } catch (e) {
      toast({
        title: "Could not start",
        description: e instanceof Error ? e.message : "Try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleRegenerate} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {loading ? "Starting…" : "Create sample video again"}
    </Button>
  );
}
