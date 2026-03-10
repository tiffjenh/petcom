"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import type { User as DbUser, Household, Dog as DbDog, CastMember } from "@prisma/client";
import type { PlanLimits } from "@/lib/plans";
import { StepComedyStyle } from "@/components/onboarding/StepComedyStyle";
import {
  useDemoUploadState,
  DemoUploadSlot,
} from "@/app/demo/demo-upload-preview";

const PERSONALITY_TRAITS = [
  { id: "chaotic", label: "🌪️ Chaotic" },
  { id: "dramatic", label: "🎭 Dramatic" },
  { id: "foodie", label: "🍖 Foodie" },
  { id: "lazy", label: "😴 Lazy" },
  { id: "anxious", label: "😬 Anxious" },
  { id: "stubborn", label: "🐂 Stubborn" },
  { id: "playful", label: "🎾 Playful" },
  { id: "cuddly", label: "🤗 Cuddly" },
  { id: "adventurous", label: "🏕️ Adventurous" },
  { id: "sassy", label: "💅 Sassy" },
  { id: "nosy", label: "👀 Nosy" },
  { id: "clingy", label: "🐾 Clingy" },
];

const MAX_TRAITS = 4;

type HouseholdWithCast = Household & { dogs: DbDog[]; castMembers: CastMember[] };

export function OnboardingForm({
  user,
  existingHousehold,
  planLimits,
}: {
  user: DbUser;
  existingHousehold: HouseholdWithCast | null;
  planLimits: PlanLimits;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const { photo1, photo2, photo3, photos, photoAccept, photoMaxMb } = useDemoUploadState();

  const [dogName, setDogName] = useState(existingHousehold?.dogs[0]?.name ?? "");
  const [breed, setBreed] = useState(existingHousehold?.dogs[0]?.breed ?? "");
  const [ownerName, setOwnerName] = useState(
    (existingHousehold as { ownerName?: string } | null)?.ownerName ?? ""
  );
  const [selectedTraits, setSelectedTraits] = useState<string[]>(
    existingHousehold?.dogs[0]?.personality ?? []
  );
  const [characterBio, setCharacterBio] = useState(
    (existingHousehold?.dogs[0] as { characterBio?: string } | undefined)?.characterBio ?? ""
  );
  const [showTitle, setShowTitle] = useState(
    existingHousehold?.showTitle ?? ""
  );
  const [comedyShows, setComedyShows] = useState<string[]>(
    existingHousehold?.showStyle ?? []
  );

  const maxComedyPicks = planLimits.maxComedyStylePicks ?? 3;
  const suggestedTitle = dogName.trim() ? `Life with ${dogName}` : "Life with [Your Dog]";

  const toggleTrait = (id: string) => {
    setSelectedTraits((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_TRAITS
          ? [...prev, id]
          : prev
    );
  };

  const canProceedStep1 =
    dogName.trim().length > 0 && photos.length >= 1;
  const canProceedStep2 = true;
  const canProceedStep3 =
    showTitle.trim().length > 0 &&
    comedyShows.length >= 1 &&
    comedyShows.length <= maxComedyPicks;

  const handleSubmit = async () => {
    if (!canProceedStep3 || photos.length === 0) {
      toast({ title: "Please add at least one photo and complete all steps", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const photoUrls: string[] = [];
      for (const file of photos) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Photo upload failed");
        }
        const data = await res.json();
        if (data.url) photoUrls.push(data.url);
      }
      if (photoUrls.length === 0) throw new Error("No photos uploaded");

      const res = await fetch("/api/episodes/start-pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dogName: dogName.trim(),
          breed: breed.trim() || undefined,
          photoUrls,
          ownerName: ownerName.trim() || undefined,
          personality: selectedTraits,
          characterBio: characterBio.trim() || undefined,
          showTitle: showTitle.trim() || suggestedTitle,
          humorStyles: comedyShows,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to start pilot");
      }
      const { episodeId, householdId } = await res.json();
      if (!episodeId || !householdId) throw new Error("Invalid response from server");
      router.push(
        `/onboarding/loading?episodeId=${encodeURIComponent(episodeId)}&householdId=${encodeURIComponent(householdId)}&dogName=${encodeURIComponent(dogName.trim())}`
      );
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-8 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {/* Step 1 — Meet Your Star */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Meet Your Star</CardTitle>
            <CardDescription>
              Tell us about your dog and upload 3 photos so we can bring them to life in Pixar style.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dogName">Dog&apos;s name</Label>
                <Input
                  id="dogName"
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  placeholder="e.g. Barnaby"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Golden Retriever"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Photos (3 slots)</Label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DemoUploadSlot
                  label="Photo 1"
                  accept={photoAccept}
                  maxMb={photoMaxMb}
                  value={photo1.slot}
                  onChange={photo1.handleChange}
                  onClear={photo1.clear}
                  onDrop={photo1.handleDrop}
                  onDragOver={photo1.handleDragOver}
                  onImageLoad={photo1.onImageLoad}
                  inputId="onboard-photo-1"
                />
                <DemoUploadSlot
                  label="Photo 2"
                  accept={photoAccept}
                  maxMb={photoMaxMb}
                  value={photo2.slot}
                  onChange={photo2.handleChange}
                  onClear={photo2.clear}
                  onDrop={photo2.handleDrop}
                  onDragOver={photo2.handleDragOver}
                  onImageLoad={photo2.onImageLoad}
                  inputId="onboard-photo-2"
                />
                <DemoUploadSlot
                  label="Photo 3"
                  accept={photoAccept}
                  maxMb={photoMaxMb}
                  value={photo3.slot}
                  onChange={photo3.handleChange}
                  onClear={photo3.clear}
                  onDrop={photo3.handleDrop}
                  onDragOver={photo3.handleDragOver}
                  onImageLoad={photo3.onImageLoad}
                  inputId="onboard-photo-3"
                />
              </div>
              <p className="text-xs text-muted-foreground">At least one photo required. We&apos;ll use these to create your dog&apos;s animated avatar.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Your name (co-star)</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Phil"
              />
            </div>
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
              Next →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Write the Character */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Write the Character</CardTitle>
            <CardDescription>
              Pick up to {MAX_TRAITS} personality traits and add quirks so we can write scripts that feel like your dog.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Personality</Label>
              <div className="flex flex-wrap gap-2">
                {PERSONALITY_TRAITS.map((trait) => (
                  <button
                    key={trait.id}
                    type="button"
                    onClick={() => toggleTrait(trait.id)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      selectedTraits.includes(trait.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {trait.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Max {MAX_TRAITS} traits</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="characterBio">Character bio & quirks</Label>
              <textarea
                id="characterBio"
                value={characterBio}
                onChange={(e) => setCharacterBio(e.target.value)}
                placeholder="e.g. Steals socks and hides them. Thinks the mailman is her nemesis. Pretends to be asleep when it's bath time."
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Pick Your Show&apos;s Vibe */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Pick Your Show&apos;s Vibe</CardTitle>
            <CardDescription>
              Name your show and pick 1–{maxComedyPicks} TV shows that match the vibe of {dogName.trim() || "your dog"}&apos;s sitcom.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="showTitle">Show title</Label>
              <Input
                id="showTitle"
                value={showTitle}
                onChange={(e) => setShowTitle(e.target.value)}
                placeholder={suggestedTitle}
              />
            </div>
            <div className="space-y-2">
              <Label>What shows does {dogName.trim() || "your dog"}&apos;s sitcom feel like?</Label>
              <StepComedyStyle
                selectedNames={comedyShows}
                maxPicks={maxComedyPicks}
                onSelectionChange={setComedyShows}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={!canProceedStep3 || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Filming! 🎬
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
