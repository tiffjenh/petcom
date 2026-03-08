import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PawCastLogo } from "@/components/shared/PawCastLogo";
import { LandingAuthCta, LandingHeaderAuth } from "@/components/landing-auth-cta";
import { Film, Play } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream/90 via-background to-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-heading">
            <PawCastLogo size={36} showWordmark />
          </Link>
          <LandingHeaderAuth />
        </div>
      </header>

      {/* Hero: animated preview + tagline */}
      <section className="container mx-auto px-4 pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-black shadow-2xl">
            {/* Animated preview: add hero-preview.mp4 (30s loop) to /public for real clip */}
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-amber-900/30 flex items-center justify-center">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/90">
                <div className="rounded-full bg-primary/90 p-5 shadow-xl">
                  <Play className="h-12 w-12 fill-current" />
                </div>
                <span className="text-sm font-medium">Preview: Your dog&apos;s show</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-sm font-medium text-white/90">Sample episode · Your dog, animated</p>
            </div>
          </div>
          <p className="mt-8 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Your dog deserves their own show.
          </p>
          <p className="mt-4 text-center text-lg text-muted-foreground">
            A Pixar-style sitcom starring your dog. New episode every day. Share to TikTok & Reels.
          </p>
          <div className="mt-10 flex justify-center">
            <LandingAuthCta />
          </div>
        </div>
      </section>

      {/* Example episodes (mock) */}
      <section className="border-t border-border/50 bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-2xl font-bold">See what others are watching</h2>
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Life with Biscuit", ep: "S1 E4", label: "The Great Sofa Heist" },
              { title: "Max & Co.", ep: "S1 E2", label: "Park Day Drama" },
              { title: "Luna's House", ep: "S1 E7", label: "Dinner Table Chaos" },
            ].map((show) => (
              <div
                key={show.title}
                className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-video bg-muted" />
                <div className="p-3">
                  <p className="font-medium">{show.title}</p>
                  <p className="text-sm text-muted-foreground">{show.ep} · {show.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-2xl font-bold">Simple pricing</h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold">Free</h3>
              <p className="mt-2 text-2xl font-bold">$0</p>
              <p className="mt-1 text-sm text-muted-foreground">1 dog, 3 episodes/week</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>1 dog, 2 cast members</li>
                <li>Share to social</li>
              </ul>
              <LandingAuthCta />
            </div>
            <div className="rounded-xl border-2 border-primary bg-primary/5 p-6">
              <p className="text-xs font-medium uppercase text-primary">Popular</p>
              <h3 className="font-semibold">Pro</h3>
              <p className="mt-2 text-2xl font-bold">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="mt-1 text-sm text-muted-foreground">Daily episodes</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>Up to 4 dogs, 6 cast</li>
                <li>New episode every day</li>
                <li>HD, no ads</li>
              </ul>
              <Button asChild className="mt-6 w-full">
                <Link href="/demo">Try demo</Link>
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold">Family</h3>
              <p className="mt-2 text-2xl font-bold">$14.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="mt-1 text-sm text-muted-foreground">Everything in Pro, more</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>Multiple households</li>
                <li>Priority generation</li>
              </ul>
              <Button asChild className="mt-6 w-full" variant="outline">
                <Link href="/dashboard/account">Contact us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} PawCast</p>
          <nav className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
