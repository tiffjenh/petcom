import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plans";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const [household, subscription] = await Promise.all([
    prisma.household.findUnique({ where: { userId: user.id } }),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
  ]);
  const limits = getPlanLimits(subscription?.plan);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Show settings</h1>
        <p className="text-muted-foreground">
          Edit your show title, comedy style, and preferences.
        </p>
      </div>
      <SettingsForm
        household={household}
        maxComedyPicks={limits.maxComedyStylePicks}
        notificationEmail={user.notificationEmail}
        notificationPush={user.notificationPush}
        notificationTime={user.notificationTime ?? ""}
      />
    </div>
  );
}
