import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { createCheckoutSession } from "./actions";

export default async function BillingPage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription. Pro gets daily episodes and more.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={!isPro ? "border-primary/50" : ""}>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>1 dog, 3 episodes per week</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-2xl font-bold">$0</p>
            <ul className="mb-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                1 dog, 1 owner
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                3 episodes per week
              </li>
            </ul>
            {isPro ? (
              <Button disabled>Current plan</Button>
            ) : (
              <Button variant="outline" disabled>
                Current plan
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={isPro ? "border-primary/50" : ""}>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>Daily episodes, multiple dogs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-2xl font-bold">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            <ul className="mb-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Daily episodes
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Multiple dogs & family
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                HD, no ads
              </li>
            </ul>
            {isPro ? (
              <Button disabled>Current plan</Button>
            ) : (
              <form action={createCheckoutSession}>
                <Button type="submit">Upgrade to Pro</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
