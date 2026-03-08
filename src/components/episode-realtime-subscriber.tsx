"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

/**
 * Subscribes to Supabase Realtime postgres changes on Episode for this household.
 * When an episode is updated (e.g. status -> "ready"), refreshes the router so the dashboard refetches.
 * Requires Supabase Realtime enabled for the Episode table and NEXT_PUBLIC_SUPABASE_ANON_KEY set.
 */
export function EpisodeRealtimeSubscriber({
  householdId,
}: {
  householdId: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!householdId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(`episode:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Episode",
          filter: `householdId=eq.${householdId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, router]);

  return null;
}
