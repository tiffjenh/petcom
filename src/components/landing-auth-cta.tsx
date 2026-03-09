"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

function useHasClerk(): boolean {
  const [hasClerk, setHasClerk] = useState(false);
  useEffect(() => {
    setHasClerk(document.body.getAttribute("data-has-clerk") === "true");
  }, []);
  return hasClerk;
}

/** Auth-dependent CTA: when Clerk is not configured, show "Try demo" link. */
export function LandingAuthCta() {
  const hasClerk = useHasClerk();
  if (!hasClerk) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Button asChild size="lg" className="text-base">
          <Link href="/demo">Try it now — no account</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Upload a photo and watch a sample video.</p>
      </div>
    );
  }
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="lg" className="text-base">
            Create Your Show — Free
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Button asChild size="lg" className="text-base">
          <Link href="/demo">Try Demo — Free</Link>
        </Button>
      </SignedIn>
    </>
  );
}

export function LandingHeaderAuth() {
  const hasClerk = useHasClerk();
  if (!hasClerk) {
    return (
      <Button asChild variant="ghost">
        <Link href="/demo">Try demo</Link>
      </Button>
    );
  }
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="ghost">Sign in</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </SignedIn>
    </>
  );
}
