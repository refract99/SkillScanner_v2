import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
      <h1 className="text-5xl font-bold tracking-tight">SkillScanner</h1>
      <p className="text-xl text-muted-foreground max-w-xl">
        Paste a GitHub URL. Get a security audit in 60 seconds.
        Free scanning for AI agent skills and MCP servers.
      </p>
      <div className="flex gap-4">
        <Link
          href="/scan"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start Scanning
        </Link>
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
