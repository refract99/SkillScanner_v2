import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ScannerForm } from "@/components/scanner/scanner-form";

export default async function ScanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Scan a Repository</h1>
          <p className="mt-3 text-muted-foreground">
            Paste a GitHub URL to scan an AI agent skill or MCP server for
            security risks.
          </p>
        </div>

        <ScannerForm />
      </div>
    </main>
  );
}
