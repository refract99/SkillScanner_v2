import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET ?? "";

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name?: string | null;
  last_name?: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Clerk sends svix-* headers; standardwebhooks uses webhook-* headers —
  // the signing algorithm is identical so we remap them.
  const headers: Record<string, string> = {
    "webhook-id": request.headers.get("svix-id") ?? "",
    "webhook-timestamp": request.headers.get("svix-timestamp") ?? "",
    "webhook-signature": request.headers.get("svix-signature") ?? "",
  };

  if (webhookSecret) {
    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(rawBody, headers);
    } catch {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  }

  let event: ClerkWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "user.created" && event.type !== "user.updated") {
    return NextResponse.json({ ok: true });
  }

  const { id: clerkId, email_addresses, first_name, last_name } = event.data;
  const primaryEmail = email_addresses?.[0]?.email_address;
  if (!primaryEmail) {
    return NextResponse.json({ error: "No email address" }, { status: 400 });
  }

  const name = [first_name, last_name].filter(Boolean).join(" ") || undefined;

  const convex = new ConvexHttpClient(convexUrl);
  await convex.mutation(anyApi.users.upsertUser, { clerkId, email: primaryEmail, name });

  return NextResponse.json({ ok: true });
}
