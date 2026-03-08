"use client";

import { useEffect, useState } from "react";
import { Confetti } from "./Confetti";

/** Fires confetti once when episode is ready (once per episode per session). */
export function EpisodeReadyConfetti({
  episodeId,
  status,
}: {
  episodeId: string;
  status: string;
}) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (status !== "ready") return;
    const key = `pawcast-confetti-${episodeId}`;
    try {
      if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
        setRun(true);
        sessionStorage.setItem(key, "1");
      }
    } catch {
      setRun(true);
    }
  }, [episodeId, status]);

  return <Confetti run={run} />;
}
