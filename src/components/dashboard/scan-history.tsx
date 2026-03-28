"use client";
import { api as _api } from "../../../convex/_generated/api"; const api: any = _api;

import { useState } from "react";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  AlertTriangle,
  Loader,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Verdict = "safe" | "caution" | "risky" | "dangerous";
type SortKey = "createdAt" | "score" | "platform";
type SortDir = "asc" | "desc";

interface Scan {
  _id: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  platform?: string;
  status: string;
  score?: number;
  verdict?: Verdict;
  filesScanned?: number;
  tier1FindingCount?: number;
  tier2FindingCount?: number;
  createdAt: number;
  completedAt?: number;
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
  { label: string; color: string; bg: string; border: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  safe: { label: "Safe", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", Icon: ShieldCheck },
  caution: { label: "Caution", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", Icon: Shield },
  risky: { label: "Risky", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", Icon: ShieldAlert },
  dangerous: { label: "Dangerous", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", Icon: AlertTriangle },
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SortButton({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {active ? (
        dir === "desc" ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />
      ) : (
        <ChevronDown className="size-3 opacity-30" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ScanHistoryList — loaded when convexUserId is known
// ---------------------------------------------------------------------------

function ScanHistoryList({ convexUserId }: { convexUserId: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scans = useQuery(api.scans.getUserScans, { userId: convexUserId as any }) as Scan[] | undefined;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (scans === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const donescans = scans.filter((s) => s.status === "done");

  if (donescans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Shield className="size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No scans yet</p>
        <p className="text-xs text-muted-foreground/60">
          Scan a repository to see results here.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Scan a repository
        </Link>
      </div>
    );
  }

  const sorted = [...donescans].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "createdAt") cmp = a.createdAt - b.createdAt;
    else if (sortKey === "score") cmp = (a.score ?? -1) - (b.score ?? -1);
    else if (sortKey === "platform") cmp = (a.platform ?? "").localeCompare(b.platform ?? "");
    return sortDir === "desc" ? -cmp : cmp;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Sort controls */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-xs text-muted-foreground mr-1">Sort by:</span>
        <SortButton label="Date" sortKey="createdAt" current={sortKey} dir={sortDir} onClick={handleSort} />
        <SortButton label="Score" sortKey="score" current={sortKey} dir={sortDir} onClick={handleSort} />
        <SortButton label="Platform" sortKey="platform" current={sortKey} dir={sortDir} onClick={handleSort} />
        <span className="ml-auto text-xs text-muted-foreground">{donescans.length} scan{donescans.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Rows */}
      {sorted.map((scan) => {
        const verdictCfg = scan.verdict ? VERDICT_CONFIG[scan.verdict] : null;
        const findingCount = (scan.tier1FindingCount ?? 0) + (scan.tier2FindingCount ?? 0);
        return (
          <Link
            key={scan._id}
            href={`/scan/${scan._id}`}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/30"
          >
            {/* Verdict icon */}
            {verdictCfg ? (
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full border", verdictCfg.bg, verdictCfg.border)}>
                <verdictCfg.Icon className={cn("size-5", verdictCfg.color)} />
              </div>
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30">
                <Shield className="size-5 text-muted-foreground" />
              </div>
            )}

            {/* Repo info */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {scan.repoOwner}/{scan.repoName}
              </p>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>{formatDate(scan.createdAt)}</span>
                {scan.platform && (
                  <span>{PLATFORM_LABELS[scan.platform] ?? scan.platform}</span>
                )}
                <span>{findingCount} finding{findingCount !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Score */}
            <div className="shrink-0 text-right">
              {scan.score != null && (
                <p className={cn("text-xl font-bold tabular-nums", verdictCfg?.color ?? "text-foreground")}>
                  {scan.score}
                </p>
              )}
              {verdictCfg && (
                <p className={cn("text-xs", verdictCfg.color)}>{verdictCfg.label}</p>
              )}
            </div>

            <ExternalLink className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScanHistory — resolves the Convex user ID from the Clerk ID
// ---------------------------------------------------------------------------

export function ScanHistory({ clerkId }: { clerkId: string }) {
  const convexUser = useQuery(api.users.getByClerkId, { clerkId }) as
    | { _id: string }
    | null
    | undefined;

  if (convexUser === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (convexUser === null) {
    // User hasn't been created in Convex yet (webhook not fired or first visit)
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Shield className="size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No scans yet</p>
        <p className="text-xs text-muted-foreground/60">
          Scan a repository to see results here.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Scan a repository
        </Link>
      </div>
    );
  }

  return <ScanHistoryList convexUserId={convexUser._id} />;
}
