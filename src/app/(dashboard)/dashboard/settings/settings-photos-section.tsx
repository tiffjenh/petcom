"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, X } from "lucide-react";

const MAX_PHOTOS_PER_SLOT = 3;

type DogWithPhotos = { id: string; name: string; photoUrl: string; photoUrls?: string[]; wardrobeItems?: { label: string; photoUrls: string[] }[] | null };
type CastMemberWithPhotos = {
  id: string;
  name: string;
  role: string;
  photoUrl: string | null;
  photoUrls?: string[];
  animatedAvatar?: string | null;
  avatarStatus?: string | null;
};
type HouseholdWithRelations = {
  id: string;
  ownerName: string | null;
  dogs: DogWithPhotos[];
  castMembers: CastMemberWithPhotos[];
  locationPhotos?: Record<string, string[]> | null;
};

const LOCATION_KEYS = ["living_room", "backyard", "kitchen", "bedroom", "favorite_spot"] as const;
const LOCATION_LABELS: Record<string, string> = {
  living_room: "Living Room",
  backyard: "Backyard",
  kitchen: "Kitchen",
  bedroom: "Bedroom",
  favorite_spot: "Favorite Spot",
};
const CAST_ROLES = [
  { role: "owner_1", labelKey: "owner_1" },
  { role: "owner_2", labelKey: "owner_2" },
  { role: "pet_2", labelKey: "pet_2" },
  { role: "pet_3", labelKey: "pet_3" },
] as const;

function usePhotoUrls(initial: string[], max: number = MAX_PHOTOS_PER_SLOT): [string[], (i: number, url: string) => void, (i: number) => void, React.Dispatch<React.SetStateAction<string[]>>] {
  const [urls, setUrls] = useState<string[]>(() => (Array.isArray(initial) ? initial : []).slice(0, max));
  const setOne = (i: number, url: string) => {
    setUrls((prev) => {
      const next = [...prev];
      next[i] = url;
      return next.slice(0, max);
    });
  };
  const removeOne = (i: number) => {
    setUrls((prev) => prev.filter((_, idx) => idx !== i));
  };
  return [urls, setOne, removeOne, setUrls];
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload failed");
  }
  const data = await res.json();
  if (!data.url) throw new Error("No URL returned");
  return data.url;
}

function PhotoSlot({
  url,
  onUpload,
  onRemove,
  disabled,
}: {
  url: string | undefined;
  onUpload: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onUpload(url);
    } catch (_) {
      // toast handled by caller if needed
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30">
      {url ? (
        <>
          <img src={url} alt="" className="h-full w-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              aria-label="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            disabled={disabled || uploading}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-full w-full items-center justify-center text-muted-foreground hover:bg-muted/50"
            aria-label="Add photo"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
          </button>
        </>
      )}
    </div>
  );
}

export function SettingsPhotosSection({ household }: { household: HouseholdWithRelations | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const primaryDog = household?.dogs?.[0];
  const ownerName = household?.ownerName ?? "Owner";

  const [dogPhotoUrls, setDogPhotoUrl, removeDogPhoto, setDogPhotoUrls] = usePhotoUrls(
    primaryDog ? (primaryDog.photoUrls?.length ? primaryDog.photoUrls : primaryDog.photoUrl ? [primaryDog.photoUrl] : []) : [],
    10
  );
  const [savingDog, setSavingDog] = useState(false);

  const saveDogPhotos = async () => {
    if (!primaryDog) return;
    setSavingDog(true);
    try {
      const res = await fetch(`/api/dogs/${primaryDog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrls: dogPhotoUrls }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Pet photos saved" });
      router.refresh();
    } catch {
      toast({ title: "Failed to save pet photos", variant: "destructive" });
    } finally {
      setSavingDog(false);
    }
  };

  const castByRole = (household?.castMembers ?? []).reduce(
    (acc, c) => {
      acc[c.role] = c;
      return acc;
    },
    {} as Record<string, CastMemberWithPhotos>
  );

  const getInitialCastState = () => {
    const o: Record<string, { name: string; photoUrls: string[] }> = {};
    CAST_ROLES.forEach(({ role }) => {
      const m = castByRole[role];
      o[role] = {
        name: m?.name ?? (role === "owner_1" ? ownerName : ""),
        photoUrls: (m?.photoUrls?.length ? m.photoUrls : m?.photoUrl ? [m.photoUrl] : []).slice(0, MAX_PHOTOS_PER_SLOT),
      };
    });
    return o;
  };

  const [castState, setCastState] = useState<Record<string, { name: string; photoUrls: string[] }>>(getInitialCastState);

  const [locationState, setLocationState] = useState<Record<string, string[]>>(() => {
    const raw = (household?.locationPhotos as Record<string, string[]> | null) ?? {};
    const o: Record<string, string[]> = {};
    LOCATION_KEYS.forEach((k) => {
      o[k] = (Array.isArray(raw[k]) ? raw[k] : []).slice(0, MAX_PHOTOS_PER_SLOT);
    });
    return o;
  });

  const [wardrobeItems, setWardrobeItems] = useState<{ label: string; photoUrls: string[] }[]>(() => {
    const raw = primaryDog?.wardrobeItems;
    if (Array.isArray(raw)) return raw.map((i) => ({ label: i.label ?? "", photoUrls: (i.photoUrls ?? []).slice(0, MAX_PHOTOS_PER_SLOT) }));
    return [];
  });

  useEffect(() => {
    const urls = primaryDog ? (primaryDog.photoUrls?.length ? primaryDog.photoUrls : primaryDog.photoUrl ? [primaryDog.photoUrl] : []) : [];
    setDogPhotoUrls(urls);
  }, [primaryDog?.id, primaryDog?.photoUrl, primaryDog?.photoUrls?.join(",")]);

  useEffect(() => {
    const o: Record<string, { name: string; photoUrls: string[] }> = {};
    CAST_ROLES.forEach(({ role }) => {
      const m = castByRole[role];
      o[role] = {
        name: m?.name ?? (role === "owner_1" ? ownerName : ""),
        photoUrls: (m?.photoUrls?.length ? m.photoUrls : m?.photoUrl ? [m.photoUrl] : []).slice(0, MAX_PHOTOS_PER_SLOT),
      };
    });
    setCastState(o);
  }, [household?.id, household?.castMembers, ownerName]);

  useEffect(() => {
    const raw = (household?.locationPhotos as Record<string, string[]> | null) ?? {};
    const o: Record<string, string[]> = {};
    LOCATION_KEYS.forEach((k) => {
      o[k] = (Array.isArray(raw[k]) ? raw[k] : []).slice(0, MAX_PHOTOS_PER_SLOT);
    });
    setLocationState(o);
  }, [household?.locationPhotos]);

  useEffect(() => {
    const raw = primaryDog?.wardrobeItems;
    if (Array.isArray(raw)) setWardrobeItems(raw.map((i) => ({ label: i.label ?? "", photoUrls: (i.photoUrls ?? []).slice(0, MAX_PHOTOS_PER_SLOT) })));
  }, [primaryDog?.id, primaryDog?.wardrobeItems]);

  const [savingCast, setSavingCast] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingWardrobe, setSavingWardrobe] = useState(false);

  const castPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveCast = async () => {
    setSavingCast(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ castMembers: castState }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data && typeof data.message === "string" ? data.message : "Failed to save cast") || "Failed to save cast";
        console.error("[saveCast] server error", res.status, data);
        toast({ title: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Cast saved!" });
      router.refresh();
      // Poll so "Generating avatar..." updates to the thumbnail when ready (stop after 2 min)
      if (castPollRef.current) clearInterval(castPollRef.current);
      castPollRef.current = setInterval(() => router.refresh(), 5000);
      setTimeout(() => {
        if (castPollRef.current) {
          clearInterval(castPollRef.current);
          castPollRef.current = null;
        }
      }, 120000);
    } catch (e) {
      console.error("[saveCast] request failed", e);
      toast({ title: "Failed to save cast", variant: "destructive" });
    } finally {
      setSavingCast(false);
    }
  };

  useEffect(() => () => {
    if (castPollRef.current) {
      clearInterval(castPollRef.current);
      castPollRef.current = null;
    }
  }, []);

  const saveLocations = async () => {
    setSavingLocation(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationPhotos: locationState }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Location photos saved" });
      router.refresh();
    } catch {
      toast({ title: "Failed to save locations", variant: "destructive" });
    } finally {
      setSavingLocation(false);
    }
  };

  const saveWardrobe = async () => {
    if (!primaryDog) return;
    setSavingWardrobe(true);
    try {
      const res = await fetch(`/api/dogs/${primaryDog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardrobeItems: wardrobeItems.filter((i) => i.label.trim()) }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Wardrobe saved" });
      router.refresh();
    } catch {
      toast({ title: "Failed to save wardrobe", variant: "destructive" });
    } finally {
      setSavingWardrobe(false);
    }
  };

  const updateCastPhoto = (role: string, index: number, url: string) => {
    setCastState((prev) => {
      const next = { ...prev };
      const arr = [...(next[role]?.photoUrls ?? [])];
      arr[index] = url;
      next[role] = { name: next[role]?.name ?? "", photoUrls: arr.slice(0, MAX_PHOTOS_PER_SLOT) };
      return next;
    });
  };
  const removeCastPhoto = (role: string, index: number) => {
    setCastState((prev) => {
      const next = { ...prev };
      const arr = (next[role]?.photoUrls ?? []).filter((_, i) => i !== index);
      next[role] = { name: next[role]?.name ?? "", photoUrls: arr };
      return next;
    });
  };
  const updateLocationPhoto = (key: string, index: number, url: string) => {
    setLocationState((prev) => {
      const next = { ...prev };
      const arr = [...(next[key] ?? [])];
      arr[index] = url;
      next[key] = arr.slice(0, MAX_PHOTOS_PER_SLOT);
      return next;
    });
  };
  const removeLocationPhoto = (key: string, index: number) => {
    setLocationState((prev) => {
      const next = { ...prev };
      next[key] = (next[key] ?? []).filter((_, i) => i !== index);
      return next;
    });
  };

  const castLabels: Record<string, string> = {
    owner_1: ownerName || "Owner #1",
    owner_2: "Owner #2",
    pet_2: "Pet #2",
    pet_3: "Pet #3",
  };

  if (!household) return null;

  return (
    <div className="space-y-6">
      {/* Section 1 - Original pet photos */}
      <Card>
        <CardHeader>
          <CardTitle>Original pet photos</CardTitle>
          <CardDescription>
            Reference photos from onboarding. Add more for better animation. Up to 10.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {primaryDog ? (
            <>
              <div className="flex flex-wrap gap-3">
                {dogPhotoUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-muted bg-muted/30">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDogPhoto(i)}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {dogPhotoUrls.length < 10 && (
                  <PhotoSlot
                    url={undefined}
                    onUpload={(url) => setDogPhotoUrl(dogPhotoUrls.length, url)}
                    onRemove={() => {}}
                  />
                )}
              </div>
              <Button className="mt-3" onClick={saveDogPhotos} disabled={savingDog}>
                {savingDog && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save pet photos
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Add a dog in onboarding first.</p>
          )}
        </CardContent>
      </Card>

      {/* Section 2 - Cast photos */}
      <Card>
        <CardHeader>
          <CardTitle>Your Cast</CardTitle>
          <CardDescription>Add photos so we can animate everyone accurately. Up to 3 photos per person.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {CAST_ROLES.map(({ role }) => {
            const member = castByRole[role];
            const hasPhotos = (castState[role]?.photoUrls?.length ?? 0) > 0 || (member?.photoUrls?.length ?? 0) > 0;
            const status = member?.avatarStatus ?? "none";
            const isGenerating = status === "pending" || status === "generating";
            const avatarUrl = member?.animatedAvatar;
            return (
              <div key={role} className="flex flex-wrap items-end gap-4">
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <PhotoSlot
                      key={i}
                      url={castState[role]?.photoUrls?.[i]}
                      onUpload={(url) => updateCastPhoto(role, i, url)}
                      onRemove={() => removeCastPhoto(role, i)}
                    />
                  ))}
                </div>
                <div className="min-w-[140px]">
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder={castLabels[role]}
                    value={castState[role]?.name ?? ""}
                    onChange={(e) =>
                      setCastState((prev) => ({
                        ...prev,
                        [role]: { ...prev[role], name: e.target.value, photoUrls: prev[role]?.photoUrls ?? [] },
                      }))
                    }
                    className="mt-1 h-9"
                  />
                </div>
                {hasPhotos && (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                    {isGenerating && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        Generating avatar…
                      </span>
                    )}
                    {status === "ready" && avatarUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Avatar:</span>
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      </div>
                    )}
                    {status === "failed" && (
                      <span className="text-xs text-muted-foreground">Avatar failed</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <Button onClick={saveCast} disabled={savingCast}>
            {savingCast && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save cast
          </Button>
        </CardContent>
      </Card>

      {/* Section 3 - Location photos */}
      <Card>
        <CardHeader>
          <CardTitle>Your Home &amp; Locations</CardTitle>
          <CardDescription>Help us set scenes in your actual home. Up to 3 photos per location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {LOCATION_KEYS.map((key) => (
            <div key={key} className="flex flex-wrap items-center gap-4">
              <span className="w-28 text-sm font-medium">{LOCATION_LABELS[key] ?? key}</span>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <PhotoSlot
                    key={i}
                    url={locationState[key]?.[i]}
                    onUpload={(url) => updateLocationPhoto(key, i, url)}
                    onRemove={() => removeLocationPhoto(key, i)}
                  />
                ))}
              </div>
            </div>
          ))}
          <Button onClick={saveLocations} disabled={savingLocation}>
            {savingLocation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save location photos
          </Button>
        </CardContent>
      </Card>

      {/* Section 4 - Wardrobe & props */}
      <Card>
        <CardHeader>
          <CardTitle>Wardrobe &amp; Props</CardTitle>
          <CardDescription>Outfits or toys your pet owns. Add a label and up to 3 photos per item.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wardrobeItems.map((item, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-4 rounded-lg border p-3">
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <PhotoSlot
                    key={i}
                    url={item.photoUrls?.[i]}
                    onUpload={(url) => {
                      setWardrobeItems((prev) => {
                        const next = [...prev];
                        const urls = [...(next[idx].photoUrls ?? [])];
                        urls[i] = url;
                        next[idx] = { ...next[idx], photoUrls: urls.slice(0, MAX_PHOTOS_PER_SLOT) };
                        return next;
                      });
                    }}
                    onRemove={() => {
                      setWardrobeItems((prev) => {
                        const next = [...prev];
                        next[idx].photoUrls = (next[idx].photoUrls ?? []).filter((_, j) => j !== i);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
              <Input
                placeholder="e.g. Blue harness"
                value={item.label}
                onChange={(e) =>
                  setWardrobeItems((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], label: e.target.value };
                    return next;
                  })
                }
                className="w-40"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setWardrobeItems((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Remove item"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setWardrobeItems((prev) => [...prev, { label: "", photoUrls: [] }])}
          >
            <Plus className="mr-2 h-4 w-4" /> Add item
          </Button>
          <Button className="ml-2" onClick={saveWardrobe} disabled={savingWardrobe}>
            {savingWardrobe && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save wardrobe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
