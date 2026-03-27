const steps = [
  {
    number: "01",
    title: "Paste a GitHub URL",
    description:
      "Drop in the URL of any public GitHub repo — Claude Code skills, OpenClaw plugins, MCP servers, Cursor/Windsurf extensions.",
  },
  {
    number: "02",
    title: "AI Analysis Runs",
    description:
      "Our two-tier engine runs deterministic pattern checks instantly, then AI semantic analysis catches subtle prompt injection and exfiltration patterns.",
  },
  {
    number: "03",
    title: "Review Your Report",
    description:
      "Get a scored security report with every finding linked to exact file and line. Risk score, verdict, and plain-English remediation advice.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            From URL to security report in under 60 seconds.
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connector line — desktop only */}
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-border md:block" style={{ left: "16.67%", right: "16.67%" }} />

          {steps.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-sm font-bold font-mono text-muted-foreground">
                {step.number}
              </div>
              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
