"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Dog, User, MoreVertical, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";
import type { Dog as DbDog, CastMember } from "@prisma/client";

type Props = {
  dogs: DbDog[];
  castMembers: CastMember[];
};

export function CastGrid({ dogs, castMembers }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [regenId, setRegenId] = useState<string | null>(null);

  const deleteDog = async (id: string) => {
    if (!confirm("Remove this dog from your cast?")) return;
    try {
      const res = await fetch(`/api/cast/dog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Dog removed" });
      router.refresh();
    } catch {
      toast({ title: "Could not remove", variant: "destructive" });
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Remove this cast member?")) return;
    try {
      const res = await fetch(`/api/cast/member/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Cast member removed" });
      router.refresh();
    } catch {
      toast({ title: "Could not remove", variant: "destructive" });
    }
  };

  const regenerateDogAvatar = async (id: string) => {
    setRegenId(id);
    try {
      const res = await fetch(`/api/cast/dog/${id}/regenerate-avatar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402) {
          toast({ title: "Limit reached", description: data.message ?? "Upgrade for more regenerations.", variant: "destructive" });
          return;
        }
        throw new Error(data.message ?? "Failed");
      }
      toast({ title: "Avatar updated" });
      router.refresh();
    } catch (e) {
      toast({ title: "Could not regenerate", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setRegenId(null);
    }
  };

  const regenerateMemberAvatar = async (id: string) => {
    setRegenId(id);
    try {
      const res = await fetch(`/api/cast/member/${id}/regenerate-avatar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402) {
          toast({ title: "Limit reached", description: data.message ?? "Upgrade for more regenerations.", variant: "destructive" });
          return;
        }
        throw new Error(data.message ?? "Failed");
      }
      toast({ title: "Avatar updated" });
      router.refresh();
    } catch (e) {
      toast({ title: "Could not regenerate", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setRegenId(null);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {dogs.map((dog) => (
        <Card key={dog.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="mb-2 flex h-24 w-24 overflow-hidden rounded-lg bg-muted">
                <img
                  src={dog.animatedAvatar ?? dog.photoUrl}
                  alt={dog.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/onboarding">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => regenerateDogAvatar(dog.id)}
                    disabled={regenId === dog.id}
                  >
                    {regenId === dog.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Re-generate avatar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteDog(dog.id)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Dog className="h-4 w-4" />
              {dog.name}
            </CardTitle>
            <CardDescription>{dog.breed || "Dog"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {dog.personality.map((tag) => (
                <span key={tag} className="rounded bg-muted px-2 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {castMembers.map((member) => (
        <Card key={member.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="mb-2 flex h-24 w-24 overflow-hidden rounded-lg bg-muted">
                <img
                  src={member.animatedAvatar ?? member.photoUrl}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/onboarding">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => regenerateMemberAvatar(member.id)}
                    disabled={regenId === member.id}
                  >
                    {regenId === member.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Re-generate avatar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteMember(member.id)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-4 w-4" />
              {member.name}
            </CardTitle>
            <CardDescription>{member.role}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
