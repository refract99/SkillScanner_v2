/**
 * Scoring module — converts findings into a 0–100 risk score and verdict.
 *
 * Score starts at 100 (perfectly clean) and deductions are applied per finding.
 * Tier 1 findings carry heavier weight because they are deterministic PASS/FAIL.
 *
 * Verdict thresholds (per PRD):
 *   90–100 → Safe
 *   70–89  → Caution
 *   40–69  → Risky
 *   0–39   → Dangerous
 */

import type { Tier1Finding } from "./tier1";
import type { Tier2Finding } from "./tier2";

export type Verdict = "safe" | "caution" | "risky" | "dangerous";

export interface ScanScore {
  score: number;
  verdict: Verdict;
}

// Deduction points per finding, by tier × severity.
const DEDUCTIONS: Record<number, Record<string, number>> = {
  1: { critical: 30, high: 20, medium: 10 },
  2: { critical: 20, high: 12, medium: 6, low: 3 },
  3: { critical: 5, high: 3, medium: 1, low: 0 },
};

// Maximum total deduction per category to prevent a single noisy rule from
// collapsing the score entirely (e.g., 50 eval() calls in test files).
const MAX_DEDUCTION_PER_CATEGORY = 50;

function verdictFromScore(score: number): Verdict {
  if (score >= 90) return "safe";
  if (score >= 70) return "caution";
  if (score >= 40) return "risky";
  return "dangerous";
}

// Confidence multipliers for Tier 2 AI findings — scale down uncertain results.
const CONFIDENCE_MULTIPLIER: Record<string, number> = {
  high: 1.0,
  medium: 0.5,
  low: 0.25,
};

/**
 * Calculate a risk score from Tier 1 and (optionally) Tier 2 findings.
 *
 * Tier 1 findings are deterministic — full deduction applied.
 * Tier 2 findings are AI-inferred — deduction is scaled by confidence.
 */
export function calculateScore(
  tier1Findings: Tier1Finding[],
  tier2Findings: Tier2Finding[] = []
): ScanScore {
  // Group deductions by category to apply per-category cap.
  const deductionByCategory = new Map<string, number>();

  for (const finding of tier1Findings) {
    const deduction = DEDUCTIONS[1][finding.severity] ?? 0;
    const current = deductionByCategory.get(finding.category) ?? 0;
    deductionByCategory.set(finding.category, current + deduction);
  }

  for (const finding of tier2Findings) {
    const base = DEDUCTIONS[2][finding.severity] ?? 0;
    const multiplier = CONFIDENCE_MULTIPLIER[finding.confidence] ?? 0.5;
    const deduction = base * multiplier;
    const current = deductionByCategory.get(finding.category) ?? 0;
    deductionByCategory.set(finding.category, current + deduction);
  }

  // Apply per-category cap and sum total deductions.
  let totalDeduction = 0;
  for (const [, deduction] of deductionByCategory) {
    totalDeduction += Math.min(deduction, MAX_DEDUCTION_PER_CATEGORY);
  }

  const score = Math.max(0, 100 - totalDeduction);
  return { score, verdict: verdictFromScore(score) };
}
