"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Show, SignInButton } from "@clerk/react";
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
      <Show when="signed-out">
        <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
          <Button size="lg" className="text-base">
            Create Your Show — Free
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Button asChild size="lg" className="text-base">
          <Link href="/demo">Try Demo — Free</Link>
        </Button>
      </Show>
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
      <Show when="signed-out">
        <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
          <Button variant="ghost">Sign in</Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </Show>
    </>
  );
}
