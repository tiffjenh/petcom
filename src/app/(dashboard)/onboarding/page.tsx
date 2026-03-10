import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plans";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const [existingHousehold, subscription] = await Promise.all([
    prisma.household.findUnique({
      where: { userId: user.id },
      include: { dogs: true, castMembers: true },
    }),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
  ]);
  const planLimits = getPlanLimits(subscription?.plan);

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold">Create your show</h1>
        <p className="text-muted-foreground">
          Your dog is the main character (with an inner monologue). Add your dog and optional household members as supporting cast. Pick the TV comedy styles you want—we’ll match that vibe every day.
        </p>
      </div>
      <OnboardingForm user={user} existingHousehold={existingHousehold} planLimits={planLimits} />
    </div>
  );
}
