import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/clerk-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import { createCheckoutSession, createFamilyCheckoutSession } from "../billing/actions";

export default async function AccountPage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";
  const isFamily = subscription?.plan === "family" && subscription?.status === "active";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Account & Billing</h1>
        <p className="text-muted-foreground">
          Current plan, renewal date, and invoice history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            {isPro ? "Pro" : isFamily ? "Family" : "Free"}
            {subscription?.renewsAt && (
              <> · Renews {new Date(subscription.renewsAt).toLocaleDateString()}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className={`rounded-lg border p-4 ${!isPro && !isFamily ? "border-primary/50" : ""}`}>
              <p className="font-semibold">Free</p>
              <p className="text-2xl font-bold">$0</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 1 dog, 2 cast</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 3 episodes/week</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 7-day archive</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 1 comedy style</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 3 avatar regens total</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Social sharing</li>
              </ul>
              {!isPro && !isFamily && (
                <Button className="mt-4 w-full" variant="outline" disabled>Current plan</Button>
              )}
            </div>
            <div className={`rounded-lg border p-4 ${isPro ? "border-primary/50" : ""}`}>
              <p className="font-semibold">Pro</p>
              <p className="text-2xl font-bold">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 3 dogs, 6 cast</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Daily episodes (7/week)</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited archive</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 3 comedy styles</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> HD download, no watermark</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 10 avatar regens/month</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority generation</li>
              </ul>
              {isPro ? (
                <Button className="mt-4 w-full" disabled>Current plan</Button>
              ) : (
                <form action={createCheckoutSession} className="mt-4">
                  <Button type="submit" className="w-full">Upgrade to Pro</Button>
                </form>
              )}
            </div>
            <div className={`rounded-lg border p-4 ${isFamily ? "border-primary/50" : ""}`}>
              <p className="font-semibold">Family</p>
              <p className="text-2xl font-bold">$19.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 6 dogs, 12 cast</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Daily episodes, unlimited archive</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 3 comedy styles</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> HD download, no watermark</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited avatar regens</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority generation</li>
              </ul>
              {isFamily ? (
                <Button className="mt-4 w-full" disabled>Current plan</Button>
              ) : (
                <form action={createFamilyCheckoutSession} className="mt-4">
                  <Button type="submit" variant="outline" className="w-full">
                    Upgrade to Family
                  </Button>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
          <CardDescription>View and download past invoices from your Stripe customer portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Stripe customer portal for invoice history is available after your first paid subscription. Contact support for help.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
