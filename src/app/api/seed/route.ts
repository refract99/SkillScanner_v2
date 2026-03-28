import { api as _api } from "../../../../convex/_generated/api"; const api: any = _api;
/**
 * POST /api/seed
 *
 * Admin endpoint to trigger database seeding — scans 65 curated popular
 * AI agent skill repositories and stores results anonymously for comparison data.
 *
 * Protected by the SEED_SECRET environment variable (checked in Convex action).
 *
 * Usage:
 *   curl -X POST https://<host>/api/seed \
 *     -H "Content-Type: application/json" \
 *     -d '{"secret":"<SEED_SECRET>"}'
 */

import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(request: NextRequest) {
  let secret: string | undefined;
  try {
    const body = (await request.json()) as { secret?: string };
    secret = body.secret;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!secret) {
    return Response.json({ error: "Missing secret" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(convexUrl);

  try {
    const result = await convex.action(api.seed.triggerSeed, { secret });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unauthorized")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
