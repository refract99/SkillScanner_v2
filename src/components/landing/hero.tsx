import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 pt-24 pb-20 text-center overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Free · No signup required to scan
      </div>

      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        Know what a skill does
        <br />
        <span className="text-muted-foreground">before you install it.</span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Comprehensive security scanning for AI agent skills and MCP servers.
        Catch prompt injection, data exfiltration, and supply chain attacks
        before they reach your machine.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/sign-up"
          className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Scan a Skill — Free
        </Link>
        <a
          href="#sample-report"
          className="inline-flex min-w-[160px] items-center justify-center rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          See a Sample Report
        </a>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Results in under 60 seconds · 8 threat categories · Tier 1 deterministic + AI analysis
      </p>
    </section>
  );
}
