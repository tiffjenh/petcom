"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

const EMOJIS = ["👍", "😂", "❤️", "🔥", "👏"];

type Props = { episodeId: string };

export function EpisodeReactions({ episodeId }: Props) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (emoji: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(emoji)) next.delete(emoji);
      else next.add(emoji);
      return next;
    });
    toast({ title: `${emoji} reaction added` });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Reactions:</span>
      <div className="flex gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            className={`rounded-full p-2 text-xl transition-transform hover:scale-110 ${
              selected.has(emoji) ? "bg-primary/20" : "hover:bg-muted"
            }`}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
