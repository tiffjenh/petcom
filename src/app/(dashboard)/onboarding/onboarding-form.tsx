"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Dog, User, Upload, Plus, Trash2, Tv, Sparkles } from "lucide-react";
import type { User as DbUser, Household, Dog as DbDog, CastMember } from "@prisma/client";
import type { PlanLimits } from "@/lib/plans";
import { StepComedyStyle } from "@/components/onboarding/StepComedyStyle";

const PERSONALITY_TAGS = [
  "Chaotic",
  "Lazy",
  "Dramatic",
  "Foodie",
  "Cuddly",
  "Mischievous",
  "Anxious",
  "Regal",
  "Derpy",
  "Fierce",
];

const ROLES = ["Owner", "Partner", "Kid", "Roommate", "Grandparent", "Friend"];

type DogEntry = { name: string; breed: string; personality: string[]; characterBio: string; photoUrl: string };
type CastEntry = { name: string; role: string; photoUrl: string };

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
  const maxDogs = planLimits.maxDogs;
  const maxCast = planLimits.maxCastMembers;
  const maxComedyPicks = planLimits.maxComedyStylePicks;
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [showTitle, setShowTitle] = useState(existingHousehold?.showTitle ?? "");
  const firstDogName = existingHousehold?.dogs[0]?.name ?? "";
  const suggestedTitle = firstDogName ? `Life with ${firstDogName}` : "Life with [Your Dog]";

  const [showStyle, setShowStyle] = useState<string[]>(existingHousehold?.showStyle ?? []);
  const [comedyNotes, setComedyNotes] = useState(existingHousehold?.comedyNotes ?? "");
  const [ownerName, setOwnerName] = useState((existingHousehold as { ownerName?: string } | null)?.ownerName ?? "");

  const [dogs, setDogs] = useState<DogEntry[]>(
    existingHousehold?.dogs.length
      ? existingHousehold.dogs.map((d) => ({
          name: d.name,
          breed: d.breed ?? "",
          personality: d.personality,
          characterBio: (d as { characterBio?: string }).characterBio ?? "",
          photoUrl: d.photoUrl,
        }))
      : [{ name: "", breed: "", personality: [], characterBio: "", photoUrl: "" }]
  );
  const [castMembers, setCastMembers] = useState<CastEntry[]>(
    existingHousehold?.castMembers.length
      ? existingHousehold.castMembers.map((c) => ({
          name: c.name,
          role: c.role,
          photoUrl: c.photoUrl,
        }))
      : []
  );

  const [avatarProgress, setAvatarProgress] = useState(0);
  const [avatarsDone, setAvatarsDone] = useState(false);

  const addDog = () => {
    if (dogs.length >= maxDogs) return;
    setDogs((prev) => [...prev, { name: "", breed: "", personality: [], characterBio: "", photoUrl: "" }]);
  };
  const removeDog = (i: number) => {
    if (dogs.length <= 1) return;
    setDogs((prev) => prev.filter((_, j) => j !== i));
  };
  const updateDog = (i: number, field: keyof DogEntry, value: string | string[]) => {
    setDogs((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const toggleDogPersonality = (dogIdx: number, tag: string) => {
    setDogs((prev) => {
      const next = [...prev];
      const p = next[dogIdx].personality;
      next[dogIdx].personality = p.includes(tag)
        ? p.filter((x) => x !== tag)
        : [...p, tag];
      return next;
    });
  };

  const addCast = () => {
    if (castMembers.length >= maxCast) return;
    setCastMembers((prev) => [...prev, { name: "", role: "Owner", photoUrl: "" }]);
  };
  const removeCast = (i: number) => {
    setCastMembers((prev) => prev.filter((_, j) => j !== i));
  };
  const updateCast = (i: number, field: keyof CastEntry, value: string) => {
    setCastMembers((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const runStep5Avatars = async () => {
    setAvatarProgress(0);
    const total = dogs.filter((d) => d.photoUrl).length + castMembers.filter((c) => c.photoUrl).length;
    let n = 0;
    const interval = setInterval(() => {
      n += 1;
      setAvatarProgress(Math.min(100, (n / (total || 1)) * 100));
      if (n >= (total || 1)) {
        clearInterval(interval);
        setAvatarsDone(true);
      }
    }, 600);
  };

  const saveAndFinish = async () => {
    const validDogs = dogs.filter((d) => d.name.trim() && d.photoUrl);
    if (!validDogs.length) {
      toast({ title: "Add at least one dog with a photo", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showTitle: showTitle || suggestedTitle,
          showStyle,
          comedyNotes: comedyNotes || undefined,
          ownerName: ownerName.trim() || undefined,
          dogs: validDogs.map((d) => ({
            name: d.name,
            breed: d.breed || undefined,
            personality: d.personality,
            characterBio: d.characterBio.trim() || undefined,
            photoUrl: d.photoUrl,
          })),
          castMembers: castMembers.filter((c) => c.name.trim() && c.photoUrl).map((c) => ({
            name: c.name,
            role: c.role,
            photoUrl: c.photoUrl,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save");
      }
      const { householdId } = await res.json();
      let episodeId: string | null = null;
      if (householdId) {
        const genRes = await fetch("/api/episodes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId, episodeNum: 1, season: 1 }),
        });
        if (genRes.ok) {
          const genData = await genRes.json();
          episodeId = genData.episodeId ?? null;
        }
      }
      toast({
        title: "All set!",
        description: episodeId
          ? "Your first episode is being created. We'll take you there now — video ready in a few minutes."
          : "Your first episode is brewing.",
      });
      if (episodeId) {
        router.push(`/dashboard/episodes/${episodeId}`);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
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

  const canProceedStep1 = showTitle.trim().length > 0;
  const canProceedStep2 = showStyle.length >= 1 && showStyle.length <= maxComedyPicks;
  const canProceedStep3 = dogs.some((d) => d.name.trim() && d.photoUrl);
  const canProceedStep5 = avatarsDone;

  useEffect(() => {
    if (step !== 5 || avatarsDone || avatarProgress > 0) return;
    const total = dogs.filter((d) => d.photoUrl).length + castMembers.filter((c) => c.photoUrl).length;
    let n = 0;
    const interval = setInterval(() => {
      n += 1;
      setAvatarProgress((p) => Math.min(100, (n / (total || 1)) * 100));
      if (n >= (total || 1)) {
        clearInterval(interval);
        setAvatarsDone(true);
      }
    }, 600);
    return () => clearInterval(interval);
  }, [step]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div
            key={s}
            className={`h-2 w-8 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {/* Step 1 — Name Your Show */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>What&apos;s your show called?</CardTitle>
            <CardDescription>
              We suggest &quot;Life with [Dog Name]&quot; — you can add your dog in the next step and come back to edit.
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
            <div className="rounded-xl border-2 border-primary/20 bg-muted/50 p-6 text-center">
              <Tv className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">{showTitle || suggestedTitle}</p>
              <p className="text-sm text-muted-foreground">Preview on your show card</p>
            </div>
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
              Next
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Pick Comedy Style */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Pick your comedy style</CardTitle>
            <CardDescription>Select {maxComedyPicks === 1 ? "1 show" : `1–${maxComedyPicks} shows`}. We&apos;ll match that vibe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StepComedyStyle
              selectedNames={showStyle}
              maxPicks={maxComedyPicks}
              onSelectionChange={setShowStyle}
            />
            <div className="space-y-2">
              <Label htmlFor="comedyNotes">Anything else about your vibe?</Label>
              <Input
                id="comedyNotes"
                value={comedyNotes}
                onChange={(e) => setComedyNotes(e.target.value)}
                placeholder="e.g. dry humor, lots of sarcasm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Casting Call: Your name + dog(s) */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">Casting Call</CardTitle>
              <Tv className="h-6 w-6 text-primary" />
            </div>
            <CardDescription>
              Tell us about your star. The more quirky details, the funnier the script!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Your name (the co-star)</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Phil"
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="mb-4 font-semibold">Your dog{maxDogs !== 1 ? "s" : ""} (required)</h3>
              {dogs.map((dog, i) => (
                <div key={i} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Dog {i + 1}</span>
                    {dogs.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDog(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Dog&apos;s name</Label>
                      <Input
                        value={dog.name}
                        onChange={(e) => updateDog(i, "name", e.target.value)}
                        placeholder="e.g. Barnaby"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Breed</Label>
                      <Input
                        value={dog.breed}
                        onChange={(e) => updateDog(i, "breed", e.target.value)}
                        placeholder="e.g. Golden Retriever"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Character bio & quirks</Label>
                    <textarea
                      value={dog.characterBio}
                      onChange={(e) => updateDog(i, "characterBio", e.target.value)}
                      placeholder="e.g. Terrified of the vacuum cleaner. Believes he is a human. Steals socks and hoards them under the couch. Best friends with the neighborhood squirrel."
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Photo (required)</Label>
                    <PhotoUpload
                      value={dog.photoUrl}
                      onChange={(url) => updateDog(i, "photoUrl", url)}
                      accept="image/jpeg,image/png,image/heic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Personality tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {PERSONALITY_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleDogPersonality(i, tag)}
                          className={`rounded-full px-3 py-1 text-sm ${
                            dog.personality.includes(tag) ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            {dogs.length < maxDogs && (
              <Button type="button" variant="outline" onClick={addDog}>
                <Plus className="mr-2 h-4 w-4" />
                Add another dog
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} disabled={!canProceedStep3}>Next</Button>
            </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4 — Add Cast (optional) */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Who else is in the show?</CardTitle>
            <CardDescription>Optional. Name, role, and photo. Your plan allows up to {maxCast} cast member{maxCast !== 1 ? "s" : ""}. Skip if you like.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {castMembers.map((cast, i) => (
              <div key={i} className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
                <div className="space-y-2 flex-1 min-w-[140px]">
                  <Label>Name</Label>
                  <Input
                    value={cast.name}
                    onChange={(e) => updateCast(i, "name", e.target.value)}
                    placeholder="e.g. Alex"
                  />
                </div>
                <div className="space-y-2 w-32">
                  <Label>Role</Label>
                  <Select value={cast.role} onValueChange={(v) => updateCast(i, "role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1 min-w-[120px]">
                  <Label>Photo</Label>
                  <PhotoUpload
                    value={cast.photoUrl}
                    onChange={(url) => updateCast(i, "photoUrl", url)}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCast(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {castMembers.length < maxCast && (
              <Button type="button" variant="outline" onClick={addCast}>
                <Plus className="mr-2 h-4 w-4" />
                Add cast member
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={() => setStep(5)}>Skip</Button>
              <Button onClick={() => setStep(5)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5 — Generating Avatars */}
      {step === 5 && (
        <Card className="min-h-[400px] flex flex-col items-center justify-center py-12">
          <CardContent className="w-full max-w-md text-center">
            {!avatarsDone ? (
              <>
                <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Generating your avatars</h3>
                <p className="mt-2 text-muted-foreground">
                  Animating {dogs[0]?.name || "your dog"}… giving them that Pixar glow ✨
                </p>
                <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${avatarProgress}%` }}
                  />
                </div>
                {avatarProgress === 0 && (
                  <Button className="mt-6" onClick={runStep5Avatars}>
                    Start generating
                  </Button>
                )}
              </>
            ) : (
              <>
                <Sparkles className="mx-auto h-12 w-12 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Your avatars are ready</h3>
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  {dogs.filter((d) => d.photoUrl).map((d, i) => (
                    <div key={i} className="text-center">
                      <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-primary bg-muted">
                        <img src={d.photoUrl} alt={d.name} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1 text-sm font-medium">{d.name || `Dog ${i + 1}`}</p>
                    </div>
                  ))}
                  {castMembers.filter((c) => c.photoUrl).map((c, i) => (
                    <div key={i} className="text-center">
                      <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-primary bg-muted">
                        <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1 text-sm font-medium">{c.name || `Cast ${i + 1}`}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">You can regenerate avatars later from the Cast page.</p>
                <Button className="mt-6" onClick={() => setStep(6)}>
                  Next
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 6 — First Episode Brewing */}
      {step === 6 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Sparkles className="h-16 w-16 text-primary" />
            <h3 className="mt-4 text-2xl font-semibold">Your first episode is brewing</h3>
            <p className="mt-2 text-muted-foreground">
              Episode 1 will be ready in ~5 minutes. We&apos;ll drop a new one every day.
            </p>
            <Button className="mt-8" size="lg" onClick={saveAndFinish} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Go to your dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PhotoUpload({
  value,
  onChange,
  accept = "image/*",
}: {
  value: string;
  onChange: (url: string) => void;
  accept?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const inputId = React.useId();
  const effectiveValue = value && !loadError ? value : "";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadError(false);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) onChange(data.url);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor={inputId}
        className="relative flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-primary/40 bg-muted/50 transition-colors hover:bg-muted"
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFile}
          disabled={uploading}
        />
        {uploading ? (
          <span className="text-xs text-muted-foreground">Uploading…</span>
        ) : effectiveValue ? (
          <>
            <img
              src={effectiveValue}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setLoadError(true)}
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100">
              Change photo
            </span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="mt-1 text-xs text-muted-foreground">Click to upload</span>
          </>
        )}
      </label>
      {effectiveValue && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-destructive underline"
          onClick={(e) => {
            e.preventDefault();
            setLoadError(false);
            onChange("");
          }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
