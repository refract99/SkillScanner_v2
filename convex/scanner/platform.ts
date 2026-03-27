/**
 * Platform detection for AI agent skill repositories.
 * Inspects file paths to determine which agent platform the skill targets.
 */

export type Platform =
  | "claude_code"
  | "openclaw"
  | "cursor"
  | "windsurf"
  | "cline"
  | "mcp"
  | "unknown";

interface PlatformSignal {
  platform: Platform;
  paths: string[];
  weight: number;
}

const SIGNALS: PlatformSignal[] = [
  {
    platform: "claude_code",
    paths: ["CLAUDE.md", ".claude/", "claude_desktop_config.json"],
    weight: 3,
  },
  {
    platform: "openclaw",
    paths: ["SKILL.md", "AGENTS.md", "tools/", ".openclaw/"],
    weight: 3,
  },
  {
    platform: "cursor",
    paths: [".cursor/rules", ".cursor/", ".cursorrules"],
    weight: 3,
  },
  {
    platform: "windsurf",
    paths: [".windsurf/", ".windsurfrules"],
    weight: 3,
  },
  {
    platform: "cline",
    paths: [".cline/", ".clinerules", "cline_docs/"],
    weight: 3,
  },
  {
    platform: "mcp",
    paths: ["mcp.json", "mcp_config.json", "server.py", "server.ts", "mcp/"],
    weight: 2,
  },
];

/**
 * Detect the agent platform by inspecting the list of file paths in the repo.
 * Returns the platform with the strongest signal, or "unknown".
 */
export function detectPlatform(filePaths: string[]): Platform {
  const scores = new Map<Platform, number>();

  for (const signal of SIGNALS) {
    let score = 0;
    for (const filePath of filePaths) {
      for (const pattern of signal.paths) {
        if (
          filePath === pattern ||
          filePath.startsWith(pattern) ||
          filePath.endsWith(pattern)
        ) {
          score += signal.weight;
          break;
        }
      }
    }
    if (score > 0) {
      scores.set(signal.platform, (scores.get(signal.platform) ?? 0) + score);
    }
  }

  if (scores.size === 0) return "unknown";

  let best: Platform = "unknown";
  let bestScore = 0;
  for (const [platform, score] of scores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      best = platform;
    }
  }
  return best;
}

/** Human-readable platform labels for display. */
export const PLATFORM_LABELS: Record<Platform, string> = {
  claude_code: "Claude Code",
  openclaw: "OpenClaw",
  cursor: "Cursor",
  windsurf: "Windsurf",
  cline: "Cline",
  mcp: "MCP Server",
  unknown: "Unknown Platform",
};
