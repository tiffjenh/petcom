"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const POLL_INTERVAL_MS = 5000;
const REDIRECT_DELAY_MS = 2000;
const SCENES_PATIENCE_MS = 6 * 60 * 1000; // 6 minutes

const STEPS = [
  { id: "avatar" as const, label: "Creating your dog's animated character", emoji: "🎨" },
  { id: "script" as const, label: "Writing the pilot script", emoji: "📋" },
  { id: "scenes" as const, label: "Filming the scenes", emoji: "🎬" },
  { id: "assembly" as const, label: "Editing and assembling the episode", emoji: "✂️" },
];

const STEP_ESTIMATES: Record<string, string> = {
  avatar: "~30 seconds",
  script: "~30 seconds",
  scenes: "~4 minutes",
  assembly: "~30 seconds",
};

type StepId = "avatar" | "script" | "scenes" | "assembly" | "done";

export default function OnboardingLoadingPage() {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episodeId");
  const householdId = searchParams.get("householdId");
  const dogName = searchParams.get("dogName") ?? "your pup";
  const [status, setStatus] = useState<"generating" | "scripted" | "ready" | "failed" | "error">("generating");
  const [currentStep, setCurrentStep] = useState<StepId>("avatar");
  const [pollStart, setPollStart] = useState<number>(Date.now());

  useEffect(() => {
    if (!episodeId || !householdId) {
      setStatus("error");
      return;
    }
    setPollStart(Date.now());
  }, [episodeId, householdId]);

  useEffect(() => {
    if (!episodeId || !householdId || status === "failed" || status === "error") return;

    const check = async () => {
      try {
        const res = await fetch(`/api/episodes/status/${encodeURIComponent(episodeId)}`);
        if (!res.ok) return;
        const data = await res.json();
        setCurrentStep(data.currentStep ?? "avatar");
        setStatus(data.status ?? "generating");

        if (data.status === "scripted" || data.currentStep === "assembly") {
          setCurrentStep("assembly");
          setStatus("scripted");
          return;
        }
        if (data.status === "ready") {
          setCurrentStep("done");
          setStatus("ready");
          return;
        }
        if (data.status === "failed") {
          setStatus("failed");
          return;
        }
      } catch {
        // keep polling
      }
      setTimeout(check, POLL_INTERVAL_MS);
    };

    const t = setTimeout(check, POLL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [episodeId, householdId, status]);

  // Redirect 2 seconds after we see scripted/assembly or ready
  useEffect(() => {
    if ((status !== "scripted" && status !== "ready") || !householdId) return;
    const t = setTimeout(() => {
      window.location.href = `/studio/${householdId}`;
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [status, householdId]);

  const stepIndex =
    currentStep === "done" ? STEPS.length : STEPS.findIndex((s) => s.id === currentStep);
  const onScenesLongWait =
    currentStep === "scenes" && Date.now() - pollStart > SCENES_PATIENCE_MS;

  if (!episodeId || !householdId || status === "error") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Missing episode or household. Go back to onboarding.</p>
        <Button asChild>
          <Link href="/onboarding">Back to onboarding</Link>
        </Button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-muted-foreground">
          Something went wrong during filming.
        </p>
        <Button asChild>
          <Link href="/onboarding">Try Again</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-8 px-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="w-full max-w-md space-y-2">
        <h2 className="text-xl font-semibold text-center">Filming your pilot episode...</h2>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Starring {dogName}
        </p>

        <ul className="space-y-3">
          {STEPS.map((step, i) => {
            const isDone = stepIndex > i || currentStep === "done";
            const isActive = step.id === currentStep && status !== "ready";
            const isPending = !isDone && !isActive;
            return (
              <li
                key={step.id}
                className={`flex items-start gap-3 text-sm ${
                  isPending ? "text-muted-foreground" : ""
                } ${isDone ? "text-muted-foreground" : ""} ${isActive ? "text-foreground" : ""}`}
              >
                <span className="mt-0.5 shrink-0 w-5">
                  {isDone && <span className="text-green-600">✅</span>}
                  {isActive && (
                    <span className="inline-block text-primary animate-pulse">{step.emoji}</span>
                  )}
                  {isPending && <span className="text-muted-foreground">{step.emoji}</span>}
                </span>
                <span className={isDone ? "line-through opacity-80" : ""}>
                  {step.label}
                  {isActive && (
                    <span className="block mt-0.5 text-muted-foreground font-normal">
                      in progress... {STEP_ESTIMATES[step.id]}
                    </span>
                  )}
                  {step.id === "scenes" && isActive && (
                    <span className="block mt-1 text-xs text-muted-foreground font-normal">
                      This is the longest step — we&apos;re animating each scene individually.
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        {onScenesLongWait && (
          <p className="mt-4 text-center text-sm text-muted-foreground rounded-md bg-muted/50 p-3">
            Still filming... Hailuo is rendering your scenes. This can take up to 6 minutes. Hang tight! 🎬
          </p>
        )}

        {status === "scripted" && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Script ready! Taking you to the studio...
          </p>
        )}
      </div>
    </div>
  );
}
