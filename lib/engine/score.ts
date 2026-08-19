/**
 * ONE Score — financial resilience, 0–100. NOT a credit score.
 * Every component has a transparent formula returned with its actual inputs.
 * The best next move must never manipulate users into investing to raise the score.
 */
import { formatMoney, fromMajor } from "../money";
import type { CurrencyCode } from "../money";
import type { Goal, OneScore, ScoreComponent } from "./types";

export interface ScoreInput {
  currency: CurrencyCode;
  protectBalanceMinor: number;
  essentialMonthlyMinor: number;
  /** total income over the lookback period */
  incomeMinor: number;
  /** total spending over the lookback period */
  spendMinor: number;
  /** monthly amount currently allocated to Grow */
  growMonthlyMinor: number;
  monthlyIncomeMinor: number;
  goals: Goal[];
  /** e.g. "last 90 days" — shown with formulas */
  basis: string;
}

const WEIGHTS = { emergency: 30, cashflow: 25, growth: 20, goals: 25 } as const;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function calculateOneScore(input: ScoreInput): OneScore {
  const {
    currency,
    protectBalanceMinor,
    essentialMonthlyMinor,
    incomeMinor,
    spendMinor,
    growMonthlyMinor,
    monthlyIncomeMinor,
    goals,
    basis,
  } = input;

  // Emergency readiness: months of essentials covered vs 3-month benchmark.
  const monthsCovered = essentialMonthlyMinor > 0 ? protectBalanceMinor / essentialMonthlyMinor : 0;
  const emergency: ScoreComponent = {
    key: "emergency",
    label: "Emergency",
    value: clamp100((monthsCovered / 3) * 100),
    formula: `Months of essentials covered (${monthsCovered.toFixed(1)}) ÷ 3-month benchmark × 100. Protect balance ${formatMoney(protectBalanceMinor, currency)} ÷ essentials ${formatMoney(essentialMonthlyMinor, currency)}/month.`,
  };

  // Cash flow stability: savings rate over the lookback period, 20% rate = 100.
  const savingsRate = incomeMinor > 0 ? (incomeMinor - spendMinor) / incomeMinor : 0;
  const cashflow: ScoreComponent = {
    key: "cashflow",
    label: "Cash Flow",
    value: clamp100((savingsRate / 0.2) * 100),
    formula: `Savings rate (${(savingsRate * 100).toFixed(0)}%) ÷ 20% benchmark × 100, based on ${basis}.`,
  };

  // Growth consistency: monthly Grow allocation vs 10% of income benchmark.
  const growRate = monthlyIncomeMinor > 0 ? growMonthlyMinor / monthlyIncomeMinor : 0;
  const growth: ScoreComponent = {
    key: "growth",
    label: "Growth",
    value: clamp100((growRate / 0.1) * 100),
    formula: `Grow allocation (${(growRate * 100).toFixed(0)}% of income) ÷ 10% benchmark × 100.`,
  };

  // Goal progress: average completion of active goals.
  const activeGoals = goals.filter((g) => g.status === "active");
  const avgProgress =
    activeGoals.length > 0
      ? activeGoals.reduce((acc, g) => acc + (g.targetMinor > 0 ? g.currentMinor / g.targetMinor : 0), 0) /
        activeGoals.length
      : 0;
  const goalsComponent: ScoreComponent = {
    key: "goals",
    label: "Goals",
    value: clamp100(avgProgress * 100),
    formula:
      activeGoals.length > 0
        ? `Average progress across ${activeGoals.length} active goal${activeGoals.length > 1 ? "s" : ""} (${(avgProgress * 100).toFixed(0)}%).`
        : "No active goals yet — creating one gives this component a value.",
  };

  const components = [emergency, cashflow, growth, goalsComponent];
  const score = clamp100(
    (emergency.value * WEIGHTS.emergency +
      cashflow.value * WEIGHTS.cashflow +
      growth.value * WEIGHTS.growth +
      goalsComponent.value * WEIGHTS.goals) /
      100,
  );

  // Best next move: the weakest SAFETY-first component. Emergency and cash flow
  // take precedence over growth so the score never pushes investing over safety.
  const bestNextMove = pickBestNextMove(components, input);

  return { score, components, bestNextMove };
}

function pickBestNextMove(components: ScoreComponent[], input: ScoreInput): OneScore["bestNextMove"] {
  const byKey = Object.fromEntries(components.map((c) => [c.key, c])) as Record<
    ScoreComponent["key"],
    ScoreComponent
  >;

  if (byKey.emergency.value < 100) {
    const suggestion = Math.min(
      Math.max(fromMajor(10, input.currency), Math.round(input.monthlyIncomeMinor * 0.03)),
      Math.max(0, input.essentialMonthlyMinor * 3 - input.protectBalanceMinor),
    );
    return {
      action: `Add ${formatMoney(suggestion, input.currency)} to Protect to strengthen your emergency cover.`,
      improves: "emergency",
      amountMinor: suggestion,
    };
  }
  if (byKey.cashflow.value < 60) {
    return { action: "Review this month's spending pace — a small reduction lifts your cash-flow stability.", improves: "cashflow" };
  }
  if (byKey.goals.value < 60 && input.goals.some((g) => g.status === "active")) {
    return { action: "A small extra contribution to your top goal keeps it on pace.", improves: "goals" };
  }
  if (byKey.growth.value < 100) {
    return { action: "With safety covered, a modest increase to Grow builds long-term momentum.", improves: "growth" };
  }
  return { action: "You're in strong shape. Keep your current rhythm.", improves: "cashflow" };
}
