import { api } from "../../../../../convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

const ANON_LIMIT = 5;
const USER_LIMIT = 20;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { repoUrl } = body as { repoUrl?: string };
  if (!repoUrl || typeof repoUrl !== "string") {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
  }

  let clerkUserId: string | null = null;
  try {
    const authResult = await auth();
    clerkUserId = authResult?.userId ?? null;
  } catch {
    // Clerk auth not available — treat as anonymous
  }

  const ip = getClientIp(request);
  const convex = new ConvexHttpClient(convexUrl);

  // Resolve Convex userId for authenticated users
  let convexUserId: string | undefined;
  if (clerkUserId) {
    try {
      const user = await convex.query(api.users.getByClerkId, {
        clerkId: clerkUserId,
      });
      convexUserId = user?._id;
    } catch {
      // User not found in Convex — proceed as anonymous
    }
  }

  const limit = convexUserId ? USER_LIMIT : ANON_LIMIT;
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  const resetAt = (hourBucket + 1) * 3600;

  try {
    const result = await convex.mutation(api.scans.createScan, {
      repoUrl,
      userId: convexUserId as any,
      ip: convexUserId ? undefined : ip,
    });

    const remaining = result.rateLimitRemaining ?? limit;
    return NextResponse.json(
      { scanId: result.scanId },
      {
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(Math.max(0, remaining)),
          "X-RateLimit-Reset": String(resetAt),
        },
      }
    );
  } catch (err) {
    console.error("[scan/create] Convex error:", err);
    const message = err instanceof Error ? err.message : String(err);

    if (message && message.startsWith("RATE_LIMIT_EXCEEDED")) {
      const upgradeMessage = convexUserId
        ? "You've reached your 20 scans/hour limit. Upgrade for unlimited scans."
        : "You've reached the 5 scans/hour limit for anonymous users. Sign up for more scans.";
      return NextResponse.json(
        { error: upgradeMessage, code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetAt),
            "Retry-After": String(resetAt - Math.floor(Date.now() / 1000)),
          },
        }
      );
    }
    return NextResponse.json(
      { error: message || "Failed to create scan" },
      { status: 500 }
    );
  }
}
