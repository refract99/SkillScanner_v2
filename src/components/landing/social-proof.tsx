"use client";
import { api as _api } from "../../../convex/_generated/api"; const api: any = _api;

import { useQuery } from "convex/react";
// @ts-ignore

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function SocialProof() {
  const stats = useQuery(api.scans.getStats);

  const scanned = stats?.totalScanned ?? 0;
  const critical = stats?.criticalFindings ?? 0;

  return (
    <section className="border-y border-border bg-muted/20 px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-8 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Live stats
        </p>
        <div className="flex items-center justify-center gap-16">
          <StatBox
            value={scanned.toLocaleString()}
            label="skills scanned"
          />
          <div className="h-12 w-px bg-border" />
          <StatBox
            value={critical.toLocaleString()}
            label="critical issues found"
          />
        </div>
      </div>
    </section>
  );
}
