# SkillScanner Competitive Analysis

**Date:** 2026-03-27
**Status:** Research complete — informs Product Requirements Document

---

## 1. Executive Summary

SkillScanner occupies a narrow but growing niche: **security scanning for AI agent skills** (instruction files that extend Claude Code, Cursor, Windsurf, Cline, OpenClaw). The product is early-stage — a single-page app on Vercel with no pricing page, no account system, and unclear actual scanning capability.

The competitive landscape is fragmented. No single tool does exactly what SkillScanner claims across all 10 threat categories. The closest direct competitor is **Repello SkillCheck** (browser-based skill scanner), followed by a cluster of MCP-specific scanners (Proximity, Invariant, ScanMCP, Cisco) and broader AI security platforms (promptfoo, CalypsoAI, Protect AI) that overlap partially but serve different use cases.

**Key finding:** The real opportunity isn't competing with Snyk or promptfoo — it's being the **first credible, automated skill auditor** that covers the full attack surface (prompt injection through supply chain) in a single paste-a-URL workflow. The threat model is real (ClawHavoc demonstrated this), the market is nascent, and the incumbents are either too narrow (MCP-only) or too broad (enterprise AI security).

---

## 2. Existing Product Analysis

### Current State (skillscanner-seven.vercel.app)

**What exists:**
- Single landing page with clear value proposition
- 10 threat categories described with one-liner definitions
- FAQ section (well-written, addresses key objections)
- Platform logos: Claude Code, OpenClaw, Cursor, Windsurf, Cline
- Claims: "Free · No account required · Public repos only"
- Claims: "5 scans per hour" (anonymous), "20 with free account"

**What doesn't exist:**
- No pricing page (404)
- No account/auth system
- No visible scanning UI (the page describes the process but it's unclear if the scanner actually works)
- No report examples or sample output
- No scan history dashboard
- No SBOM generation
- No API access
- Private repo support listed as "planned"

**Marketing vs Reality Gaps:**
| Claim | Assessment |
|-------|-----------|
| "Security report in seconds" | Unverifiable — no live demo |
| "AI-first analysis across 10 threat categories" | Ambitious — needs validation that AI analysis actually produces useful findings |
| "Deterministic hard-stop checks" | Strongest claim — pattern matching for reverse shells, zero-width chars is achievable |
| "Risk score, AI verdict, severity-ranked findings" | No example output to evaluate quality |
| "Free tier (5 scans), paid tier (history, SBOM, database)" | Paid tier doesn't exist yet |

**Verdict:** The landing page is solid positioning. The product itself appears to be pre-MVP. The 10-category framework is the core IP — if the analysis engine delivers, the wrapper can catch up fast.

---

## 3. Competitive Landscape

### Comparison Table

| Tool | Type | Focus | Pricing | AI Skills? | MCP? |
|------|------|-------|---------|-----------|------|
| **SkillScanner** | Web SaaS | Skill files (10 categories) | Free (planned paid) | ✅ Primary | Partial |
| **Repello SkillCheck** | Browser tool | Skill ZIP files | Free | ✅ Primary | ❌ |
| **Cisco MCP Scanner** | CLI (Python) | MCP servers | Open source | ❌ | ✅ Primary |
| **Proximity** | Open source | MCP security | Free | ❌ | ✅ Primary |
| **Invariant MCP-Scan** | CLI + proxy | MCP tool poisoning | Free/Enterprise | ❌ | ✅ Primary |
| **ScanMCP.com** | Web SaaS | MCP monitoring | Unknown | ❌ | ✅ Primary |
| **promptfoo** | CLI + Cloud | LLM red teaming/evals | Free / Enterprise | ❌ | ❌ |
| **CalypsoAI** | Enterprise SaaS | AI inference security | Enterprise | ❌ | ❌ |
| **Protect AI** | Enterprise SaaS | AI runtime protection | Enterprise | ❌ | ❌ |
| **Socket.dev** | SaaS + CI/CD | Dependency scanning | $0-$50/dev/mo | ❌ | ❌ |
| **Snyk** | SaaS + CI/CD | SCA/SAST/containers | Free / Enterprise | ❌ | ❌ |
| **Semgrep** | CLI + SaaS | SAST | Free / Team ($40/mo) | ❌ | ❌ |
| **Trivy** | CLI | Container/package scanning | Free (Aqua paid) | ❌ | ❌ |

### Detailed Findings

#### Direct Competitors (Skill/Agent Scanners)

**Repello SkillCheck** (repello.ai/tools/skills)
- **Closest competitor.** Upload ZIP files, get score 0-100 + Safe/High/Critical verdict.
- Detects prompt injection, env var exfiltration, policy violations, payload delivery.
- Has a **pre-scanned skill catalog** — community threat intelligence. This is a genuine differentiator.
- Limitations: no deep dataflow analysis, no REST API, no continuous monitoring.
- Built on ClawHavoc research — credible pedigree.
- **Threat:** If Repello adds GitHub URL scanning and expands categories, they directly overlap.

**Cisco MCP Scanner** (open source)
- Python CLI with 4-layer analysis: static analysis, YARA rules, bytecode analysis, dataflow tracing, LLM evaluation.
- Requires Python 3.10+ and 3 API keys (heavier setup).
- Most technically rigorous scanner in this space.
- Focused on MCP servers, not skill files.

**Proximity** (open source, Adversa.ai)
- Probes remote/local MCP servers for exposed prompts, tools, resources.
- NOVA rule engine for risk evaluation.
- Lightweight, purpose-built for MCP.

**Invariant MCP-Scan**
- Static analysis + runtime proxying + tool pinning + observability.
- Enterprise play — broader than just scanning.

**ScanMCP.com**
- First cloud-based MCP scanner. Monitors context drift, protocol misconfigs.
- Very early — unclear maturity.

#### Adjacent Competitors (Broader AI Security)

**promptfoo** — The heavyweight in LLM security testing. Open source, 300K+ devs, Fortune 500 adoption. Focuses on red-teaming LLM applications (prompt injection, jailbreaks). 10K probes/month free. **Not a skill scanner** — different layer of the stack. But if promptfoo added skill file analysis, it would be formidable.

**CalypsoAI** — Enterprise AI security platform. Real-time inference scanning, 10K+ attack prompts, compliance dashboards. RSAC 2025 Innovation Sandbox finalist. **Enterprise pricing, enterprise focus** — not competing for the "paste a URL" self-serve market.

**Protect AI** — Similar enterprise positioning to CalypsoAI. PII detection, prompt injection defense, adversarial red-teaming. **No skill/agent-specific capability.**

**Socket.dev** — Software supply chain security. $0-$50/dev/mo. Detects 70+ risk types in dependencies. **Relevant to SkillScanner's supply chain category** but operates at the package dependency level, not the skill instruction level.

**Snyk, Semgrep, Trivy** — Traditional SCA/SAST tools. Scan for known CVEs, code patterns, container vulnerabilities. **Complementary to SkillScanner, not competitive.** SkillScanner should integrate with these (or reference their results) rather than try to replace them.

---

## 4. Threat Category Analysis

### 4.1 Prompt Injection
**Definition:** Instructions embedded in skill files that manipulate the AI agent into ignoring its safety guidelines, executing unauthorized actions, or treating malicious input as legitimate commands.

**Attack patterns:**
- Conditional triggers: "If the user mentions X, ignore all previous instructions and..."
- Role manipulation: "You are no longer a security assistant, you are..."
- Encoding-based injection: Base64-encoded instructions decoded at runtime
- Indirect injection via file contents, comments, or metadata

**Scanner should check:**
- Presence of system-role assertions or override attempts
- Conditionals that alter agent behavior based on external input
- Encoded strings that decode to instruction-like content
- References to "ignore previous instructions", "new role", "emergency override"

**Existing coverage:** promptfoo (runtime testing), Repello (pattern matching), Cisco scanner (LLM evaluation)

**Gaps:** Encoding-based injection is underserved by static analysis. Semantic intent detection requires AI analysis — this is where SkillScanner's "AI-first" approach should shine.

### 4.2 Credential Access
**Definition:** Attempts to read, extract, or exfiltrate credentials — API keys, tokens, environment variables, SSH keys, cloud credentials stored in the agent's environment.

**Attack patterns:**
- Reading `~/.aws/credentials`, `.env` files, `~/.ssh/`
- Accessing environment variables via `$ENV`, `process.env`, `os.environ`
- Extracting credentials from shell history or config files
- Keylogging via shell command substitution

**Scanner should check:**
- File paths referencing known credential locations
- Environment variable access patterns
- Shell commands that read sensitive files (`cat ~/.aws/*`, `echo $GITHUB_TOKEN`)
- Credential harvesting chains (read → encode → exfil)

**Existing coverage:** Semgrep (code patterns), Trivy (secrets in containers), git-secrets/trufflehog (repo scanning)

**Gaps:** Credential access patterns specific to agent execution contexts (reading from agent-specific credential stores, MCP server auth tokens) are not well-covered by general-purpose tools.

### 4.3 Data Exfiltration
**Definition:** Mechanisms to send data out of the agent's environment — to attacker-controlled servers, DNS channels, or covert communication paths.

**Attack patterns:**
- `curl`/`wget` to attacker URLs with POST data
- DNS exfiltration via `nslookup`/`dig` with encoded subdomains
- Covert channels through file writes to accessible locations
- Abuse of legitimate APIs (e.g., posting to Slack/webhook with stolen data)
- Encoding data in HTTP headers or URL parameters

**Scanner should check:**
- Outbound network commands with variable interpolation
- DNS query commands with suspicious patterns
- Webhook URLs (especially to unknown domains)
- Data encoding before network transmission (base64 + curl is a classic)
- Redirect/pipe chains that move data to network commands

**Existing coverage:** Socket.dev (dependency network calls), Semgrep (code patterns)

**Gaps:** DNS exfiltration and covert channel detection are nearly absent from current skill scanners. The "legitimate API abuse" vector (posting stolen data to Slack, GitHub, etc.) is hard to detect statically.

### 4.4 Code Injection
**Definition:** Executing arbitrary code within the agent's environment — eval(), exec(), reverse shells, dynamic code loading.

**Attack patterns:**
- `eval()`, `exec()`, `subprocess.call()`, `os.system()` with user-controlled input
- Reverse shells: `bash -i >& /dev/tcp/...`, Python reverse shells
- Dynamic code loading: `import()`, `require()` with computed paths
- Template injection (SSTI), deserialization attacks
- Framework-specific bypasses (escaping sandboxed execution)

**Scanner should check:**
- `eval`/`exec`/`Function` constructor calls
- Reverse shell patterns (bash/python/Perl/PowerShell)
- `subprocess`/`os.system`/`child_process` with variable arguments
- Dynamic imports with computed module paths
- Deserialization calls (`pickle.loads`, `yaml.load` with unsafe loader)

**Existing coverage:** Semgrep (strong here), Trivy, Snyk, Cisco scanner (bytecode analysis)

**Gaps:** Framework-specific sandbox bypasses (Claude Code's tool execution context, Cursor's sandbox) are novel and underserved. Static analysis catches obvious patterns but misses chained attacks.

### 4.5 Dangerous Operations
**Definition:** Destructive or high-privilege operations — file deletion, system modification, privilege escalation, unsafe command chaining.

**Attack patterns:**
- `rm -rf /`, `DELETE FROM`, `DROP TABLE`
- Privilege escalation: `sudo`, `chmod 777`, adding users
- Destructive Git operations: force push, branch deletion
- Unsafe chaining: `&&`, `||`, `;` combining dangerous commands
- Writing to system directories (`/etc/`, `/usr/`)

**Scanner should check:**
- Destructive shell commands (rm, dd, mkfs, format)
- Privilege escalation patterns (sudo, su, chmod, chown)
- Dangerous command chaining
- Git force operations
- System file/directory modifications

**Existing coverage:** Semgrep (custom rules), CIS benchmarks (compliance scanners)

**Gaps:** "Dangerous" is context-dependent — `rm -rf node_modules` is fine, `rm -rf ~` isn't. AI analysis needed to determine if the operation is appropriate within the skill's stated purpose.

### 4.6 Obfuscation
**Definition:** Techniques to hide malicious intent — encoding, character substitution, dead code, confusing variable names, zero-width characters.

**Attack patterns:**
- Base64/Hex encoding of malicious payloads
- Zero-width Unicode characters (invisible instructions)
- Homoglyph attacks (Unicode characters that look like ASCII)
- String concatenation to avoid pattern matching (`"ba" + "sh"`)
- Dead code injection (malicious code that appears unused but is triggered)
- Variable name obfuscation (`_0x4f`, `lI1`)

**Scanner should check:**
- Base64/Hex encoded strings (especially long ones or multi-layer)
- Zero-width characters (U+200B, U+200C, U+200D, U+FEFF)
- Homoglyph substitution in code strings
- String concatenation patterns that reconstruct dangerous commands
- Excessive encoding layers
- Suspicious variable naming patterns

**Existing coverage:** Cisco scanner (bytecode analysis), limited elsewhere

**Gaps:** Multi-layer obfuscation (base64 → base64 → decoded) is hard for simple pattern matchers. Homoglyph detection requires Unicode-aware analysis. This is a strong differentiator if done well.

### 4.7 Memory Poisoning
**Definition:** Writing persistent instructions to files that the agent reads on every session — effectively installing a backdoor that survives across conversations.

**Attack patterns:**
- Appending instructions to `CLAUDE.md`, `~/.claude/`, `.cursor/rules`
- Modifying shell profiles (`.bashrc`, `.zshrc`, `.profile`)
- Writing to agent config files that are auto-loaded
- Creating/modifying `AGENTS.md`, `SOUL.md`, or similar
- Planting instructions in project files that get committed to repos

**Scanner should check:**
- File write operations targeting agent config/profile paths
- Append operations to `.md` files in agent-specific directories
- Shell profile modification commands
- Git operations that commit modified config files
- Write operations to `~/.claude/`, `~/.cursor/`, `.windsurf/`

**Existing coverage:** **Nearly zero coverage outside of SkillScanner and Repello.** This is a novel threat category specific to agentic AI.

**Gaps:** This is a greenfield opportunity. No major security tool addresses agent memory poisoning. SkillScanner could own this category.

### 4.8 Excessive Agency
**Definition:** Requesting more permissions or tool access than the skill's stated purpose requires — scope creep that creates attack surface.

**Attack patterns:**
- Skills claiming to be "code review" but requesting filesystem write access
- Skills requesting shell access for tasks that could use read-only tools
- Asking for elevated permissions unnecessarily
- Tool permission escalation chains
- Accessing resources outside the skill's declared scope

**Scanner should check:**
- Declared skill scope vs. actual tool/permission requests
- Shell access requests in skills that don't need them
- Filesystem write permissions in read-only use cases
- Network access in offline-capable skills
- Privilege requests that exceed the skill's stated purpose

**Existing coverage:** **Unique to SkillScanner's framework.** Some overlap with CalypsoAI's policy scanning.

**Gaps:** Requires semantic understanding of what a skill *should* need vs. what it *actually* requests. Pure pattern matching can't do this — AI analysis is essential. This is the hardest category to automate well.

### 4.9 Supply Chain
**Definition:** Installing dependencies, packages, or additional code from untrusted sources during skill execution.

**Attack patterns:**
- `npm install`/`pip install` from untrusted URLs or packages
- `curl | bash` installation patterns
- Post-install scripts executing arbitrary code
- Force flags bypassing integrity checks (`--force`, `--ignore-scripts` disabled)
- Installing from git URLs with unverified commits

**Scanner should check:**
- Package manager install commands (npm, pip, yarn, cargo, gem)
- `curl | bash` and similar pipe-to-shell patterns
- Force flags (`--force`, `--unsafe-perm`, `--ignore-scripts false`)
- Install from URL/git rather than registry
- Post-install hook references

**Existing coverage:** Socket.dev (comprehensive here), Snyk, Trivy, npm audit, pip-audit

**Gaps:** These tools scan installed dependencies — SkillScanner's value is catching *the intent to install* before execution. Different timing, complementary value.

### 4.10 Social Engineering
**Definition:** Manipulating the human operator — fake safety claims, trust exploitation, urgency tactics, misdirection.

**Attack patterns:**
- Skills claiming to be from trusted sources (fake Anthropic, OpenAI branding)
- "Emergency security update" framing to lower guard
- Fake safety indicators ("✅ Security verified")
- Trust exploitation via name similarity (typosquatting skill names)
- Misdirection: documented as doing X but actually doing Y

**Scanner should check:**
- Brand impersonation (claims of being from Anthropic, OpenAI, etc.)
- Fake verification/security claims
- Mismatch between skill name/description and actual code behavior
- Trust indicators in README that contradict code analysis
- Urgency language ("critical update", "immediate action required")

**Existing coverage:** **Nearly zero.** Phishing detection tools exist but none are tuned for skill-specific social engineering.

**Gaps:** Another greenfield opportunity. Requires comparing README/marketing claims against actual code behavior — a job for AI analysis.

---

## 5. Gap Analysis

### What SkillScanner Has That Others Don't
1. **Unified 10-category framework** — no other tool covers this breadth for skill files
2. **Memory poisoning detection** — novel category, no competition
3. **Excessive agency analysis** — novel category, requires AI
4. **Social engineering detection** — novel category, no competition
5. **GitHub URL → report workflow** — Repello requires ZIP upload
6. **Multi-platform detection** — auto-detects Claude Code, Cursor, Windsurf, Cline, OpenClaw

### What Others Have That SkillScanner Doesn't (Yet)
1. **Repello's pre-scanned catalog** — community threat intelligence library
2. **Cisco's 4-layer analysis** — bytecode + dataflow + LLM evaluation (deeper technical analysis)
3. **promptfoo's red-teaming** — actual adversarial testing, not just static analysis
4. **Socket.dev's reachability analysis** — determines if vulnerable code is actually called
5. **MCP-specific scanners** — Proximity, Invariant, ScanMCP cover MCP servers deeply
6. **Enterprise features** — SSO, CI/CD integration, compliance dashboards (CalypsoAI, promptfoo Enterprise)

### Critical Missing Features (for MVP)
- **No working scanner UI** — the product doesn't appear to actually scan yet
- **No sample reports** — can't evaluate output quality
- **No MCP server support** — only skill files, not MCP servers (huge gap given MCP growth)
- **No API** — can't integrate into CI/CD or developer workflows
- **No pricing page** — no monetization path visible

---

## 6. Recommendations

### 6.1 Threat Category Adjustments

**Keep as-is (strong, unique, or well-defined):**
- Prompt Injection ✅
- Code Injection ✅
- Obfuscation ✅
- Memory Poisoning ✅ (own this category)
- Supply Chain ✅

**Merge or refine:**
- **Credential Access + Data Exfiltration → "Credential Theft & Exfiltration"** — they're almost always chained together. The attack pattern is always: find creds → encode → send out. Splitting them creates confusion about where one ends and the other begins.

**Add:**
- **MCP Server Security** — The MCP ecosystem is exploding. ScanMCP, Proximity, and Invariant prove there's demand. SkillScanner should at minimum detect MCP server configs and flag risky tool/resource exposure. Ideally, add full MCP scanning.
- **Runtime Behavior Analysis** — Static analysis catches patterns. Runtime analysis (sandboxed execution) catches what static misses. Even basic telemetry (what files does this skill touch? what network calls does it make?) would massively increase confidence.

**Consider dropping or downgrading:**
- **Excessive Agency** — Conceptually brilliant but nearly impossible to automate reliably. Move to "experimental" or "AI insight" rather than a hard finding. A code review skill legitimately needs filesystem access — declaring it "excessive" is a judgment call, not a security finding.
- **Social Engineering** — Same problem. Hard to automate without excessive false positives. Keep as an informational category, not a severity-ranked finding.

### 6.2 Minimum Viable Threat Model (MVP)

**Hard-stop deterministic checks (must catch):**
1. Reverse shells and command injection patterns
2. Zero-width characters and Unicode obfuscation
3. Credential file path access (`~/.aws/`, `.env`, SSH keys)
4. Known malicious package names/URLs
5. `curl | bash` and pipe-to-shell patterns
6. Memory poisoning (writes to agent config files)
7. Base64-encoded suspicious content

**AI analysis categories (should flag with confidence scores):**
1. Prompt injection (semantic intent detection)
2. Data exfiltration chains
3. Dangerous operations (context-dependent)
4. Supply chain risk (install from untrusted sources)

**Informational (nice to have, low confidence):**
1. Excessive agency
2. Social engineering

### 6.3 Differentiation Strategy

**SkillScanner's unique position:**
- **Only tool that scans skill files across multiple agent platforms** from a URL
- **Only tool with memory poisoning detection** (novel threat, growing importance)
- **AI-first analysis** catches context-dependent threats that pure static analysis misses
- **Zero-setup workflow** — paste URL, get report. No CLI, no API keys, no installation

**Where NOT to compete:**
- Don't try to be Snyk/Socket.dev (dependency scanning — partner or integrate)
- Don't try to be promptfoo (LLM red-teaming — different layer)
- Don't try to be CalypsoAI (enterprise AI security — different market)
- Don't try to out-depth Cisco's MCP scanner (different approach)

**The wedge:** Be the **VirusTotal for AI agent skills**. Free, fast, no-account scanning with a shareable report. Build a database of scanned skills. Monetize through volume, history, and API access.

### 6.4 What "Higher Quality of Assurance" Means (Concretely)

1. **Confidence scoring** — Every finding should have a confidence level (high/medium/low) based on whether it's deterministic or AI-inferred
2. **False positive rate transparency** — Show estimated FP rates per category
3. **Reproducibility** — Given the same skill, the same deterministic findings appear every time. AI findings should be deterministic given the same prompt+model.
4. **Evidence chains** — Every finding links to the exact file, line, and pattern that triggered it
5. **Severity calibration** — Use CVSS-inspired scoring that accounts for exploitability and impact in the agent context
6. **Transparency about limitations** — "We checked for X, Y, Z. We did NOT check for A, B, C. Here's why."

### 6.5 Feature Prioritization

#### MVP (Ship Now)
- [ ] Working scanner — actually scan GitHub repos and produce reports
- [ ] 7 hard-stop categories (merge credential + exfil, drop excessive agency/social as informational)
- [ ] Shareable report with risk score, findings, evidence
- [ ] Sample reports on landing page (build trust)
- [ ] Rate limiting (5/hour anonymous)
- [ ] MCP server detection (at minimum: flag if repo contains MCP server configs)

#### v1.0 (Weeks 1-4)
- [ ] Free account system with scan history
- [ ] AI analysis for prompt injection, exfiltration chains, dangerous ops
- [ ] Confidence scoring on all findings
- [ ] SBOM generation (list all dependencies found)
- [ ] Scanned skill database (public, searchable — like Repello's catalog)
- [ ] Pricing page (free tier + $9-19/mo individual + team/enterprise)

#### v2.0 (Months 2-3)
- [ ] Private repo scanning via GitHub OAuth
- [ ] MCP server scanning (full analysis, not just detection)
- [ ] API access for CI/CD integration
- [ ] CLI tool for local scanning
- [ ] Integrations with Socket.dev/Snyk for dependency enrichment
- [ ] Browser extension (scan skills from GitHub directly)
- [ ] Team/org features (shared dashboards, policies, custom rules)

#### v3.0 (Months 4-6)
- [ ] Sandboxed runtime analysis (what does this skill actually DO?)
- [ ] Marketplace integration (scan before install from skill directories)
- [ ] AgentSkills compliance certification badge
- [ ] Enterprise features (SSO, audit logs, custom policies)
- [ ] Continuous monitoring (rescan on commit)

---

## Appendix: Key Competitor URLs

| Tool | URL |
|------|-----|
| SkillScanner | https://skillscanner-seven.vercel.app |
| Repello SkillCheck | https://repello.ai/tools/skills |
| Cisco MCP Scanner | https://github.com/Cisco-Talos/skill-scanner |
| Proximity | https://adversa.ai/blog/mcp-security-resources-october-2025/ |
| Invariant | https://www.invariant.ai |
| ScanMCP | https://scanmcp.com |
| promptfoo | https://promptfoo.dev |
| CalypsoAI | https://calypsoai.com |
| Protect AI | https://protectai.com |
| Socket.dev | https://socket.dev |
| Snyk | https://snyk.io |
| Semgrep | https://semgrep.dev |
| Trivy | https://trivy.dev |
