"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Household } from "@prisma/client";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { HUMOR_CATEGORY_TO_SHOW_IDS, COMEDY_SHOW_NAME_TO_CATEGORY } from "@/lib/prompts/scriptPrompt";
import { SettingsPhotosSection } from "./settings-photos-section";

/** Same 6 humor styles as onboarding. id is saved to household.showStyle. */
const HUMOR_STYLE_OPTIONS = [
  { id: "mockumentary", label: "Mockumentary", subtitle: "The Office, Modern Family, Abbott Elementary" },
  { id: "chaotic_comedy", label: "Chaotic & Absurd", subtitle: "It's Always Sunny, Arrested Development" },
  { id: "wholesome", label: "Wholesome & Heartfelt", subtitle: "Schitt's Creek, Ted Lasso" },
  { id: "dry_wit", label: "Dry & Deadpan", subtitle: "Seinfeld, Curb Your Enthusiasm" },
  { id: "sitcom_classic", label: "Classic Sitcom", subtitle: "Friends, How I Met Your Mother, New Girl" },
  { id: "reality_tv", label: "Reality TV Drama", subtitle: "The Real Housewives, Love Island" },
] as const;

const NOTIFICATION_TIMES = [
  { value: "", label: "When episode is ready" },
  { value: "06:00", label: "6:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "21:00", label: "9:00 PM" },
];

export function SettingsForm({
  household,
  maxComedyPicks = 3,
  notificationEmail = true,
  notificationPush = false,
  notificationTime = "",
}: {
  household: Household | null;
  maxComedyPicks?: number;
  notificationEmail?: boolean;
  notificationPush?: boolean;
  notificationTime?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [comedySaving, setComedySaving] = useState(false);
  const [showTitle, setShowTitle] = useState(household?.showTitle ?? "");
  const showStyleInitial = useMemo(() => {
    const raw = household?.showStyle ?? [];
    const categoryIds = new Set<string>(Object.keys(HUMOR_CATEGORY_TO_SHOW_IDS));
    return raw.map((s) => (categoryIds.has(s) ? s : COMEDY_SHOW_NAME_TO_CATEGORY[s])).filter(Boolean) as string[];
  }, [household?.showStyle]);
  const [showStyle, setShowStyle] = useState<string[]>(showStyleInitial);

  useEffect(() => {
    const raw = household?.showStyle ?? [];
    const categoryIds = new Set<string>(Object.keys(HUMOR_CATEGORY_TO_SHOW_IDS));
    const mapped = raw.map((s) => (categoryIds.has(s) ? s : COMEDY_SHOW_NAME_TO_CATEGORY[s])).filter(Boolean) as string[];
    setShowStyle(mapped);
  }, [household?.showStyle]);

  const [comedyNotes, setComedyNotes] = useState(household?.comedyNotes ?? "");
  const [emailNotifications, setEmailNotifications] = useState(notificationEmail);
  const [pushNotifications, setPushNotifications] = useState(notificationPush);
  const [notificationTimePref, setNotificationTimePref] = useState(notificationTime);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const saveComedyStyle = async (nextStyle: string[]) => {
    setComedySaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showStyle: nextStyle }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Comedy style saved" });
      router.refresh();
    } catch {
      toast({ title: "Failed to save comedy style", variant: "destructive" });
    } finally {
      setComedySaving(false);
    }
  };

  const toggleShowStyle = (id: string) => {
    const next = showStyle.includes(id)
      ? showStyle.filter((x) => x !== id)
      : showStyle.length < maxComedyPicks
        ? [...showStyle, id]
        : showStyle;
    setShowStyle(next);
    saveComedyStyle(next);
  };

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showTitle,
          showStyle,
          comedyNotes,
          notificationEmail: emailNotifications,
          notificationPush: pushNotifications,
          notificationTime: notificationTimePref || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Settings saved" });
      router.refresh();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Show title</CardTitle>
          <CardDescription>This appears on your show card and in episode metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={showTitle}
            onChange={(e) => setShowTitle(e.target.value)}
            placeholder="e.g. Life with Biscuit"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comedy style</CardTitle>
          <CardDescription>
            Pick {maxComedyPicks === 1 ? "1 style" : `1–${maxComedyPicks} styles`}. Saves when you tap a card. We match this vibe when writing episodes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {HUMOR_STYLE_OPTIONS.map((style) => {
              const selected = showStyle.includes(style.id);
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => toggleShowStyle(style.id)}
                  disabled={comedySaving}
                  className={`rounded-xl border-2 p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/50 disabled:opacity-60 ${
                    selected ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2" : "border-border bg-card"
                  }`}
                >
                  <span className="font-semibold">{style.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{style.subtitle}</span>
                </button>
              );
            })}
          </div>
          {comedySaving && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </p>
          )}
        </CardContent>
      </Card>

      <SettingsPhotosSection household={household} />

      <Card>
        <CardHeader>
          <CardTitle>Comedy notes</CardTitle>
          <CardDescription>Anything else about your vibe?</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={comedyNotes}
            onChange={(e) => setComedyNotes(e.target.value)}
            placeholder="e.g. dry humor, lots of sarcasm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Get notified when your daily episode is ready. Choose email and/or browser push.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Email me when my episode is ready (with thumbnail + link)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">Browser push notifications</span>
            </label>
            <PushSubscribeButton
              onSubscribed={() => {
                setPushNotifications(true);
                router.refresh();
              }}
              disabled={pushNotifications}
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred notification time</Label>
            <select
              value={notificationTimePref}
              onChange={(e) => setNotificationTimePref(e.target.value)}
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {NOTIFICATION_TIMES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              &quot;When episode is ready&quot; sends as soon as it’s done. Other options are for future daily digest.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save changes
      </Button>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger zone
          </CardTitle>
          <CardDescription>Delete your show and all episodes. This cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type &quot;delete&quot; to confirm</Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="delete"
              className="max-w-xs"
            />
          </div>
          <Button variant="destructive" disabled={deleteConfirm.toLowerCase() !== "delete"}>
            Delete show
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
