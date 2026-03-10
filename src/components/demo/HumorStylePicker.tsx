"use client";

import { cn } from "@/lib/utils";

export type HumorStyleOption = {
  id: string;
  emoji: string;
  label: string;
  description: string;
  examples: string;
};

export const HUMOR_STYLE_OPTIONS: HumorStyleOption[] = [
  {
    id: "mockumentary",
    emoji: "🎥",
    label: "Mockumentary",
    description: "Talking to the camera, awkward pauses, confessionals",
    examples: "The Office, Abbott Elementary, Modern Family",
  },
  {
    id: "chaotic_comedy",
    emoji: "🌪️",
    label: "Chaotic & Absurd",
    description: "Things escalate fast, nothing makes sense, somehow works out",
    examples: "It's Always Sunny, Brooklyn Nine-Nine, Arrested Development",
  },
  {
    id: "wholesome",
    emoji: "🧡",
    label: "Wholesome & Heartfelt",
    description: "Sweet moments, big feelings, everyone learns something",
    examples: "Ted Lasso, Schitt's Creek, Parks and Recreation",
  },
  {
    id: "dry_wit",
    emoji: "🫥",
    label: "Dry & Deadpan",
    description: "Underreacting to chaos, very serious about silly things",
    examples: "What We Do in the Shadows, Frasier, Curb Your Enthusiasm",
  },
  {
    id: "sitcom_classic",
    emoji: "📺",
    label: "Classic Sitcom",
    description: "Misunderstandings, big reactions, laugh track energy",
    examples: "Friends, Seinfeld, How I Met Your Mother",
  },
  {
    id: "reality_tv",
    emoji: "💅",
    label: "Reality TV Drama",
    description: "Confessionals, villain edits, dramatic music stings",
    examples: "Real Housewives, Survivor, The Bachelor",
  },
];

const EMOJI_TINT: Record<string, string> = {
  "🎥": "border-amber-500/60 bg-amber-500/10",
  "🌪️": "border-sky-500/60 bg-sky-500/10",
  "🧡": "border-orange-400/60 bg-orange-400/10",
  "🫥": "border-slate-500/60 bg-slate-500/10",
  "📺": "border-violet-500/60 bg-violet-500/10",
  "💅": "border-pink-500/60 bg-pink-500/10",
};

type Props = {
  selectedIds: string[];
  maxPicks?: number;
  onSelectionChange: (ids: string[]) => void;
  className?: string;
};

export function HumorStylePicker({
  selectedIds,
  maxPicks = 2,
  onSelectionChange,
  className,
}: Props) {
  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : selectedIds.length < maxPicks
        ? [...selectedIds, id]
        : selectedIds;
    onSelectionChange(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-muted-foreground">Pick 1 or 2</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {HUMOR_STYLE_OPTIONS.map((style) => {
          const selected = selectedIds.includes(style.id);
          const tint = EMOJI_TINT[style.emoji] ?? "border-primary/50 bg-primary/10";
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => toggle(style.id)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                "hover:border-primary/50 hover:bg-muted/50",
                selected
                  ? `${tint} ring-2 ring-primary/40 ring-offset-2 ring-offset-background`
                  : "border-border bg-card"
              )}
            >
              <span className="text-2xl" aria-hidden>
                {style.emoji}
              </span>
              <span className="font-semibold">{style.label}</span>
              <span className="text-sm text-muted-foreground">
                {style.description}
              </span>
              <span className="text-xs text-muted-foreground/80">
                {style.examples}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
