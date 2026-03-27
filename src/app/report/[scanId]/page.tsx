import type { Metadata } from "next";
import { PublicReport } from "@/components/report/public-report";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ scanId: string }>;
}): Promise<Metadata> {
  const { scanId } = await params;
  return {
    title: `Security Report — SkillScanner`,
    description: `View the full security scan report for this AI agent skill or MCP server.`,
    openGraph: {
      title: `Security Report — SkillScanner`,
      description: `Full security analysis report. Powered by SkillScanner.`,
    },
  };
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;

  return (
    <main className="min-h-screen bg-background">
      <PublicReport scanId={scanId} />
    </main>
  );
}
