import { ScannerForm } from "@/components/scanner/scanner-form";

// Auth is optional — anonymous scanning is supported.
// The scanner form handles auth state internally for rate limits and full reports.
export default function ScanPage() {
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
