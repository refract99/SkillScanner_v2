import Link from "next/link";

export function CtaSection() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Start scanning for free
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          No credit card. No installation. Paste a GitHub URL and get a
          security report in under 60 seconds.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="inline-flex min-w-[180px] items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create free account
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex min-w-[180px] items-center justify-center rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Building a product that uses AI agent skills?{" "}
          <a
            href="mailto:steve@blocksentience.com"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Talk to us about org-wide audits.
          </a>
        </p>
      </div>
    </section>
  );
}
