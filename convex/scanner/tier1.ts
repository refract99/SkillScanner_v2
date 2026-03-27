/**
 * Tier 1 Scanning Engine — Deterministic Checks
 *
 * Produces binary PASS/FAIL results. Any match = automatic risk flag.
 * All checks are pattern-based (regex + string matching), no AI required.
 *
 * Four categories (per PRD §5.2):
 *   1. Code Injection      — eval/exec, reverse shells, dynamic code loading, deserialization
 *   2. Obfuscation         — zero-width chars, homoglyphs, multi-layer encoding, concat evasion
 *   3. Memory Poisoning    — writes to agent config/profile files that persist across sessions
 *   4. Credential Access   — reads credential files, env vars, SSH keys, cloud creds
 */

import type { RepoFile } from "./github";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tier1Category =
  | "Code Injection"
  | "Obfuscation"
  | "Memory Poisoning"
  | "Credential Access";

export interface Tier1Finding {
  category: Tier1Category;
  severity: "critical" | "high" | "medium";
  file: string;
  line: number;
  evidence: string;
  description: string;
  remediation: string;
}

interface Rule {
  id: string;
  category: Tier1Category;
  severity: "critical" | "high" | "medium";
  pattern: RegExp;
  description: string;
  remediation: string;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const RULES: Rule[] = [
  // ── Code Injection ─────────────────────────────────────────────────────────

  {
    id: "ci-eval-js",
    category: "Code Injection",
    severity: "critical",
    pattern: /\beval\s*\(/g,
    description:
      "eval() executes arbitrary code strings at runtime. Attackers can inject malicious code via user-controlled inputs.",
    remediation:
      "Remove eval(). Parse data with JSON.parse() or use safer alternatives like Function.prototype.call with trusted input.",
  },
  {
    id: "ci-new-function",
    category: "Code Injection",
    severity: "critical",
    pattern: /\bnew\s+Function\s*\(/g,
    description:
      "new Function() is equivalent to eval() and executes dynamically constructed code strings.",
    remediation: "Replace with direct function declarations or safe data parsing.",
  },
  {
    id: "ci-vm-run",
    category: "Code Injection",
    severity: "critical",
    pattern: /\bvm\s*\.\s*run(?:In(?:New|This)Context|Script)\s*\(/g,
    description:
      "Node.js vm module executes arbitrary code. While sandboxed, vm sandboxes are not security boundaries.",
    remediation: "Avoid vm.run*. If isolation is needed, use a separate subprocess with strict IPC.",
  },
  {
    id: "ci-exec-py",
    category: "Code Injection",
    severity: "critical",
    pattern: /\bexec\s*\(\s*(?:[^)]{0,200}(?:input|request|param|query|user|data|cmd|command))/g,
    description: "exec() called with what appears to be dynamic/user-controlled input.",
    remediation: "Never pass user-controlled data to exec(). Use parameterized APIs instead.",
  },
  {
    id: "ci-os-system",
    category: "Code Injection",
    severity: "critical",
    pattern: /\bos\s*\.\s*(?:system|popen|execv|execve|execvp)\s*\(/g,
    description:
      "os.system/os.popen executes shell commands. If input is attacker-controlled, this enables command injection.",
    remediation:
      "Use subprocess.run() with a list of arguments (not shell=True) and never interpolate user input.",
  },
  {
    id: "ci-subprocess-shell",
    category: "Code Injection",
    severity: "high",
    pattern: /\bsubprocess\s*\.\s*(?:call|run|Popen|check_output|check_call)\s*\([^)]*shell\s*=\s*True/g,
    description:
      "subprocess called with shell=True. This passes the command to the shell interpreter, enabling injection.",
    remediation: "Remove shell=True. Pass arguments as a list: subprocess.run(['cmd', 'arg1', 'arg2']).",
  },
  {
    id: "ci-child-process",
    category: "Code Injection",
    severity: "critical",
    pattern: /\b(?:child_process\s*\.\s*)?(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(/g,
    description:
      "Node.js child_process execution function detected. If arguments are user-controlled, this enables command injection.",
    remediation:
      "Use execFile/spawnSync with a fixed command and a list of arguments. Never interpolate user input into shell strings.",
  },
  {
    id: "ci-pickle",
    category: "Code Injection",
    severity: "critical",
    pattern: /\bpickle\s*\.\s*(?:loads|load)\s*\(/g,
    description:
      "pickle.loads/load deserializes arbitrary Python objects. Malicious pickle data executes code during deserialization.",
    remediation: "Never deserialize untrusted pickle data. Use JSON or a schema-validated format instead.",
  },
  {
    id: "ci-yaml-load-unsafe",
    category: "Code Injection",
    severity: "high",
    pattern: /\byaml\s*\.\s*load\s*\([^,)]+(?!Loader\s*=\s*yaml\.SafeLoader)/g,
    description:
      "yaml.load() without SafeLoader can deserialize arbitrary Python objects, enabling code execution.",
    remediation: "Use yaml.safe_load() instead of yaml.load().",
  },
  {
    id: "ci-reverse-shell-tcp",
    category: "Code Injection",
    severity: "critical",
    pattern: /bash\s+-i\s*>?&?\s*\/dev\/tcp\//g,
    description:
      "Classic bash reverse shell via /dev/tcp. This opens a remote shell connection to an attacker-controlled server.",
    remediation: "Remove this pattern. Reverse shells have no legitimate use in skill files.",
  },
  {
    id: "ci-reverse-shell-nc",
    category: "Code Injection",
    severity: "critical",
    pattern: /\bnc\b.*?(?:-e\s+|(?:\/bin\/)?(?:bash|sh|cmd))/g,
    description:
      "netcat with -e flag or shell argument detected. This is a classic reverse shell pattern.",
    remediation: "Remove this pattern. Reverse shells have no legitimate use in skill files.",
  },
  {
    id: "ci-mkfifo-shell",
    category: "Code Injection",
    severity: "critical",
    pattern: /mkfifo\s+[^\n;]+&&[^\n;]*(?:bash|sh|nc|ncat|netcat)/g,
    description:
      "Named pipe reverse shell pattern detected (mkfifo + shell). Creates a persistent remote shell connection.",
    remediation: "Remove this pattern. No legitimate skill needs an outbound shell connection.",
  },
  {
    id: "ci-python-socket-reverse",
    category: "Code Injection",
    severity: "critical",
    pattern: /(?:python|python3)\s+-c\s*['"]import\s+socket/g,
    description:
      "Python reverse shell via socket detected. This pattern is commonly used to establish covert command channels.",
    remediation: "Remove this pattern. No legitimate skill needs a raw socket reverse shell.",
  },
  {
    id: "ci-dynamic-import",
    category: "Code Injection",
    severity: "high",
    pattern: /\brequire\s*\(\s*(?:(?!['"`])[^\)]+)\)/g,
    description:
      "Dynamic require() call with a non-literal argument. The module path may be attacker-controlled.",
    remediation: "Use static require() with string literals. Validate any dynamic module paths against an allowlist.",
  },
  {
    id: "ci-base64-eval",
    category: "Code Injection",
    severity: "critical",
    pattern: /eval\s*\(\s*(?:atob|Buffer\.from|base64_decode)\s*\(/g,
    description:
      "Base64-encoded payload passed directly to eval(). This is a common obfuscation technique to hide malicious code.",
    remediation: "Remove this pattern. Never eval() decoded strings.",
  },

  // ── Obfuscation ────────────────────────────────────────────────────────────

  {
    id: "ob-zero-width",
    category: "Obfuscation",
    severity: "critical",
    pattern: /[\u200B\u200C\u200D\uFEFF\u2060\u2061\u2062\u2063\u2064]/g,
    description:
      "Zero-width or invisible Unicode characters detected. These are used to hide malicious instructions from human reviewers while the AI processes them.",
    remediation:
      "Remove all zero-width characters. Run: cat -A file | grep -P '[\\x{200B}-\\x{200D}\\x{FEFF}]' to find them.",
  },
  {
    id: "ob-cyrillic-homoglyph",
    category: "Obfuscation",
    severity: "high",
    // Cyrillic characters that look identical to Latin: а е і о р с у х
    pattern: /[аАеЕіІоОрРсСуУхХ]/g,
    description:
      "Cyrillic characters that are visually identical to Latin letters detected. Homoglyph attacks use these to create lookalike identifiers that execute different code than they appear to.",
    remediation:
      "Replace all Cyrillic lookalike characters with their ASCII equivalents. Enforce ASCII-only identifiers via linting.",
  },
  {
    id: "ob-multilayer-encode",
    category: "Obfuscation",
    severity: "high",
    pattern: /(?:atob|base64_decode|Buffer\.from)\s*\(\s*(?:atob|base64_decode|Buffer\.from)\s*\(/g,
    description:
      "Multi-layer base64 encoding detected. Stacking encoding layers hides the true payload from single-pass scanners.",
    remediation: "Remove multi-layer encoding. If encoding is needed for data transport, use a single layer.",
  },
  {
    id: "ob-hex-string-exec",
    category: "Obfuscation",
    severity: "high",
    pattern: /(?:exec|eval|system|subprocess)\s*\(['"\\x[0-9a-fA-F]{2}/g,
    description:
      "Hex-escaped string passed to exec/eval/system. Hex encoding obscures the actual command being run.",
    remediation: "Decode and review the actual string. Remove any dynamic execution of obfuscated payloads.",
  },
  {
    id: "ob-string-concat-shell",
    category: "Obfuscation",
    severity: "high",
    // Detect concatenated assembly of dangerous shell keywords
    pattern: /['"](?:ba|s)['"]\s*\+\s*['"](?:sh|h|ash)['"]/g,
    description:
      "Shell command name assembled via string concatenation ('ba'+'sh', 's'+'h'). Used to evade static scanners.",
    remediation: "Use direct string literals. String-concatenation evasion is a red flag in skill files.",
  },
  {
    id: "ob-high-entropy-b64",
    category: "Obfuscation",
    severity: "medium",
    // Long base64 string (>100 chars) not in a comment
    pattern: /(?<![#\/\*\s])(?:[A-Za-z0-9+/]{4}){25,}={0,2}/g,
    description:
      "Long high-entropy base64 string detected (>100 chars). May be an encoded payload embedded in skill instructions.",
    remediation:
      "Decode and review the string content. Remove any embedded executable payloads or obfuscated data.",
  },

  // ── Memory Poisoning ───────────────────────────────────────────────────────

  {
    id: "mp-write-bashrc",
    category: "Memory Poisoning",
    severity: "critical",
    pattern: /(?:echo|printf|tee)\s+[^\n]*(?:>>?\s*~?\/?\.\s*(?:bash|zsh|sh)(?:rc|_profile|_login)|>>?\s*~?\/?\.\s*profile)/g,
    description:
      "Writes to shell startup files (.bashrc, .zshrc, .profile, etc.) detected. This persists code across sessions and survives restarts.",
    remediation:
      "Remove all writes to shell startup files. Skills must not modify the host shell environment.",
  },
  {
    id: "mp-append-bashrc",
    category: "Memory Poisoning",
    severity: "critical",
    pattern: />>?\s*~?\/?\.(bashrc|bash_profile|bash_login|zshrc|zprofile|zlogin|profile|zshenv)/g,
    description:
      "Append redirect to shell startup file detected. Persists instructions/code across user sessions.",
    remediation: "Remove redirection to shell startup files. No skill should modify these files.",
  },
  {
    id: "mp-write-claude-md",
    category: "Memory Poisoning",
    severity: "critical",
    pattern: /(?:echo|printf|tee|write|append|cat)\s+[^\n]*(?:>>?\s*.*CLAUDE\.md|>>?\s*.*AGENTS\.md|>>?\s*.*SKILL\.md)/gi,
    description:
      "Writes to agent instruction files (CLAUDE.md, AGENTS.md, SKILL.md) detected. This poisons the AI agent's core instructions and can persist malicious directives.",
    remediation: "Remove all writes to agent instruction files. Skills must not self-modify their instruction context.",
  },
  {
    id: "mp-write-cursor-rules",
    category: "Memory Poisoning",
    severity: "critical",
    pattern: /(?:echo|printf|tee|cat)\s+[^\n]*>>?\s*.*\.cursor(?:rules|\/rules)/gi,
    description:
      "Writes to Cursor rules file detected. Modifying .cursorrules or .cursor/rules persists instructions across all Cursor sessions.",
    remediation: "Remove writes to Cursor rules files. Skills must not modify host IDE configuration.",
  },
  {
    id: "mp-write-windsurf",
    category: "Memory Poisoning",
    severity: "critical",
    pattern: /(?:echo|printf|tee|cat)\s+[^\n]*>>?\s*.*\.windsurfrules/gi,
    description:
      "Writes to .windsurfrules detected. Persists instructions in Windsurf across all future sessions.",
    remediation: "Remove writes to .windsurfrules. Skills must not modify host configuration.",
  },
  {
    id: "mp-write-crontab",
    category: "Memory Poisoning",
    severity: "critical",
    pattern: /\bcrontab\s+-[^l][^\n]*/g,
    description:
      "crontab modification detected (crontab -e/-r or piped crontab). Installing cron jobs provides persistence and repeated execution.",
    remediation: "Remove crontab modifications. Skills must not install scheduled tasks.",
  },
  {
    id: "mp-write-etc-cron",
    category: "Memory Poisoning",
    severity: "critical",
    pattern: /(?:echo|tee|cat)\s+[^\n]*>>?\s*\/etc\/cron/g,
    description: "Writes to /etc/cron* detected. Creates system-wide persistent scheduled tasks.",
    remediation: "Remove writes to /etc/cron. Skills must not modify system cron configuration.",
  },
  {
    id: "mp-write-authorized-keys",
    category: "Memory Poisoning",
    severity: "critical",
    pattern: /(?:echo|tee|cat)\s+[^\n]*>>?\s*~?\/?\.(ssh\/authorized_keys)/g,
    description:
      "Writes to SSH authorized_keys detected. Adding a public key grants permanent remote access to the system.",
    remediation: "Remove writes to authorized_keys. No skill should modify SSH access controls.",
  },
  {
    id: "mp-nlp-modify-claude-md",
    category: "Memory Poisoning",
    severity: "high",
    // Natural language instruction patterns common in CLAUDE.md / SKILL.md
    pattern: /(?:update|modify|append|add|write|insert)\s+(?:to\s+)?CLAUDE\.md/gi,
    description:
      "Natural language instruction to modify CLAUDE.md detected. This may instruct the AI to poison its own instruction file.",
    remediation:
      "Remove instructions that direct the AI to modify its own context files. Agent instruction files must be treated as immutable at runtime.",
  },

  // ── Credential Access ──────────────────────────────────────────────────────

  {
    id: "ca-aws-creds-file",
    category: "Credential Access",
    severity: "critical",
    pattern: /~?\/?\.(aws\/credentials|aws\/config)\b/g,
    description:
      "Reference to AWS credentials file (~/.aws/credentials or ~/.aws/config) detected. Reading these files exposes cloud access keys.",
    remediation:
      "Remove references to AWS credential files. Use IAM roles or short-lived tokens, never read credential files directly.",
  },
  {
    id: "ca-aws-env-vars",
    category: "Credential Access",
    severity: "critical",
    pattern: /\$(?:\{)?(?:AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN)(?:\})?/g,
    description:
      "AWS credential environment variables referenced. Exfiltrating these grants full access to the AWS account.",
    remediation:
      "Do not access or transmit AWS credential env vars. Use IAM roles with minimal permissions.",
  },
  {
    id: "ca-ssh-private-key",
    category: "Credential Access",
    severity: "critical",
    pattern: /~?\/?\.(ssh\/(?:id_rsa|id_ed25519|id_ecdsa|id_dsa|identity))\b/g,
    description:
      "Reference to SSH private key file detected. Reading these files allows impersonating the user across all systems where they have access.",
    remediation: "Remove references to SSH private key files. Never read or transmit private key material.",
  },
  {
    id: "ca-github-token",
    category: "Credential Access",
    severity: "critical",
    pattern: /\$(?:\{)?(?:GITHUB_TOKEN|GH_TOKEN|GITHUB_PAT|GITLAB_TOKEN|BITBUCKET_TOKEN)(?:\})?/g,
    description:
      "Version control authentication token environment variable referenced. Exfiltrating this grants repository and API access.",
    remediation:
      "Do not access or transmit VCS tokens. Use the minimal scoped token provided by the CI/CD runtime.",
  },
  {
    id: "ca-api-key-vars",
    category: "Credential Access",
    severity: "critical",
    pattern: /\$(?:\{)?(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|STRIPE_SECRET_KEY|STRIPE_API_KEY|SENDGRID_API_KEY|TWILIO_AUTH_TOKEN)(?:\})?/g,
    description:
      "AI or payment service API key environment variable referenced. Exfiltrating these grants access to paid services.",
    remediation:
      "Do not access or transmit third-party API keys. Scope permissions and rotate compromised keys immediately.",
  },
  {
    id: "ca-env-file-read",
    category: "Credential Access",
    severity: "high",
    pattern: /(?:cat|less|more|head|tail|type)\s+[^\n]*\.env(?:\.(?:local|production|staging|secret|development))?\b/g,
    description:
      ".env file read via shell command detected. .env files contain secrets and must never be read by skill code.",
    remediation: "Remove reads of .env files. Environment variables should be injected by the runtime, not read from disk.",
  },
  {
    id: "ca-shadow-passwd",
    category: "Credential Access",
    severity: "critical",
    pattern: /(?:cat|less|more|head)\s+\/etc\/(?:shadow|passwd|master\.passwd)/g,
    description:
      "Read of /etc/shadow or /etc/passwd detected. These files contain system user credentials and password hashes.",
    remediation: "Remove reads of system credential files. No skill should need access to system auth databases.",
  },
  {
    id: "ca-gcp-credentials",
    category: "Credential Access",
    severity: "critical",
    pattern: /~?\/?\.(config\/gcloud\/(?:credentials\.db|application_default_credentials\.json|access_tokens\.db))/g,
    description: "Reference to GCP credential file detected. Reading these files exposes Google Cloud access tokens.",
    remediation:
      "Remove references to GCP credential files. Use Workload Identity Federation or short-lived tokens.",
  },
  {
    id: "ca-kubeconfig",
    category: "Credential Access",
    severity: "high",
    pattern: /~?\/?\.(kube\/config)\b/g,
    description:
      "Reference to kubeconfig file detected. This file contains cluster credentials and can grant full Kubernetes access.",
    remediation: "Remove references to kubeconfig. Use service accounts with minimal RBAC permissions.",
  },
  {
    id: "ca-generic-token-exfil",
    category: "Credential Access",
    severity: "high",
    // echo $SECRET or curl -d $TOKEN — generic sensitive var exfil
    pattern: /(?:echo|printf|curl\s+-d)\s+\$(?:\{)?[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASS|PASSWORD|PWD)(?:\})?/g,
    description:
      "Environment variable with a name suggesting a credential is echoed or sent via HTTP. Possible credential exfiltration.",
    remediation:
      "Remove any code that prints or transmits environment variables. Audit what is being sent and to where.",
  },
];

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/**
 * Run all Tier 1 deterministic rules against a single file's content.
 * Returns one Finding per unique (rule, line) match.
 */
function scanFile(file: RepoFile): Tier1Finding[] {
  const findings: Tier1Finding[] = [];
  const lines = file.content.split("\n");

  for (const rule of RULES) {
    // Reset lastIndex for global regexes on each file
    rule.pattern.lastIndex = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      // Reset and test
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(line);
      if (match) {
        const evidence = line.trim().slice(0, 200);
        findings.push({
          category: rule.category,
          severity: rule.severity,
          file: file.path,
          line: lineIdx + 1,
          evidence,
          description: rule.description,
          remediation: rule.remediation,
        });
        // One finding per rule per line is enough
        rule.pattern.lastIndex = 0;
      }
    }
  }

  return findings;
}

/**
 * Run Tier 1 checks across all repo files.
 * Deduplicates by (ruleId implicitly via description, file, line).
 */
export function runTier1(files: RepoFile[]): Tier1Finding[] {
  const all: Tier1Finding[] = [];
  for (const file of files) {
    all.push(...scanFile(file));
  }
  return all;
}

/** Import RepoFile type for consumers */
export type { RepoFile };
