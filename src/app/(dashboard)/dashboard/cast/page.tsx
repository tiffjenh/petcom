import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dog, Plus } from "lucide-react";
import { CastGrid } from "./cast-grid";

export default async function CastPage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const household = await prisma.household.findUnique({
    where: { userId: user.id },
    include: { dogs: true, castMembers: true },
  });

  const dogs = household?.dogs ?? [];
  const castMembers = household?.castMembers ?? [];
  const hasCast = dogs.length > 0 || castMembers.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cast</h1>
          <p className="text-muted-foreground">
            Your dog is the star; household members are supporting cast. Multiple dogs and cast members supported.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/onboarding">Edit cast</Link>
          </Button>
          <Button asChild>
            <Link href="/onboarding">
              <Plus className="mr-2 h-4 w-4" />
              Add dog or cast
            </Link>
          </Button>
        </div>
      </div>

      {!hasCast ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dog className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 font-medium">No cast yet</p>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Add your dog (main character) and optional household members (supporting cast) to start generating episodes.
            </p>
            <Button asChild>
              <Link href="/onboarding">Set up cast</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CastGrid dogs={dogs} castMembers={castMembers} />
      )}
    </div>
  );
}
