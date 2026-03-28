"use client";
import { api as _api } from "../../../convex/_generated/api"; const api: any = _api;

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
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
  ClipboardCopy,
  ArrowRight,
  ExternalLink,
  Lock,
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

const GITHUB_URL_RE =
  /(?:https?:\/\/)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/;
const SHORTHAND_RE = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;

function isValidGitHubUrl(url: string): boolean {
  const cleaned = url.trim().replace(/\.git$/, "").replace(/\/$/, "");
  return GITHUB_URL_RE.test(cleaned) || SHORTHAND_RE.test(cleaned);
}

function detectPlatformLabel(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("claude") || lower.includes("anthropic")) return "Claude Code";
  if (lower.includes("cursor")) return "Cursor";
  if (lower.includes("windsurf")) return "Windsurf";
  if (lower.includes("cline")) return "Cline";
  if (lower.includes("openclaw")) return "OpenClaw";
  if (lower.includes("mcp")) return "MCP";
  return null;
}

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
  { label: string; color: string; bg: string; border: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  safe: {
    label: "Safe",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    Icon: ShieldCheck,
  },
  caution: {
    label: "Caution",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    Icon: Shield,
  },
  risky: {
    label: "Risky",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    Icon: ShieldAlert,
  },
  dangerous: {
    label: "Dangerous",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    Icon: AlertTriangle,
  },
};

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; dot: string }
> = {
  critical: { label: "Critical", color: "text-red-400", dot: "bg-red-500" },
  high: { label: "High", color: "text-orange-400", dot: "bg-orange-500" },
  medium: { label: "Medium", color: "text-yellow-400", dot: "bg-yellow-500" },
  low: { label: "Low", color: "text-blue-400", dot: "bg-blue-500" },
};

const PROGRESS_STEPS = [
  "Fetching repository files…",
  "Detecting platform…",
  "Running Tier 1 deterministic checks…",
  "Running AI analysis…",
  "Calculating risk score…",
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  // score is "higher = safer", so we flip for danger display
  const danger = 100 - clamped;
  let color = "text-green-400";
  let strokeColor = "#22c55e";
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

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-24">
        <svg className="size-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-border"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold tabular-nums", color)}>
            {clamped}
          </span>
          <span className="text-[10px] text-muted-foreground leading-none">
            /100
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Safety Score</span>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cfg = VERDICT_CONFIG[verdict];
  const { Icon } = cfg;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-4 py-2",
        cfg.bg,
        cfg.border
      )}
    >
      <Icon className={cn("size-5", cfg.color)} />
      <span className={cn("font-semibold text-sm", cfg.color)}>{cfg.label}</span>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const sev = SEVERITY_CONFIG[finding.severity];
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                sev.color
              )}
            >
              <span className={cn("size-1.5 rounded-full", sev.dot)} />
              {sev.label}
            </span>
            <span className="text-xs text-muted-foreground">{finding.category}</span>
            {finding.confidence === "deterministic" && (
              <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                Deterministic
              </span>
            )}
          </div>
          <p className="text-sm text-foreground">{finding.description}</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
            {finding.file}
            {finding.line != null && `:${finding.line}`}
          </p>
          {finding.evidence && (
            <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 rounded px-2 py-1 truncate">
              {finding.evidence}
            </p>
          )}
        </div>
      </div>
      {finding.remediation && (
        <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
          <span className="font-medium text-foreground">Fix:</span> {finding.remediation}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress indicator (while scanning)
// ---------------------------------------------------------------------------

function ScanProgress({ status }: { status: ScanStatus }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (status !== "running" && status !== "pending") return;
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
    }, 2800);
    return () => clearInterval(id);
  }, [status]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="relative">
        <Loader className="size-10 text-primary animate-spin" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>Scanning…</span>
          <span>{Math.round(((step + 1) / PROGRESS_STEPS.length) * 80)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{
              width: `${Math.round(((step + 1) / PROGRESS_STEPS.length) * 80)}%`,
            }}
          />
        </div>
        <p className="mt-3 text-sm text-center text-muted-foreground animate-pulse">
          {PROGRESS_STEPS[step]}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 w-full max-w-md">
        {PROGRESS_STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              i < step
                ? "text-foreground"
                : i === step
                ? "text-muted-foreground"
                : "text-muted-foreground/40"
            )}
          >
            {i < step ? (
              <CheckCircle className="size-3 text-green-500 shrink-0" />
            ) : i === step ? (
              <Loader className="size-3 animate-spin shrink-0" />
            ) : (
              <span className="size-3 rounded-full border border-current shrink-0" />
            )}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results display
// ---------------------------------------------------------------------------

function ScanResults({
  scan,
  findings,
  scanId,
  isSignedIn,
}: {
  scan: Scan;
  findings: Finding[];
  scanId: string;
  isSignedIn: boolean;
}) {
  const sortedFindings = [...findings].sort((a, b) => {
    const order: Severity[] = ["critical", "high", "medium", "low"];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });

  const previewFindings = sortedFindings.slice(0, 3);
  const hasMore = sortedFindings.length > 3;

  return (
    <div className="flex flex-col gap-6">
      {/* Score + Verdict row */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-10">
        {scan.score != null && <ScoreGauge score={scan.score} />}
        <div className="flex flex-col items-center gap-3">
          {scan.verdict && <VerdictBadge verdict={scan.verdict} />}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{scan.filesScanned ?? 0} files scanned</span>
            <span>·</span>
            <span>{findings.length} finding{findings.length !== 1 ? "s" : ""}</span>
            {scan.platform && (
              <>
                <span>·</span>
                <span>{PLATFORM_LABELS[scan.platform] ?? scan.platform}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Findings preview */}
      {sortedFindings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-6">
          <CheckCircle className="size-8 text-green-500" />
          <p className="text-sm font-medium text-green-400">No issues found</p>
          <p className="text-xs text-muted-foreground text-center">
            This repository passed all security checks.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Top Findings
          </h3>
          {previewFindings.map((f) => (
            <FindingRow key={f._id} finding={f} />
          ))}
        </div>
      )}

      {/* Full report CTA — gate behind auth */}
      {isSignedIn ? (
        <Link
          href={`/scan/${scanId}`}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {hasMore ? (
            <>
              View Full Report ({sortedFindings.length} findings)
              <ArrowRight className="size-4" />
            </>
          ) : (
            <>
              View Full Report
              <ExternalLink className="size-4" />
            </>
          )}
        </Link>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">
              Sign in to get your full report
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasMore
              ? `See all ${sortedFindings.length} findings, detailed remediation steps, and save to your scan history.`
              : "See detailed remediation steps and save this scan to your history."}
          </p>
          <Link
            href={`/sign-in?redirect_url=/scan/${scanId}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign in for free
            <ArrowRight className="size-4" />
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/sign-in?redirect_url=/scan/${scanId}`}
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ScannerForm component
// ---------------------------------------------------------------------------

function ScanDisplay({ scanId }: { scanId: string }) {
  const { isSignedIn } = useAuth();
  const scan = useQuery(api.scans.getScan, { scanId }) as Scan | null | undefined;
  const findings = useQuery(api.scans.getFindings, { scanId }) as Finding[] | undefined;

  if (scan === undefined || findings === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (scan === null) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-destructive">
        <AlertCircle className="size-8" />
        <p className="text-sm">Scan not found.</p>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Scan failed</p>
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          {scan.errorMessage ?? "An unexpected error occurred."}
        </p>
      </div>
    );
  }

  if (scan.status === "done") {
    return (
      <ScanResults
        scan={scan}
        findings={findings ?? []}
        scanId={scanId}
        isSignedIn={!!isSignedIn}
      />
    );
  }

  return <ScanProgress status={scan.status} />;
}

export function ScannerForm() {
  const [url, setUrl] = useState("");
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const valid = isValidGitHubUrl(url);
  const platformHint = url ? detectPlatformLabel(url) : null;

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
    } catch {
      // Clipboard access denied — silently ignore
    }
  }, []);

  const handleScan = useCallback(async () => {
    if (!valid || isStarting) return;
    setError(null);
    setIsRateLimited(false);
    setIsStarting(true);
    try {
      const res = await fetch("/api/scan/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url.trim() }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setIsRateLimited(true);
        setError(data.error ?? "Rate limit reached. Please try again later.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Failed to start scan.");
        return;
      }
      setScanId(data.scanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan.");
    } finally {
      setIsStarting(false);
    }
  }, [valid, isStarting, url]);

  const handleReset = useCallback(() => {
    setScanId(null);
    setError(null);
    setIsRateLimited(false);
    setUrl("");
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Input area — always visible */}
      {!scanId && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 ring-1 ring-transparent focus-within:ring-ring focus-within:border-ring transition-all">
              {/* URL input */}
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                  setIsRateLimited(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && valid) handleScan();
                }}
                placeholder="https://github.com/owner/repo  or  owner/repo"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
                autoFocus
              />

              {/* Platform badge */}
              {platformHint && (
                <span className="shrink-0 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary font-medium">
                  {platformHint}
                </span>
              )}

              {/* Paste button */}
              <button
                type="button"
                onClick={handlePaste}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Paste from clipboard"
              >
                <ClipboardCopy className="size-4" />
              </button>
            </div>

            {/* Validation feedback */}
            {url && !valid && (
              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3" />
                Enter a valid GitHub URL (e.g. https://github.com/owner/repo)
              </p>
            )}
            {error && !isRateLimited && (
              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="size-3" />
                {error}
              </p>
            )}
          </div>

          {/* Rate limit banner */}
          {isRateLimited && (
            <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-primary shrink-0" />
                <p className="text-sm font-semibold text-foreground">Scan limit reached</p>
              </div>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Link
                href="/sign-up"
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Sign up for free
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}

          <Button
            onClick={handleScan}
            disabled={!valid || isStarting}
            size="lg"
            className="w-full"
          >
            {isStarting ? (
              <>
                <Loader className="size-4 animate-spin" />
                Starting scan…
              </>
            ) : (
              "Scan Repository"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Free · Anonymous scans supported · Results in under 60 seconds
          </p>
        </div>
      )}

      {/* Scan in progress / results */}
      {scanId && (
        <div className="flex flex-col gap-4">
          {/* Repo header */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {url.replace(/^https?:\/\/github\.com\//, "")}
              </p>
              <p className="text-xs text-muted-foreground">github.com</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Scan another
            </button>
          </div>

          <ScanDisplay scanId={scanId} />
        </div>
      )}
    </div>
  );
}
