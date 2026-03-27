import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ScanReport } from "@/components/scanner/scan-report";

export default async function ScanReportPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { scanId } = await params;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <ScanReport scanId={scanId} />
      </div>
    </main>
  );
}
