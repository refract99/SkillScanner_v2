/**
 * GitHub API client for fetching repository content.
 * Used from Convex actions (which can make outbound HTTP requests).
 *
 * Strategy:
 * 1. GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1  → full file tree
 * 2. For each scannable file (text, ≤200KB, known extension), fetch content
 *    via GET /repos/{owner}/{repo}/contents/{path}
 * 3. Return a flat list of { path, content } ready for scanning
 */

/** A file fetched from GitHub with its decoded text content. */
export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

/** Summary of the repository tree fetch. */
export interface RepoFetchResult {
  files: RepoFile[];
  totalFiles: number;
  skippedFiles: number;
  defaultBranch: string;
}

// File extensions we care about for scanning.
const SCANNABLE_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".yaml",
  ".yml",
  ".json",
  ".toml",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".py",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".php",
  ".pl",
  ".lua",
  ".r",
  ".env",
]);

// Files with no extension but important names to always include.
const SCANNABLE_NAMES = new Set([
  "CLAUDE",
  "SKILL",
  "AGENTS",
  "CODEOWNERS",
  "Makefile",
  "Dockerfile",
  "Rakefile",
  "Gemfile",
  "Procfile",
  ".bashrc",
  ".bash_profile",
  ".zshrc",
  ".profile",
  ".envrc",
]);

// Maximum file size in bytes to fetch (200KB).
const MAX_FILE_SIZE = 200 * 1024;
// Maximum total files to fetch per scan.
const MAX_FILES = 200;

function isScannableFile(path: string, size: number): boolean {
  if (size > MAX_FILE_SIZE) return false;
  const parts = path.split("/");
  const filename = parts[parts.length - 1];
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = filename.slice(dotIndex).toLowerCase();
    return SCANNABLE_EXTENSIONS.has(ext);
  }
  // No extension — check by name
  return SCANNABLE_NAMES.has(filename);
}

interface GitTreeItem {
  path: string;
  type: string;
  size?: number;
  sha: string;
  url: string;
}

interface GitTreeResponse {
  tree: GitTreeItem[];
  truncated: boolean;
}

interface ContentsResponse {
  content: string;
  encoding: string;
  size: number;
}

function githubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "SkillScanner/1.0",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Parse a GitHub URL into owner/repo.
 * Accepts: https://github.com/owner/repo, github.com/owner/repo, owner/repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url
    .trim()
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  // Full URL
  const fullMatch = cleaned.match(
    /(?:https?:\/\/)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
  );
  if (fullMatch) {
    return { owner: fullMatch[1], repo: fullMatch[2] };
  }

  // Shorthand owner/repo
  const shortMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

/**
 * Fetch all scannable files from a public GitHub repository.
 * Pass a GitHub token to avoid rate-limit issues (60 → 5000 req/hr).
 */
export async function fetchRepoFiles(
  owner: string,
  repo: string,
  token?: string
): Promise<RepoFetchResult> {
  const headers = githubHeaders(token);

  // 1. Get repo metadata to find default branch
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });
  if (!repoRes.ok) {
    const body = await repoRes.text();
    throw new Error(`GitHub repo fetch failed (${repoRes.status}): ${body}`);
  }
  const repoData = (await repoRes.json()) as { default_branch: string };
  const defaultBranch = repoData.default_branch ?? "main";

  // 2. Get recursive file tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) {
    const body = await treeRes.text();
    throw new Error(`GitHub tree fetch failed (${treeRes.status}): ${body}`);
  }
  const treeData = (await treeRes.json()) as GitTreeResponse;

  // 3. Filter to scannable blobs
  const candidates = treeData.tree.filter(
    (item) => item.type === "blob" && isScannableFile(item.path, item.size ?? 0)
  );

  const totalFiles = treeData.tree.filter((i) => i.type === "blob").length;
  const toFetch = candidates.slice(0, MAX_FILES);
  const skippedFiles = totalFiles - toFetch.length;

  // 4. Fetch file contents in parallel (batched to avoid rate limit)
  const files: RepoFile[] = [];
  const BATCH = 10;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((item) =>
        fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(item.path)}`,
          { headers }
        )
          .then((r) => r.json() as Promise<ContentsResponse>)
          .then((data) => {
            if (data.encoding !== "base64") return null;
            // GitHub returns base64 with newlines — strip them
            const b64 = data.content.replace(/\n/g, "");
            const content = Buffer.from(b64, "base64").toString("utf-8");
            return { path: item.path, content, size: data.size } satisfies RepoFile;
          })
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value !== null) {
        files.push(r.value);
      }
    }
  }

  return { files, totalFiles, skippedFiles, defaultBranch };
}
