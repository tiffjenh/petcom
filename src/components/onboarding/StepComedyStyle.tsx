"use client";

import { Tv } from "lucide-react";
import { cn } from "@/lib/utils";

/** Show name + tone descriptor for comedy style picker. Selection (names) is passed to Claude as comedy style context. */
export const COMEDY_SHOW_OPTIONS = [
  { name: "The Office", descriptor: "Cringe-comedy, talking heads, deadpan" },
  { name: "Brooklyn Nine-Nine", descriptor: "Warm ensemble, absurdist, wholesome" },
  { name: "Modern Family", descriptor: "Mockumentary, heartfelt, family chaos" },
  { name: "Parks and Recreation", descriptor: "Optimistic, quirky characters, ensemble" },
  { name: "Friends", descriptor: "Witty banter, recurring gags, NYC chaos" },
  { name: "Schitt's Creek", descriptor: "Dry wit, character growth, lovable weirdos" },
  { name: "It's Always Sunny", descriptor: "Chaotic, unhinged, anti-hero comedy" },
  { name: "Abbott Elementary", descriptor: "Mockumentary, warm, workplace ensemble" },
  { name: "What We Do in the Shadows", descriptor: "Deadpan, absurdist, mockumentary" },
  { name: "New Girl", descriptor: "Quirky, adorkable, found family" },
] as const;

type Props = {
  /** Selected show names (1–3). Passed to Claude as comedy style context. */
  selectedNames: string[];
  maxPicks: number;
  onSelectionChange: (names: string[]) => void;
  className?: string;
};

export function StepComedyStyle({
  selectedNames,
  maxPicks,
  onSelectionChange,
  className,
}: Props) {
  const toggle = (name: string) => {
    const next = selectedNames.includes(name)
      ? selectedNames.filter((x) => x !== name)
      : selectedNames.length < maxPicks
        ? [...selectedNames, name]
        : selectedNames;
    onSelectionChange(next);
  };

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3", className)}>
      {COMEDY_SHOW_OPTIONS.map((show) => {
        const selected = selectedNames.includes(show.name);
        return (
          <button
            key={show.name}
            type="button"
            onClick={() => toggle(show.name)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
              "hover:border-primary/50 hover:bg-muted/50",
              selected
                ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2"
                : "border-border bg-card"
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Tv className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="font-medium">{show.name}</span>
            <span className="text-xs text-muted-foreground">{show.descriptor}</span>
          </button>
        );
      })}
    </div>
  );
}
