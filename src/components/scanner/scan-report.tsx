"use client";

import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
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
  ArrowLeft,
  Clock,
  File,
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

// ---------------------------------------------------------------------------
// Helpers
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
  { label: string; color: string; bg: string; dot: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-500/10",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    dot: "bg-blue-500",
  },
};

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

// ---------------------------------------------------------------------------
// Score Gauge
// ---------------------------------------------------------------------------

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  let color = "text-green-400";
  let strokeColor = "#22c55e";
  const danger = 100 - clamped;
  if (danger >= 75) {
    color = "text-red-400";
    strokeColor = "#ef4444";
  } else if (danger >= 50) {
    color = "text-orange-400";
    strokeColor = "#f97316";
  } else if (danger >= 25) {
    color = "text-yellow-400";
    strokeColor = "#eab308";
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative size-32">
      <svg className="size-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-border"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold tabular-nums", color)}>
          {clamped}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finding Detail Card
// ---------------------------------------------------------------------------

function FindingCard({ finding }: { finding: Finding }) {
  const sev = SEVERITY_CONFIG[finding.severity];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            sev.color,
            sev.bg
          )}
        >
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
          {finding.file}
          {finding.line != null && `:${finding.line}`}
        </span>
      </div>

      {finding.evidence && (
        <div className="rounded-md bg-muted/50 border border-border px-3 py-2 mb-3">
          <p className="text-xs font-mono text-muted-foreground break-all">
            {finding.evidence}
          </p>
        </div>
      )}

      {finding.remediation && (
        <div className="rounded-md bg-green-500/5 border border-green-500/20 px-3 py-2">
          <p className="text-xs text-green-400">
            <span className="font-semibold">Remediation:</span>{" "}
            {finding.remediation}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ScanReport component
// ---------------------------------------------------------------------------

export function ScanReport({ scanId }: { scanId: string }) {
  const scan = useQuery(anyApi.scans.getScan, { scanId }) as Scan | null | undefined;
  const findings = useQuery(anyApi.scans.getFindings, { scanId }) as Finding[] | undefined;

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
        <p className="text-lg font-semibold">Scan not found</p>
        <Link
          href="/scan"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to scanner
        </Link>
      </div>
    );
  }

  const sortedFindings = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  // Group findings by severity
  const bySeverity = SEVERITY_ORDER.reduce(
    (acc, sev) => {
      acc[sev] = sortedFindings.filter((f) => f.severity === sev);
      return acc;
    },
    {} as Record<Severity, Finding[]>
  );

  const verdictCfg = scan.verdict ? VERDICT_CONFIG[scan.verdict] : null;

  const duration =
    scan.completedAt != null
      ? formatDuration(scan.completedAt - scan.createdAt)
      : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Back link */}
      <Link
        href="/scan"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        New scan
      </Link>

      {/* Repo header */}
      <div className="rounded-xl border border-border bg-card px-6 py-5">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-foreground">
            {scan.repoOwner}/{scan.repoName}
          </p>
          <p className="text-sm text-muted-foreground break-all">{scan.repoUrl}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {scan.platform && (
            <span>
              Platform:{" "}
              <span className="text-foreground">
                {PLATFORM_LABELS[scan.platform] ?? scan.platform}
              </span>
            </span>
          )}
          <span>
            Files scanned:{" "}
            <span className="text-foreground">{scan.filesScanned ?? "—"}</span>
          </span>
          <span>
            Findings:{" "}
            <span className="text-foreground">{findings.length}</span>
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {duration}
            </span>
          )}
          <span>
            Scanned:{" "}
            <span className="text-foreground">{formatDate(scan.createdAt)}</span>
          </span>
        </div>
      </div>

      {/* Score + Verdict */}
      {scan.status === "done" && (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10 rounded-xl border border-border bg-card px-6 py-8">
          {scan.score != null && <ScoreGauge score={scan.score} />}
          {verdictCfg && scan.verdict && (
            <div className="flex flex-col gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-5 py-2.5",
                  verdictCfg.bg,
                  verdictCfg.border
                )}
              >
                <verdictCfg.Icon className={cn("size-5", verdictCfg.color)} />
                <span className={cn("text-lg font-bold", verdictCfg.color)}>
                  {verdictCfg.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {verdictCfg.description}
              </p>
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span>
                  Tier 1:{" "}
                  <span className="text-foreground">
                    {scan.tier1FindingCount ?? 0} issues
                  </span>
                </span>
                <span>·</span>
                <span>
                  Tier 2 (AI):{" "}
                  <span className="text-foreground">
                    {scan.tier2FindingCount ?? 0} issues
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Failed state */}
      {scan.status === "failed" && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8">
          <AlertCircle className="size-10 text-destructive" />
          <p className="font-semibold text-destructive">Scan failed</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {scan.errorMessage ?? "An unexpected error occurred during the scan."}
          </p>
        </div>
      )}

      {/* Pending/running state */}
      {(scan.status === "pending" || scan.status === "running") && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8">
          <Loader className="size-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Scan in progress…</p>
        </div>
      )}

      {/* No findings */}
      {scan.status === "done" && sortedFindings.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-8">
          <CheckCircle className="size-10 text-green-500" />
          <p className="font-semibold text-green-400">No issues found</p>
          <p className="text-sm text-muted-foreground text-center">
            This repository passed all security checks across {scan.filesScanned ?? 0} files.
          </p>
        </div>
      )}

      {/* Findings grouped by severity */}
      {sortedFindings.length > 0 && (
        <div className="flex flex-col gap-8">
          {SEVERITY_ORDER.filter((sev) => bySeverity[sev].length > 0).map(
            (sev) => {
              const cfg = SEVERITY_CONFIG[sev];
              return (
                <section key={sev}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={cn("size-2.5 rounded-full", cfg.dot)} />
                    <h2 className={cn("text-sm font-semibold", cfg.color)}>
                      {cfg.label} ({bySeverity[sev].length})
                    </h2>
                  </div>
                  <div className="flex flex-col gap-4">
                    {bySeverity[sev].map((f) => (
                      <FindingCard key={f._id} finding={f} />
                    ))}
                  </div>
                </section>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
