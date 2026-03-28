/**
 * Database seeding — proactively scan popular AI agent skills.
 *
 * Scans 65 curated public repositories spanning every supported platform
 * (claude_code, cursor, windsurf, cline, mcp, openclaw) to populate the
 * comparison database before launch.
 *
 * All seed scans are anonymous (no userId) so they never appear in user
 * scan history but DO count toward stats and percentile rankings.
 *
 * Trigger via POST /api/seed with the correct SEED_SECRET header.
 */

import { v } from "convex/values";
import { action, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { parseGitHubUrl, fetchRepoFiles } from "./scanner/github";
import { detectPlatform } from "./scanner/platform";
import { runTier1 } from "./scanner/tier1";
import { runTier2 } from "./scanner/tier2";
import { calculateScore } from "./scanner/scoring";

// ---------------------------------------------------------------------------
// Curated seed list
// Repos are grouped by expected platform for visibility.
// Each entry is a canonical GitHub URL.
// ---------------------------------------------------------------------------

export const SEED_REPOS: string[] = [
  // ── Claude Code (CLAUDE.md) ───────────────────────────────────────────────
  "https://github.com/anthropics/anthropic-sdk-python",
  "https://github.com/anthropics/anthropic-sdk-typescript",
  "https://github.com/anthropics/claude-code",
  "https://github.com/anthropics/anthropic-cookbook",
  "https://github.com/anthropics/courses",
  "https://github.com/anthropics/model-context-protocol",
  "https://github.com/zed-industries/zed",
  "https://github.com/BerriAI/litellm",
  "https://github.com/continuedev/continue",
  "https://github.com/geekan/MetaGPT",
  "https://github.com/OpenDevin/OpenDevin",
  "https://github.com/Significant-Gravitas/AutoGPT",
  "https://github.com/langchain-ai/langchain",
  "https://github.com/crewAIInc/crewAI",
  "https://github.com/microsoft/autogen",
  "https://github.com/phidatahq/phidata",
  "https://github.com/e2b-dev/e2b",
  "https://github.com/imartinez/privateGPT",
  "https://github.com/lm-sys/FastChat",
  "https://github.com/openai/openai-python",

  // ── Cursor (.cursorrules / .cursor/rules) ─────────────────────────────────
  "https://github.com/PatrickJS/awesome-cursorrules",
  "https://github.com/abi/screenshot-to-code",
  "https://github.com/mckaywrigley/chatbot-ui",
  "https://github.com/shadcn-ui/ui",
  "https://github.com/vercel/ai",
  "https://github.com/t3-oss/create-t3-app",
  "https://github.com/calcom/cal.com",
  "https://github.com/lobehub/lobe-chat",
  "https://github.com/twentyhq/twenty",
  "https://github.com/supabase/supabase",
  "https://github.com/trpc/trpc",
  "https://github.com/prisma/prisma",
  "https://github.com/refinedev/refine",
  "https://github.com/nocobase/nocobase",
  "https://github.com/Nutlope/aicommits",
  "https://github.com/steven-tey/novel",
  "https://github.com/raycast/extensions",
  "https://github.com/expo/expo",
  "https://github.com/bluesky-social/social-app",
  "https://github.com/vercel/next.js",

  // ── MCP Servers (mcp.json / server.ts / server.py) ───────────────────────
  "https://github.com/modelcontextprotocol/servers",
  "https://github.com/modelcontextprotocol/python-sdk",
  "https://github.com/modelcontextprotocol/typescript-sdk",
  "https://github.com/modelcontextprotocol/inspector",
  "https://github.com/github/github-mcp-server",
  "https://github.com/punkpeye/awesome-mcp-servers",
  "https://github.com/wong2/awesome-mcp-servers",
  "https://github.com/anthropics/anthropic-mcp-server",
  "https://github.com/executed-protocol/mcp-server-brave-search",
  "https://github.com/MarkusPfundstein/mcp-obsidian",

  // ── Cline (.clinerules / cline_docs/) ────────────────────────────────────
  "https://github.com/cline/cline",
  "https://github.com/saoudrizwan/claude-dev",
  "https://github.com/RooCodeInc/Roo-Code",
  "https://github.com/nickscamara/open-deep-research",
  "https://github.com/Doriandarko/claude-engineer",

  // ── Windsurf (.windsurfrules) ─────────────────────────────────────────────
  "https://github.com/codeium-editor/windsurf-plugin-vscode",
  "https://github.com/Exafunction/codeium.vim",
  "https://github.com/Exafunction/codeium-react",
  "https://github.com/Exafunction/codeium.nvim",
  "https://github.com/Exafunction/codeium-chrome",

  // ── OpenClaw / multi-agent (AGENTS.md / SKILL.md) ────────────────────────
  "https://github.com/openai/swarm",
  "https://github.com/joaomdmoura/crewAI-examples",
  "https://github.com/assafelovic/gpt-researcher",
  "https://github.com/reworkd/AgentGPT",
  "https://github.com/TransformerOptimus/SuperAGI",
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export const getExistingRepoUrls = internalQuery({
  args: {},
  handler: async (ctx) => {
    const scans = await ctx.db.query("scans").collect();
    return scans.map((s) => s.repoUrl);
  },
});

export const insertSeedScan = internalMutation({
  args: {
    repoUrl: v.string(),
    repoOwner: v.string(),
    repoName: v.string(),
  },
  handler: async (ctx, { repoUrl, repoOwner, repoName }) => {
    return ctx.db.insert("scans", {
      repoUrl,
      repoOwner,
      repoName,
      status: "pending",
      createdAt: Date.now(),
      // No userId — anonymous seed scan
    });
  },
});

// ---------------------------------------------------------------------------
// Main seed action — runs the full pipeline for a single repo
// ---------------------------------------------------------------------------

export const runSeedScan = internalAction({
  args: { scanId: v.id("scans") },
  handler: async (ctx, { scanId }) => {
    await ctx.runMutation(internal.scans.updateScanStatus, {
      scanId,
      status: "running",
    });

    try {
      const scan = await ctx.runQuery(internal.scans.getScanInternal, { scanId });
      if (!scan) throw new Error("Scan record not found");

      const githubToken = process.env.GITHUB_TOKEN ?? undefined;
      const anthropicKey = process.env.ANTHROPIC_API_KEY ?? undefined;
      const openaiKey = process.env.OPENAI_API_KEY ?? undefined;

      const { files } = await fetchRepoFiles(scan.repoOwner, scan.repoName, githubToken);
      const platform = detectPlatform(files.map((f) => f.path));
      const tier1Findings = runTier1(files);
      const tier2Findings = await runTier2(files, anthropicKey, openaiKey);
      const { score, verdict } = calculateScore(tier1Findings, tier2Findings);

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

// ---------------------------------------------------------------------------
// Orchestrator — create scan records and schedule scans for uncanned repos
// ---------------------------------------------------------------------------

export const seedDatabase = internalAction({
  args: {},
  handler: async (ctx) => {
    const existingUrls = await ctx.runQuery(internal.seed.getExistingRepoUrls, {});
    const existing = new Set(existingUrls);

    let created = 0;
    let skipped = 0;
    let invalid = 0;

    for (const repoUrl of SEED_REPOS) {
      if (existing.has(repoUrl)) {
        skipped++;
        continue;
      }

      const parsed = parseGitHubUrl(repoUrl);
      if (!parsed) {
        invalid++;
        continue;
      }

      const scanId = await ctx.runMutation(internal.seed.insertSeedScan, {
        repoUrl,
        repoOwner: parsed.owner,
        repoName: parsed.repo,
      });

      // Schedule scans with a 500ms stagger to avoid GitHub rate-limit bursts
      await ctx.scheduler.runAfter(
        created * 500,
        internal.seed.runSeedScan,
        { scanId }
      );

      created++;
    }

    return { created, skipped, invalid, total: SEED_REPOS.length };
  },
});

// ---------------------------------------------------------------------------
// Public action — callable from the Next.js API route
// ---------------------------------------------------------------------------

export const triggerSeed: any = action({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    const expected = process.env.SEED_SECRET;
    if (!expected || secret !== expected) {
      throw new Error("Unauthorized");
    }
    return ctx.runAction(internal.seed.seedDatabase, {});
  },
});

// ---------------------------------------------------------------------------
// Status query — summary of seed progress
// ---------------------------------------------------------------------------

export const getSeedStatus: any = internalAction({
  args: {},
  handler: async (ctx) => {
    const existingUrls = await ctx.runQuery(internal.seed.getExistingRepoUrls, {});
    const existing = new Set(existingUrls);
    const seeded = SEED_REPOS.filter((url) => existing.has(url)).length;
    const pending = SEED_REPOS.length - seeded;
    return { seeded, pending, total: SEED_REPOS.length };
  },
});
