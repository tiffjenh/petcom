import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/demo", "/sign-in", "/sign-up", "/api/webhooks", "/api/inngest", "/terms", "/privacy"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.match(new RegExp("^/sign-in|^/sign-up"))
  );
}

// Never load Clerk when the key is missing so / and /demo work without config.
export default async function middleware(req: Request) {
  const url = new URL(req.url);
  if (isPublicPath(url.pathname)) return NextResponse.next();
  if (!process.env.CLERK_SECRET_KEY) return NextResponse.redirect(new URL("/demo", req.url));
  const { authMiddleware } = await import("@clerk/nextjs/server");
  return authMiddleware({
    publicRoutes: [
      "/",
      "/demo",
      "/sign-in(.*)",
      "/sign-up(.*)",
      "/terms",
      "/privacy",
      "/api/webhooks/(.*)",
      "/api/inngest(.*)",
    ],
  })(req);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|ico|svg|woff2?|ttf|eot)).*)",
    "/api/((?!webhooks|inngest).*)",
  ],
};
