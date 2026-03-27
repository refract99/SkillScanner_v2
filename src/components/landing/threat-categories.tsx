const categories = [
  {
    tier: 1,
    name: "Code Injection",
    icon: "⚡",
    description: "eval(), exec(), reverse shells, dynamic code loading",
    badge: "Hard Stop",
  },
  {
    tier: 1,
    name: "Obfuscation",
    icon: "🔀",
    description: "Zero-width chars, multi-layer encoding, homoglyphs",
    badge: "Hard Stop",
  },
  {
    tier: 1,
    name: "Memory Poisoning",
    icon: "💾",
    description: "Writes to CLAUDE.md, .bashrc, or other persistent agent config",
    badge: "Hard Stop",
  },
  {
    tier: 1,
    name: "Credential Access",
    icon: "🔑",
    description: "Reads ~/.aws/credentials, SSH keys, env vars with secrets",
    badge: "Hard Stop",
  },
  {
    tier: 2,
    name: "Prompt Injection",
    icon: "🎭",
    description: "Instruction overrides, role jailbreaks, encoded commands",
    badge: "AI Analysis",
  },
  {
    tier: 2,
    name: "Data Exfiltration",
    icon: "📡",
    description: "Outbound calls with tokens, DNS exfil, covert channels",
    badge: "AI Analysis",
  },
  {
    tier: 2,
    name: "Dangerous Operations",
    icon: "💥",
    description: "rm -rf, sudo chmod 777, destructive commands in context",
    badge: "AI Analysis",
  },
  {
    tier: 2,
    name: "Supply Chain",
    icon: "📦",
    description: "curl | bash, untrusted npm installs, force flags",
    badge: "AI Analysis",
  },
];

const badgeStyles: Record<string, string> = {
  "Hard Stop": "border-red-500/30 bg-red-500/10 text-red-400",
  "AI Analysis": "border-purple-500/30 bg-purple-500/10 text-purple-400",
};

export function ThreatCategories() {
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">8 threat categories</h2>
          <p className="mt-3 text-muted-foreground">
            Tier 1 runs deterministic pattern matching. Tier 2 uses AI semantic analysis.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80 hover:bg-card/80"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="text-2xl">{cat.icon}</span>
                <span
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badgeStyles[cat.badge]}`}
                >
                  {cat.badge}
                </span>
              </div>
              <h3 className="mb-1.5 font-semibold">{cat.name}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{cat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
