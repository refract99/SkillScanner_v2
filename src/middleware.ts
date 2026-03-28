import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)|api/).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  try {
    const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");

    const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/scan/:scanId+"]);

    const clerkHandler = clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    });

    return await clerkHandler(req, {} as any);
  } catch (err) {
    console.error("[middleware] Clerk error:", err);
    return NextResponse.next();
  }
}
