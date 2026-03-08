"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const COLORS = ["#F4A335", "#FF6B6B", "#1A2744", "#FFF8F0"]; // amber, coral, navy, cream

/** One-time confetti burst. Use when episode becomes ready or on a celebration moment. */
export function Confetti({ run = true, className }: { run?: boolean; className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!run) return;
    setMounted(true);
    const t = setTimeout(() => setMounted(false), 3500);
    return () => clearTimeout(t);
  }, [run]);

  if (!mounted || !run) return null;

  const pieces = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1.5,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
  }));

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 z-50 overflow-hidden", className)}
      aria-hidden
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti rounded-sm"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
