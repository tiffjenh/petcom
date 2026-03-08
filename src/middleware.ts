import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/demo", "/sign-in", "/sign-up", "/api/webhooks", "/api/inngest", "/terms", "/privacy"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.match(new RegExp("^/sign-in|^/sign-up"))
  );
}

// Never load Clerk when the key is missing so / and /demo work without config.
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isPublicPath(req.nextUrl.pathname)) return NextResponse.next();
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.redirect(new URL("/demo", req.url));
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
