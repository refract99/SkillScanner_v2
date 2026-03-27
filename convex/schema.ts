import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  scans: defineTable({
    // null for anonymous scans
    userId: v.optional(v.id("users")),
    repoUrl: v.string(),
    repoOwner: v.string(),
    repoName: v.string(),
    // Detected platform: claude_code, openclaw, cursor, windsurf, cline, mcp, unknown
    platform: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    // 0–100; higher is safer
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
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  rateLimits: defineTable({
    // "ip:{ip}" for anonymous users, "user:{userId}" for authenticated
    key: v.string(),
    // Math.floor(Date.now() / (1000 * 60 * 60)) — resets each hour
    hourBucket: v.number(),
    count: v.number(),
  }).index("by_key_bucket", ["key", "hourBucket"]),

  findings: defineTable({
    scanId: v.id("scans"),
    tier: v.union(v.literal(1), v.literal(2), v.literal(3)),
    // Code Injection | Obfuscation | Memory Poisoning | Credential Access | ...
    category: v.string(),
    severity: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    // deterministic = Tier 1 exact match; high/medium/low = AI confidence
    confidence: v.union(
      v.literal("deterministic"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    // Relative file path within the repo
    file: v.string(),
    line: v.optional(v.number()),
    // The matched text / evidence snippet (truncated)
    evidence: v.string(),
    // Human-readable description of the finding
    description: v.string(),
    // How to fix it
    remediation: v.optional(v.string()),
  }).index("by_scan", ["scanId"]),
});
