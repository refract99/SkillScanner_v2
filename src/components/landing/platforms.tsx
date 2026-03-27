const platforms = [
  { name: "Claude Code", abbr: "CC" },
  { name: "OpenClaw", abbr: "OC" },
  { name: "Cursor", abbr: "CU" },
  { name: "Windsurf", abbr: "WS" },
  { name: "Cline", abbr: "CL" },
  { name: "MCP", abbr: "MCP" },
];

export function Platforms() {
  return (
    <section className="border-y border-border bg-muted/30 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Supports all major agentic platforms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold font-mono text-muted-foreground">
                {p.abbr.length <= 2 ? p.abbr : p.abbr.slice(0, 3)}
              </span>
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
