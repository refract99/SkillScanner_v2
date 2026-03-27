/**
 * Convex scan lifecycle — create, query, and execute scans.
 *
 * Flow:
 *   1. Client calls createScan mutation → record created, action scheduled
 *   2. runScanAction action wakes up:
 *      a. Fetches repo files from GitHub API
 *      b. Detects platform
 *      c. Runs Tier 1 deterministic checks
 *      d. Calculates score
 *      e. Persists findings
 *      f. Updates scan to done/failed
 *   3. Client subscribes to getScan query for real-time updates
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { parseGitHubUrl, fetchRepoFiles } from "./scanner/github";
import { detectPlatform } from "./scanner/platform";
import { runTier1 } from "./scanner/tier1";
import { runTier2 } from "./scanner/tier2";
import { calculateScore } from "./scanner/scoring";

// ---------------------------------------------------------------------------
// Mutations — called from the client
// ---------------------------------------------------------------------------

/**
 * Create a new scan and schedule the scan action.
 * Validates the GitHub URL before writing anything.
 */
export const createScan = mutation({
  args: {
    repoUrl: v.string(),
    // Optional: pass the Convex user ID if the caller is authenticated
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { repoUrl, userId }) => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      throw new Error(
        "Invalid GitHub URL. Expected format: https://github.com/owner/repo"
      );
    }

    const scanId = await ctx.db.insert("scans", {
      userId,
      repoUrl,
      repoOwner: parsed.owner,
      repoName: parsed.repo,
      status: "pending",
      createdAt: Date.now(),
    });

    // Fire-and-forget: the action runs asynchronously
    await ctx.scheduler.runAfter(0, internal.scans.runScanAction, { scanId });

    return scanId;
  },
});

// ---------------------------------------------------------------------------
// Queries — real-time subscriptions from the client
// ---------------------------------------------------------------------------

export const getScan = query({
  args: { scanId: v.id("scans") },
  handler: async (ctx, { scanId }) => {
    return ctx.db.get(scanId);
  },
});

export const getFindings = query({
  args: { scanId: v.id("scans") },
  handler: async (ctx, { scanId }) => {
    return ctx.db
      .query("findings")
      .withIndex("by_scan", (q) => q.eq("scanId", scanId))
      .collect();
  },
});

export const getUserScans = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("scans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allScans = await ctx.db.query("scans").collect();
    const doneScans = allScans.filter((s) => s.status === "done");
    const totalScanned = doneScans.length;

    // Count critical findings across all done scans
    const criticalFindings = await ctx.db
      .query("findings")
      .collect()
      .then((fs) => fs.filter((f) => f.severity === "critical").length);

    return { totalScanned, criticalFindings };
  },
});

// ---------------------------------------------------------------------------
// Internal mutations — called only from actions
// ---------------------------------------------------------------------------

export const updateScanStatus = internalMutation({
  args: {
    scanId: v.id("scans"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed")
    ),
    platform: v.optional(v.string()),
    score: v.optional(v.number()),
    verdict: v.optional(
      v.union(
        v.literal("safe"),
        v.literal("caution"),
        v.literal("risky"),
        v.literal("dangerous")
      )
    ),
    filesScanned: v.optional(v.number()),
    tier1FindingCount: v.optional(v.number()),
    tier2FindingCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { scanId, ...fields } = args;
    const patch: Record<string, unknown> = { ...fields };
    if (args.status === "done" || args.status === "failed") {
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(scanId, patch);
  },
});

export const insertFindings = internalMutation({
  args: {
    scanId: v.id("scans"),
    findings: v.array(
      v.object({
        tier: v.union(v.literal(1), v.literal(2), v.literal(3)),
        category: v.string(),
        severity: v.union(
          v.literal("critical"),
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        confidence: v.union(
          v.literal("deterministic"),
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        file: v.string(),
        line: v.optional(v.number()),
        evidence: v.string(),
        description: v.string(),
        remediation: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { scanId, findings }) => {
    for (const finding of findings) {
      await ctx.db.insert("findings", { scanId, ...finding });
    }
  },
});

// ---------------------------------------------------------------------------
// Internal action — the scan pipeline
// ---------------------------------------------------------------------------

export const runScanAction = internalAction({
  args: { scanId: v.id("scans") },
  handler: async (ctx, { scanId }) => {
    // Mark running
    await ctx.runMutation(internal.scans.updateScanStatus, {
      scanId,
      status: "running",
    });

    try {
      // Load the scan record
      const scan = await ctx.runQuery(internal.scans.getScanInternal, { scanId });
      if (!scan) throw new Error("Scan record not found");

      // Optional API keys from environment
      const githubToken = process.env.GITHUB_TOKEN ?? undefined;
      const anthropicKey = process.env.ANTHROPIC_API_KEY ?? undefined;
      const openaiKey = process.env.OPENAI_API_KEY ?? undefined;

      // 1. Fetch repo files via GitHub API
      const { files } = await fetchRepoFiles(
        scan.repoOwner,
        scan.repoName,
        githubToken
      );

      // 2. Detect platform
      const platform = detectPlatform(files.map((f) => f.path));

      // 3. Run Tier 1 deterministic checks
      const tier1Findings = runTier1(files);

      // 4. Run Tier 2 AI analysis
      const tier2Findings = await runTier2(files, anthropicKey, openaiKey);

      // 5. Calculate combined score
      const { score, verdict } = calculateScore(tier1Findings, tier2Findings);

      // 6. Persist all findings
      const tier1Payload = tier1Findings.map((f) => ({
        tier: 1 as const,
        category: f.category,
        severity: f.severity,
        confidence: "deterministic" as const,
        file: f.file,
        line: f.line,
        evidence: f.evidence,
        description: f.description,
        remediation: f.remediation,
      }));

      const tier2Payload = tier2Findings.map((f) => ({
        tier: 2 as const,
        category: f.category,
        severity: f.severity,
        confidence: f.confidence,
        file: f.file,
        line: f.line,
        evidence: f.evidence,
        description: f.description,
        remediation: f.remediation,
      }));

      await ctx.runMutation(internal.scans.insertFindings, {
        scanId,
        findings: [...tier1Payload, ...tier2Payload],
      });

      // 7. Mark done
      await ctx.runMutation(internal.scans.updateScanStatus, {
        scanId,
        status: "done",
        platform,
        score,
        verdict,
        filesScanned: files.length,
        tier1FindingCount: tier1Findings.length,
        tier2FindingCount: tier2Findings.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.scans.updateScanStatus, {
        scanId,
        status: "failed",
        errorMessage: message.slice(0, 500),
      });
    }
  },
});

/**
 * Link an anonymous scan to an authenticated user.
 * Called when an authenticated user views a scan for the first time.
 * No-ops if the scan is already linked.
 */
export const linkScanToUser = mutation({
  args: {
    scanId: v.id("scans"),
    userId: v.id("users"),
  },
  handler: async (ctx, { scanId, userId }) => {
    const scan = await ctx.db.get(scanId);
    if (!scan || scan.userId != null) return;
    await ctx.db.patch(scanId, { userId });
  },
});

// Internal query used by the action to load the scan record.
export const getScanInternal = internalQuery({
  args: { scanId: v.id("scans") },
  handler: async (ctx, { scanId }) => {
    return ctx.db.get(scanId);
  },
});

// ---------------------------------------------------------------------------
// Comparison data — percentile ranking vs other scans of the same platform
// ---------------------------------------------------------------------------

/**
 * Returns percentile ranking for a completed scan against other scans of the
 * same platform.  "Safer than X%" means X% of same-platform scans scored lower.
 *
 * Returns null when there aren't enough comparable scans (< 2).
 */
export const getComparisonData = query({
  args: { scanId: v.id("scans") },
  handler: async (ctx, { scanId }) => {
    const scan = await ctx.db.get(scanId);
    if (!scan || scan.status !== "done" || scan.score == null) return null;

    const samePlatform = await ctx.db
      .query("scans")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .collect()
      .then((rows) =>
        rows.filter((s) => s.platform === scan.platform && s.score != null)
      );

    if (samePlatform.length < 2) return null;

    const lowerCount = samePlatform.filter((s) => s.score! < scan.score!).length;
    const percentile = Math.round((lowerCount / samePlatform.length) * 100);
    const averageScore = Math.round(
      samePlatform.reduce((sum, s) => sum + s.score!, 0) / samePlatform.length
    );

    return {
      percentile,
      totalScans: samePlatform.length,
      averageScore,
      platform: scan.platform ?? "unknown",
    };
  },
});
