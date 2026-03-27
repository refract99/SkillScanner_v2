import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-3 text-sm font-bold">SkillScanner</div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The trust engine for AI agent skills. Free scanning that builds
              a threat intelligence database.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Part of{" "}
              <a
                href="https://adversarialminds.com"
                className="underline underline-offset-4 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Adversarial Minds
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Product
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/scan" className="text-muted-foreground hover:text-foreground">
                  Scan a skill
                </Link>
              </li>
              <li>
                <a href="#sample-report" className="text-muted-foreground hover:text-foreground">
                  Sample report
                </a>
              </li>
              <li>
                <a href="#threat-categories" className="text-muted-foreground hover:text-foreground">
                  Threat categories
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Company
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://blocksentience.com"
                  className="text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Blocksentience
                </a>
              </li>
              <li>
                <a
                  href="https://adversarialminds.com"
                  className="text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Adversarial Minds newsletter
                </a>
              </li>
              <li>
                <a
                  href="mailto:steve@blocksentience.com"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Adversarial Minds</span>
          <span>Built by Blocksentience</span>
        </div>
      </div>
    </footer>
  );
}
