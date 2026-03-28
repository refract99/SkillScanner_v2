"use client";
import { api as _api } from "../../../convex/_generated/api"; const api: any = _api;

import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Loader,
  File,
  Clock,
  BarChart3,
  ExternalLink,
  Printer,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirrors convex schema)
// ---------------------------------------------------------------------------

type ScanStatus = "pending" | "running" | "done" | "failed";
type Verdict = "safe" | "caution" | "risky" | "dangerous";
type Severity = "critical" | "high" | "medium" | "low";
type Confidence = "deterministic" | "high" | "medium" | "low";

interface Scan {
  _id: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  platform?: string;
  status: ScanStatus;
  errorMessage?: string;
  score?: number;
  verdict?: Verdict;
  filesScanned?: number;
  tier1FindingCount?: number;
  tier2FindingCount?: number;
  createdAt: number;
  completedAt?: number;
}

interface Finding {
  _id: string;
  tier: 1 | 2 | 3;
  category: string;
  severity: Severity;
  confidence: Confidence;
  file: string;
  line?: number;
  evidence: string;
  description: string;
  remediation?: string;
}

interface ComparisonData {
  percentile: number;
  totalScans: number;
  averageScore: number;
  platform: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  cursor: "Cursor",
  windsurf: "Windsurf",
  cline: "Cline",
  openclaw: "OpenClaw",
  mcp: "MCP",
  unknown: "Unknown",
};

const VERDICT_CONFIG: Record<
  Verdict,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  safe: {
    label: "Safe",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    description: "No significant security concerns detected.",
    Icon: ShieldCheck,
  },
  caution: {
    label: "Caution",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    description: "Minor issues detected. Review before installing.",
    Icon: Shield,
  },
  risky: {
    label: "Risky",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    description: "Significant security concerns found. Use with caution.",
    Icon: ShieldAlert,
  },
  dangerous: {
    label: "Dangerous",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    description: "Critical security issues detected. Do not install.",
    Icon: AlertTriangle,
  },
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; dot: string; border: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-500/10",
    dot: "bg-red-500",
    border: "border-red-500/20",
  },
  high: {
    label: "High",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    dot: "bg-orange-500",
    border: "border-orange-500/20",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    dot: "bg-yellow-500",
    border: "border-yellow-500/20",
  },
  low: {
    label: "Low",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    dot: "bg-blue-500",
    border: "border-blue-500/20",
  },
};

// Scoring constants (mirrors convex/scanner/scoring.ts)
const DEDUCTIONS: Record<number, Record<string, number>> = {
  1: { critical: 30, high: 20, medium: 10 },
  2: { critical: 20, high: 12, medium: 6, low: 3 },
};

const CONFIDENCE_MULTIPLIER: Record<string, number> = {
  deterministic: 1.0,
  high: 1.0,
  medium: 0.5,
  low: 0.25,
};

const MAX_DEDUCTION_PER_CATEGORY = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** Derive per-category score breakdowns from the findings list. */
function computeCategoryScores(
  findings: Finding[]
): { category: string; score: number; findingCount: number; maxSeverity: Severity | null }[] {
  const categories = new Map<
    string,
    { deduction: number; count: number; severities: Severity[] }
  >();

  for (const f of findings) {
    const tier = f.tier as 1 | 2;
    const deductionTable = DEDUCTIONS[tier];
    if (!deductionTable) continue;

    const base = deductionTable[f.severity] ?? 0;
    const multiplier = CONFIDENCE_MULTIPLIER[f.confidence] ?? 0.5;
    const deduction = tier === 1 ? base : base * multiplier;

    const existing = categories.get(f.category) ?? { deduction: 0, count: 0, severities: [] };
    categories.set(f.category, {
      deduction: existing.deduction + deduction,
      count: existing.count + 1,
      severities: [...existing.severities, f.severity],
    });
  }

  return Array.from(categories.entries())
    .map(([category, { deduction, count, severities }]) => {
      const capped = Math.min(deduction, MAX_DEDUCTION_PER_CATEGORY);
      const score = Math.round(Math.max(0, 100 - capped));
      const maxSeverity = (["critical", "high", "medium", "low"] as Severity[]).find(
        (s) => severities.includes(s)
      ) ?? null;
      return { category, score, findingCount: count, maxSeverity };
    })
    .sort((a, b) => a.score - b.score);
}

/** Derive plain-English recommendations from the top finding categories. */
function generateRecommendations(findings: Finding[]): string[] {
  const categories = new Set(findings.map((f) => f.category));
  const recs: string[] = [];

  if (categories.has("Code Injection")) {
    recs.push(
      "Remove or replace dynamic code execution patterns (eval, exec, new Function). Prefer safer alternatives that do not evaluate arbitrary strings as code."
    );
  }
  if (categories.has("Obfuscation")) {
    recs.push(
      "Eliminate invisible Unicode characters and homoglyph substitutions from the codebase. Use a linter rule to flag zero-width characters, and audit any string obfuscation patterns."
    );
  }
  if (categories.has("Memory Poisoning")) {
    recs.push(
      "Remove any writes to shell startup files (.bashrc, .zshrc) or agent instruction files (CLAUDE.md, AGENTS.md). Skills should not persist state across sessions by modifying system files."
    );
  }
  if (categories.has("Credential Access")) {
    recs.push(
      "Do not read or transmit credential files (AWS keys, SSH keys, API tokens). Request only the minimum required permissions and document them clearly in the skill's README."
    );
  }
  if (categories.has("Prompt Injection")) {
    recs.push(
      "Remove hidden or camouflaged instructions that could hijack the AI agent. Avoid conditional triggers and role-assumption patterns that bypass safety guidelines."
    );
  }
  if (categories.has("Data Exfiltration")) {
    recs.push(
      "Audit all outbound HTTP requests and remove any calls that send environment variables or credential data to external endpoints. Log all network activity transparently."
    );
  }
  if (categories.has("Dangerous Operations")) {
    recs.push(
      "Scope destructive operations (rm -rf, DROP DATABASE) to safe directories or test environments only, and require explicit user confirmation before executing them."
    );
  }
  if (categories.has("Supply Chain")) {
    recs.push(
      "Pin all dependencies to specific versions or commit hashes, use official package registries, and verify integrity hashes. Avoid piping remote scripts directly into a shell."
    );
  }

  if (recs.length === 0) {
    recs.push("No specific remediation required. Continue following secure coding practices.");
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreGauge({ score, size = "lg" }: { score: number; size?: "lg" | "sm" }) {
  const clamped = Math.max(0, Math.min(100, score));
  const danger = 100 - clamped;
  let strokeColor = "#22c55e"; // green
  let textColor = "text-green-400";
  if (danger >= 60) { strokeColor = "#ef4444"; textColor = "text-red-400"; }
  else if (danger >= 40) { strokeColor = "#f97316"; textColor = "text-orange-400"; }
  else if (danger >= 20) { strokeColor = "#eab308"; textColor = "text-yellow-400"; }

  const radius = size === "lg" ? 52 : 38;
  const sw = size === "lg" ? 10 : 8;
  const center = radius + sw;
  const dim = center * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative", size === "lg" ? "size-32" : "size-24")}>
      <svg
        className="size-full -rotate-90"
        viewBox={`0 0 ${dim} ${dim}`}
      >
        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={sw} className="text-border" />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold tabular-nums", textColor, size === "lg" ? "text-3xl" : "text-xl")}>
          {clamped}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function CategoryScoreBar({
  category,
  score,
  findingCount,
  maxSeverity,
}: {
  category: string;
  score: number;
  findingCount: number;
  maxSeverity: Severity | null;
}) {
  const danger = 100 - score;
  let barColor = "bg-green-500";
  if (danger >= 60) barColor = "bg-red-500";
  else if (danger >= 40) barColor = "bg-orange-500";
  else if (danger >= 20) barColor = "bg-yellow-500";

  const sev = maxSeverity ? SEVERITY_CONFIG[maxSeverity] : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{category}</span>
          {sev && (
            <span className={cn("text-xs rounded-full px-2 py-0.5", sev.color, sev.bg)}>
              {sev.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>{findingCount} {findingCount === 1 ? "issue" : "issues"}</span>
          <span className="font-mono font-semibold text-foreground">{score}</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const sev = SEVERITY_CONFIG[finding.severity];
  return (
    <div className={cn("rounded-xl border bg-card p-5", sev.border)}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", sev.color, sev.bg)}>
          <span className={cn("size-1.5 rounded-full", sev.dot)} />
          {sev.label}
        </span>
        <span className="text-xs font-medium text-muted-foreground border border-border rounded-full px-2.5 py-1">
          {finding.category}
        </span>
        <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-1">
          Tier {finding.tier}
        </span>
        {finding.confidence === "deterministic" ? (
          <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1">
            Deterministic
          </span>
        ) : (
          <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-1">
            AI ({finding.confidence} confidence)
          </span>
        )}
      </div>

      <p className="text-sm text-foreground mb-3">{finding.description}</p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <File className="size-3 shrink-0" />
        <span className="font-mono truncate">
          {finding.file}{finding.line != null && `:${finding.line}`}
        </span>
      </div>

      {finding.evidence && (
        <div className="rounded-md bg-muted/50 border border-border px-3 py-2 mb-3">
          <p className="text-xs font-mono text-muted-foreground break-all">{finding.evidence}</p>
        </div>
      )}

      {finding.remediation && (
        <div className="rounded-md bg-green-500/5 border border-green-500/20 px-3 py-2">
          <p className="text-xs text-green-400">
            <span className="font-semibold">Fix: </span>{finding.remediation}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PublicReport({ scanId }: { scanId: string }) {
  const scan = useQuery(api.scans.getScan, { scanId }) as Scan | null | undefined;
  const findings = useQuery(api.scans.getFindings, { scanId }) as Finding[] | undefined;
  const comparison = useQuery(api.scans.getComparisonData, { scanId }) as ComparisonData | null | undefined;

  if (scan === undefined || findings === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="size-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (scan === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-lg font-semibold">Report not found</p>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to SkillScanner
        </Link>
      </div>
    );
  }

  if (scan.status !== "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <Loader className="size-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Scan in progress — check back shortly.</p>
      </div>
    );
  }

  const sortedFindings = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
  const bySeverity = SEVERITY_ORDER.reduce((acc, sev) => {
    acc[sev] = sortedFindings.filter((f) => f.severity === sev);
    return acc;
  }, {} as Record<Severity, Finding[]>);

  const top3 = sortedFindings.slice(0, 3);
  const verdictCfg = scan.verdict ? VERDICT_CONFIG[scan.verdict] : null;
  const categoryScores = computeCategoryScores(findings);
  const recommendations = generateRecommendations(findings);
  const duration = scan.completedAt != null
    ? formatDuration(scan.completedAt - scan.createdAt)
    : null;

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page-break { page-break-before: always; }
          * { color-scheme: light; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Header bar */}
        <div className="no-print flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <Shield className="size-4" />
            SkillScanner
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Printer className="size-3.5" />
              Save as PDF
            </button>
            <Link
              href={`/scan/${scanId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="size-3.5" />
              Full report
            </Link>
          </div>
        </div>

        {/* Repo header */}
        <div className="rounded-xl border border-border bg-card px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-foreground">
                {scan.repoOwner}/{scan.repoName}
              </p>
              <a
                href={scan.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mt-0.5"
              >
                {scan.repoUrl}
                <ExternalLink className="size-3" />
              </a>
            </div>
            <div className="text-right text-xs text-muted-foreground shrink-0">
              <p>Scanned {formatDate(scan.createdAt)}</p>
              {duration && (
                <p className="inline-flex items-center gap-1 mt-0.5">
                  <Clock className="size-3" />
                  {duration}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {scan.platform && (
              <span>Platform: <span className="text-foreground">{PLATFORM_LABELS[scan.platform] ?? scan.platform}</span></span>
            )}
            <span>Files scanned: <span className="text-foreground">{scan.filesScanned ?? "—"}</span></span>
            <span>Total findings: <span className="text-foreground">{findings.length}</span></span>
          </div>
        </div>

        {/* Score + Verdict */}
        <div className="rounded-xl border border-border bg-card px-6 py-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
            {scan.score != null && <ScoreGauge score={scan.score} />}
            {verdictCfg && scan.verdict && (
              <div className="flex flex-col gap-2 flex-1">
                <div className={cn("inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 self-start", verdictCfg.bg, verdictCfg.border)}>
                  <verdictCfg.Icon className={cn("size-5", verdictCfg.color)} />
                  <span className={cn("text-lg font-bold", verdictCfg.color)}>{verdictCfg.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{verdictCfg.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                  <span>Tier 1 (deterministic): <span className="text-foreground">{scan.tier1FindingCount ?? 0}</span></span>
                  <span>·</span>
                  <span>Tier 2 (AI): <span className="text-foreground">{scan.tier2FindingCount ?? 0}</span></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top 3 findings summary */}
        {top3.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="size-4 text-orange-400" />
              Top Findings
            </h2>
            <div className="flex flex-col gap-3">
              {top3.map((f) => {
                const sev = SEVERITY_CONFIG[f.severity];
                return (
                  <div key={f._id} className={cn("flex items-start gap-3 rounded-lg border p-4 bg-card", sev.border)}>
                    <span className={cn("size-2 rounded-full mt-1.5 shrink-0", sev.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={cn("text-xs font-semibold", sev.color)}>{sev.label}</span>
                        <span className="text-xs text-muted-foreground">{f.category}</span>
                      </div>
                      <p className="text-sm text-foreground">{f.description}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                        {f.file}{f.line != null && `:${f.line}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Category breakdown */}
        {categoryScores.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Category Breakdown
            </h2>
            <div className="rounded-xl border border-border bg-card px-6 py-5 flex flex-col gap-5">
              {categoryScores.map((cs) => (
                <CategoryScoreBar
                  key={cs.category}
                  category={cs.category}
                  score={cs.score}
                  findingCount={cs.findingCount}
                  maxSeverity={cs.maxSeverity}
                />
              ))}
            </div>
          </section>
        )}

        {/* Comparison */}
        {comparison != null && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Comparison
            </h2>
            <div className="rounded-xl border border-border bg-card px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex flex-col items-center sm:items-start gap-1">
                  <span className="text-4xl font-bold tabular-nums text-primary">{comparison.percentile}%</span>
                  <span className="text-sm text-muted-foreground">
                    Safer than <span className="text-foreground">{comparison.percentile}%</span> of {PLATFORM_LABELS[comparison.platform] ?? comparison.platform} skills
                  </span>
                </div>
                <div className="flex-1 h-px sm:h-auto sm:w-px bg-border" />
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-wide mb-1">Database</p>
                    <p className="text-foreground font-semibold">{comparison.totalScans.toLocaleString()} scans</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide mb-1">Avg Score</p>
                    <p className="text-foreground font-semibold">{comparison.averageScore} / 100</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide mb-1">This Skill</p>
                    <p className="text-foreground font-semibold">{scan.score} / 100</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* All findings */}
        {sortedFindings.length > 0 ? (
          <section className="print-page-break">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="size-4 text-primary" />
              All Findings ({findings.length})
            </h2>
            <div className="flex flex-col gap-8">
              {SEVERITY_ORDER.filter((sev) => bySeverity[sev].length > 0).map((sev) => {
                const cfg = SEVERITY_CONFIG[sev];
                return (
                  <section key={sev}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={cn("size-2.5 rounded-full", cfg.dot)} />
                      <h3 className={cn("text-sm font-semibold", cfg.color)}>
                        {cfg.label} ({bySeverity[sev].length})
                      </h3>
                    </div>
                    <div className="flex flex-col gap-4">
                      {bySeverity[sev].map((f) => (
                        <FindingCard key={f._id} finding={f} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-8">
            <CheckCircle className="size-10 text-green-500" />
            <p className="font-semibold text-green-400">No issues found</p>
            <p className="text-sm text-muted-foreground text-center">
              This repository passed all checks across {scan.filesScanned ?? 0} files.
            </p>
          </div>
        )}

        {/* Recommendations */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="size-4 text-green-400" />
            Recommendations
          </h2>
          <div className="rounded-xl border border-border bg-card px-6 py-5">
            <ol className="flex flex-col gap-4">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-muted-foreground leading-relaxed">{rec}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border">
          <p>
            Generated by{" "}
            <Link href="/" className="text-foreground hover:underline">
              SkillScanner
            </Link>{" "}
            · {formatDate(scan.createdAt)}
          </p>
          <p className="mt-1 no-print">
            <Link href={`/scan`} className="hover:underline">
              Scan your own skill →
            </Link>
          </p>
        </footer>
      </div>
    </>
  );
}
