import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PawCastLogo } from "@/components/shared/PawCastLogo";
import { DemoTrailerFlow } from "./demo-trailer-flow";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream/90 via-background to-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-heading">
            <PawCastLogo size={36} showWordmark />
          </Link>
          <Button asChild variant="ghost">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Try PawCast — no account needed
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload photos of your dog and we&apos;ll generate a 30-second Pixar-style trailer. Watch it free, then optionally save your show with your email.
        </p>

        <section className="mt-10">
          <DemoTrailerFlow />
        </section>
      </main>
    </div>
  );
}
