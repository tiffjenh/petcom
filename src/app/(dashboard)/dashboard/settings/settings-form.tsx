"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Household } from "@prisma/client";
import { PushSubscribeButton } from "@/components/push-subscribe-button";

const COMEDY_SHOWS = [
  "Modern Family",
  "Friends",
  "Parks and Recreation",
  "Brooklyn Nine-Nine",
  "The Office",
  "Schitt's Creek",
  "What We Do in the Shadows",
  "Abbott Elementary",
  "It's Always Sunny",
  "New Girl",
];

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
  const [showTitle, setShowTitle] = useState(household?.showTitle ?? "");
  const [showStyle, setShowStyle] = useState<string[]>(household?.showStyle ?? []);
  const [comedyNotes, setComedyNotes] = useState(household?.comedyNotes ?? "");
  const [emailNotifications, setEmailNotifications] = useState(notificationEmail);
  const [pushNotifications, setPushNotifications] = useState(notificationPush);
  const [notificationTimePref, setNotificationTimePref] = useState(notificationTime);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const toggleShowStyle = (s: string) => {
    setShowStyle((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < maxComedyPicks ? [...prev, s] : prev
    );
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
          <CardDescription>Pick {maxComedyPicks === 1 ? "1 show" : `1–${maxComedyPicks} shows`}. We match this vibe when writing episodes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {COMEDY_SHOWS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleShowStyle(s)}
                className={`rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-colors ${
                  showStyle.includes(s) ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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
