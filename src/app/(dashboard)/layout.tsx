import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Film, Users, Settings, CreditCard, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { PawCastLogo } from "@/components/shared/PawCastLogo";
import { Button } from "@/components/ui/button";
import { EpisodeRealtimeSubscriber } from "@/components/episode-realtime-subscriber";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getOrCreateSubscription } from "@/lib/clerk-user";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/episodes", label: "Episodes", icon: Film },
  { href: "/dashboard/cast", label: "Cast", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/account", label: "Account & Billing", icon: CreditCard },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Database not connected</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Add a valid <code className="rounded bg-muted px-1.5 py-0.5 text-sm">DATABASE_URL</code> to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.env.local</code> and restart the dev server. Use Supabase or any PostgreSQL provider.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          See <strong>docs/CONNECTING_SERVICES.md</strong> for step-by-step setup (Supabase, Clerk, Vercel).
        </p>
        <a href="/" className="mt-6 text-sm text-primary underline">Back to home</a>
      </div>
    );
  }
  await getOrCreateSubscription(dbUser.id);

  const dbUserWithHousehold = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { household: { select: { id: true } } },
  });
  const householdId = dbUserWithHousehold?.household?.id ?? null;

  return (
    <div className="min-h-screen bg-background flex">
      <EpisodeRealtimeSubscriber householdId={householdId} />
      {/* Left sidebar */}
      <aside className="hidden w-56 flex-shrink-0 border-r border-border bg-card md:block">
        <div className="sticky top-0 flex h-screen flex-col py-4">
          <Link href="/dashboard" className="mx-4 mb-6 font-heading">
            <PawCastLogo size={28} showWordmark />
          </Link>
          <nav className="flex-1 space-y-0.5 px-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border px-3 pt-4">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <UserButton afterSignOutUrl="/" />
              <span className="text-sm text-muted-foreground">Account</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header (no sidebar on small screens) */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur md:hidden">
          <Link href="/dashboard" className="font-heading">
            <PawCastLogo size={28} showWordmark />
          </Link>
          <nav className="flex flex-1 justify-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/episodes">Episodes</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/cast">Cast</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/settings">Settings</Link>
            </Button>
          </nav>
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
