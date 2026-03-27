import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

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

  const { userId: clerkUserId } = await auth();
  const ip = getClientIp(request);
  const convex = new ConvexHttpClient(convexUrl);

  // Resolve Convex userId for authenticated users
  let convexUserId: string | undefined;
  if (clerkUserId) {
    const user = await convex.query(anyApi.users.getByClerkId, {
      clerkId: clerkUserId,
    });
    convexUserId = user?._id;
  }

  const limit = convexUserId ? USER_LIMIT : ANON_LIMIT;
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  const resetAt = (hourBucket + 1) * 3600;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: { scanId: string; rateLimitRemaining: number | null };
  try {
    // anyApi is untyped; cast args to any to avoid generated-type dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = await convex.mutation(anyApi.scans.createScan, {
      repoUrl,
      userId: convexUserId,
      ip: convexUserId ? undefined : ip,
    } as any);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("RATE_LIMIT_EXCEEDED")) {
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
}
