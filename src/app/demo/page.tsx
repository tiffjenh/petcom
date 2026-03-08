import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PawCastLogo } from "@/components/shared/PawCastLogo";
import { DemoUploadAndPreview } from "./demo-upload-preview";

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
          This page is a <strong>preview only</strong>: you can upload a photo and see where your episode would show. It does not process or generate a video.
        </p>

        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          <strong>To get a real episode:</strong> Create an account, add your dog in the full app, and we’ll generate a ~5 min Pixar-style episode (usually ready in a few minutes). This demo does not run that pipeline.
        </div>

        <section className="mt-10 space-y-6">
          <h2 className="font-heading text-xl font-semibold">1. Upload a photo (preview only)</h2>
          <p className="text-sm text-muted-foreground">Your photo is shown here only. In the full app we use it to create your dog’s animated avatar and episode.</p>
          <DemoUploadAndPreview />
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-heading text-xl font-semibold">2. Where your episode would play</h2>
          <div className="overflow-hidden rounded-xl border-2 border-border bg-black shadow-lg">
            <div className="aspect-video flex flex-col items-center justify-center gap-3 text-white">
              <div className="rounded-full bg-primary/90 p-4">
                <svg className="h-10 w-10 fill-current" viewBox="0 0 24 24" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="font-medium">Sample episode</p>
              <p className="text-sm text-white/80 text-center max-w-sm">
                After you sign up and add your dog, we generate a real episode here (script, animation, voiceover). This box is a placeholder until then.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link href="/">Create an account to generate your first episode</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
