import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ScanHistory } from "@/components/dashboard/scan-history";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const displayName =
    user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "there";

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Hello, {displayName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your scan history and security reports.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            New scan
          </Link>
        </div>

        {/* Scan history — client component for real-time updates */}
        <ScanHistory clerkId={userId} />
      </div>
    </main>
  );
}
