"use client";

import { Tv } from "lucide-react";
import { cn } from "@/lib/utils";

/** Show id (snake_case) for prompt lookup; name for display and API/DB. */
export type ComedyShowOption = {
  id: string;
  name: string;
  descriptor: string;
  emoji: string;
};

/** Show name + tone descriptor for comedy style picker. Selection (names) is passed to Claude as comedy style context. */
export const COMEDY_SHOW_OPTIONS: ComedyShowOption[] = [
  { id: "the_office", name: "The Office", descriptor: "Cringe-comedy, talking heads, deadpan", emoji: "📄" },
  { id: "brooklyn_nine_nine", name: "Brooklyn Nine-Nine", descriptor: "Warm ensemble, absurdist, wholesome", emoji: "🛡️" },
  { id: "modern_family", name: "Modern Family", descriptor: "Mockumentary, heartfelt, family chaos", emoji: "👨‍👩‍👧‍👦" },
  { id: "parks_and_recreation", name: "Parks and Recreation", descriptor: "Optimistic, quirky characters, ensemble", emoji: "🏞️" },
  { id: "friends", name: "Friends", descriptor: "Witty banter, recurring gags, NYC chaos", emoji: "☕" },
  { id: "schitts_creek", name: "Schitt's Creek", descriptor: "Dry wit, character growth, lovable weirdos", emoji: "🏨" },
  { id: "its_always_sunny", name: "It's Always Sunny", descriptor: "Chaotic, unhinged, anti-hero comedy", emoji: "🍀" },
  { id: "abbott_elementary", name: "Abbott Elementary", descriptor: "Mockumentary, warm, workplace ensemble", emoji: "✏️" },
  { id: "what_we_do_in_the_shadows", name: "What We Do in the Shadows", descriptor: "Deadpan, absurdist, mockumentary", emoji: "🧛" },
  { id: "new_girl", name: "New Girl", descriptor: "Quirky, adorkable, found family", emoji: "🦉" },
  { id: "how_i_met_your_mother", name: "How I Met Your Mother", descriptor: "Nostalgic storytelling, running gags, found family", emoji: "🍺" },
  { id: "arrested_development", name: "Arrested Development", descriptor: "Layered jokes, dysfunctional family, callbacks", emoji: "🍌" },
  { id: "seinfeld", name: "Seinfeld", descriptor: "Observational, petty grievances, no lessons learned", emoji: "🥣" },
  { id: "community", name: "Community", descriptor: "Self-aware, genre-bending, underdog ensemble", emoji: "🎓" },
  { id: "curb_your_enthusiasm", name: "Curb Your Enthusiasm", descriptor: "Improvised awkwardness, social rules, cringe", emoji: "🥴" },
];

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
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5", className)}>
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
              {show.emoji || <Tv className="h-6 w-6 text-muted-foreground" />}
            </div>
            <span className="font-medium">{show.name}</span>
            <span className="text-xs text-muted-foreground">{show.descriptor}</span>
          </button>
        );
      })}
    </div>
  );
}
