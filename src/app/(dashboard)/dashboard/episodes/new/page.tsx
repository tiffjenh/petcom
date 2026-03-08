import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import { GenerateEpisodeButton } from "./generate-button";

export default async function NewEpisodePage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const household = await prisma.household.findUnique({
    where: { userId: user.id },
    include: { dogs: true },
  });

  if (!household || household.dogs.length === 0) {
    redirect("/onboarding");
  }

  const lastEpisode = await prisma.episode.findFirst({
    where: { householdId: household.id },
    orderBy: { episodeNum: "desc" },
  });
  const episodeNum = (lastEpisode?.episodeNum ?? 0) + 1;
  const season = lastEpisode?.season ?? 1;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate new episode
          </CardTitle>
          <CardDescription>
            We’ll create a ~5 minute Pixar-style sitcom episode starring your
            dog and cast. Episode #{episodeNum}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateEpisodeButton
            householdId={household.id}
            episodeNum={episodeNum}
            season={season}
          />
        </CardContent>
      </Card>
    </div>
  );
}
