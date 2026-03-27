import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// @clerk/nextjs v7 uses AsyncLocalStorage (node:async_hooks) which is
// unavailable in Edge runtime. Node.js runtime is required.
export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/scan/.+"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});
