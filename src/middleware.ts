import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/demo", "/sign-in", "/sign-up", "/api/webhooks", "/api/inngest", "/terms", "/privacy"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.match(new RegExp("^/sign-in|^/sign-up"))
  );
}

// When Clerk is not configured, skip it so / and /demo work. When configured, always run
// clerkMiddleware so auth() works in API routes and pages; only "public" routes skip auth.protect().
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!process.env.CLERK_SECRET_KEY) {
    if (isPublicPath(req.nextUrl.pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/demo", req.url));
  }

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRoute = createRouteMatcher([
    "/",
    "/demo",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/terms",
    "/privacy",
    "/api/webhooks/(.*)",
    "/api/inngest(.*)",
    // Only these preview routes are public (demo flow). /api/preview/start-pilot requires auth.
    "/api/preview/status/(.*)",
    "/api/preview/upload-photo",
  ]);
  const clerkHandler = clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) await auth.protect();
  });
  return clerkHandler(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|ico|svg|woff2?|ttf|eot)).*)",
    "/api/((?!webhooks|inngest).*)",
  ],
};
