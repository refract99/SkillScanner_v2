import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// @clerk/nextjs v7 imports AsyncLocalStorage from node:async_hooks, which is
// not available in the Edge runtime. Running middleware in Node.js runtime
// gives full Node.js API access and fixes MIDDLEWARE_INVOCATION_FAILED.
export const runtime = "nodejs";

// /scan (the form) is public — anonymous scanning is supported.
// /scan/:scanId (full report) requires auth to view.
// /dashboard requires auth.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/scan/.+"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
