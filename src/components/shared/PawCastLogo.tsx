"use client";

import { cn } from "@/lib/utils";

/** Stylized dog silhouette inside a film clapperboard — design language logo. */
export function PawCastLogo({
  className,
  size = 32,
  showWordmark = true,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  const w = size;
  const h = size * (9 / 10);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width={w}
        height={h}
        viewBox="0 0 40 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden
      >
        {/* Clapperboard: angled top + body */}
        <path
          d="M2 8 L2 32 Q2 34 4 34 L36 34 Q38 34 38 32 L38 10 L22 4 L2 8 Z"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Clapperboard stripes (film aesthetic) */}
        <path
          d="M4 10 L20 6 L36 10 L36 14 L4 14 Z"
          fill="hsl(var(--primary-foreground))"
          fillOpacity="0.25"
        />
        <path
          d="M4 18 L36 18 L36 22 L4 22 Z"
          fill="hsl(var(--primary-foreground))"
          fillOpacity="0.15"
        />
        <path
          d="M4 26 L36 26 L36 30 L4 30 Z"
          fill="hsl(var(--primary-foreground))"
          fillOpacity="0.1"
        />
        {/* Dog silhouette (side profile, rounded — inside the board) */}
        <g transform="translate(10, 12) scale(0.55)">
          {/* Body */}
          <ellipse cx="18" cy="20" rx="12" ry="8" fill="hsl(var(--primary-foreground))" />
          {/* Head */}
          <circle cx="28" cy="12" r="8" fill="hsl(var(--primary-foreground))" />
          {/* Ear */}
          <ellipse cx="32" cy="6" rx="3" ry="6" fill="hsl(var(--primary-foreground))" />
          {/* Snout */}
          <ellipse cx="34" cy="12" rx="4" ry="3" fill="hsl(var(--primary-foreground))" />
          {/* Leg (front) */}
          <rect x="22" y="24" width="4" height="8" rx="2" fill="hsl(var(--primary-foreground))" />
          {/* Leg (back) */}
          <rect x="10" y="24" width="4" height="8" rx="2" fill="hsl(var(--primary-foreground))" />
          {/* Tail */}
          <path
            d="M6 18 Q2 14 4 10 Q6 12 8 16"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
      {showWordmark && (
        <span className="font-heading text-xl font-bold tracking-tight text-foreground">
          PawCast
        </span>
      )}
    </div>
  );
}
