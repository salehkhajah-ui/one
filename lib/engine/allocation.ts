/**
 * Payday allocation engine — deterministic waterfall.
 * Objective: maximize long-term financial wellbeing while maintaining safety,
 * liquidity and realistic quality of life (never blindly maximize investing).
 * Sequence: essentials → bills/debt → protection → goals → growth/enjoy split.
 * See docs/FINANCIAL_ENGINE.md.
 */
import { allocateProportionally, clampNonNegative, formatMoney, percentOf, sumMinor } from "../money";
import type { CurrencyCode } from "../money";
import type { AllocationItem, AllocationRecommendation, FinancialProfile, Goal } from "./types";
import { calculateEmergencyStatus } from "./emergency";
import { requiredMonthlyContribution } from "./goals";

export const ENGINE_VERSION = "0.1.0";

/** While below the current emergency stage, direct this share of income to Protect. */
const PROTECT_INCOME_BPS = 1_200; // 12%

/** After goals, split the remainder between Grow and Enjoy by risk preference. */
const GROW_ENJOY_WEIGHTS: Record<FinancialProfile["riskPreference"], [number, number]> = {
  low: [45, 55],
  moderate: [60, 40],
  high: [70, 30],
};

export interface AllocationInput {
  incomeMinor: number;
  currency: CurrencyCode;
  profile: FinancialProfile;
  /** bills + debt payments expected before next income */
  billsDueMinor: number;
  protectCurrentMinor: number;
  goals: Goal[];
  /** ISO date used for goal deadline math */
  todayISO: string;
}

export function calculateAllocation(input: AllocationInput): AllocationRecommendation {
  const { incomeMinor, currency, profile, billsDueMinor, protectCurrentMinor, goals, todayISO } = input;
  if (!Number.isSafeInteger(incomeMinor) || incomeMinor < 0) {
    throw new Error("allocation: incomeMinor must be a non-negative safe integer");
  }

  const items: AllocationItem[] = [];
  let remaining = incomeMinor;

  // 1. LIFE — essential everyday spending
  const life = Math.min(remaining, profile.essentialMonthlyEstimateMinor);
  remaining -= life;
  items.push({
    bucket: "life",
    amountMinor: life,
    priority: 1,
    reasonCode: "essentials_estimate",
    reason: `Your estimated essential spending is ${formatMoney(profile.essentialMonthlyEstimateMinor, currency)}/month. Life is funded first so daily needs are never at risk.`,
    confidence: "high",
  });

  // 2. BILLS — known obligations incl. debt payments
  const billsTarget = billsDueMinor + profile.debtPaymentsMinor;
  const bills = Math.min(remaining, billsTarget);
  remaining -= bills;
  items.push({
    bucket: "bills",
    amountMinor: bills,
    priority: 2,
    reasonCode: "known_obligations",
    reason:
      profile.debtPaymentsMinor > 0
        ? `Known bills of ${formatMoney(billsDueMinor, currency)} plus debt payments of ${formatMoney(profile.debtPaymentsMinor, currency)} are reserved before anything else is allocated.`
        : `Known upcoming bills total ${formatMoney(billsDueMinor, currency)}. Reserving them prevents surprises later in the month.`,
    confidence: "high",
  });

  // 3. PROTECT — emergency reserve while below the current stage target
  const emergency = calculateEmergencyStatus(
    protectCurrentMinor,
    profile.essentialMonthlyEstimateMinor,
    profile.emergencyTargetMonths,
  );
  const protectTarget =
    emergency.stageGapMinor > 0
      ? Math.min(percentOf(incomeMinor, PROTECT_INCOME_BPS), emergency.stageGapMinor)
      : 0;
  const protect = Math.min(remaining, protectTarget);
  remaining -= protect;
  items.push({
    bucket: "protect",
    amountMinor: protect,
    priority: 3,
    reasonCode: emergency.stageGapMinor > 0 ? "below_stage_target" : "stage_complete",
    reason:
      emergency.stageGapMinor > 0
        ? `Your Protect balance is ${formatMoney(protectCurrentMinor, currency)}, below your current milestone (${emergency.stageLabel}: ${formatMoney(emergency.stageTargetMinor, currency)}). ONE prioritizes Protect before increasing Grow.`
        : `Your emergency reserve already covers its current milestone (${emergency.stageLabel}), so this payday nothing extra is needed here.`,
    confidence: "high",
  });

  // 4. GOALS — fund required monthly contributions, weighted by priority when short
  const activeGoals = goals.filter((g) => g.status === "active" && g.autoAllocate);
  const goalNeeds = activeGoals.map((g) => requiredMonthlyContribution(g, todayISO));
  const goalNeedTotal = sumMinor(goalNeeds.map((n) => n.requiredMonthlyMinor));
  const goalsBudget = Math.min(remaining, goalNeedTotal);
  const priorityWeight = { high: 3, medium: 2, low: 1 } as const;
  const goalAmounts =
    goalsBudget === goalNeedTotal
      ? goalNeeds.map((n) => n.requiredMonthlyMinor)
      : allocateProportionally(
          goalsBudget,
          activeGoals.map((g, i) => priorityWeight[g.priority] * Math.max(1, goalNeeds[i].requiredMonthlyMinor)),
        );
  activeGoals.forEach((g, i) => {
    items.push({
      bucket: "goals",
      goalId: g.id,
      amountMinor: goalAmounts[i] ?? 0,
      priority: 4,
      reasonCode: "goal_pace",
      reason: goalNeeds[i].feasible
        ? `${g.name} needs about ${formatMoney(goalNeeds[i].requiredMonthlyMinor, currency)}/month to stay on pace${g.targetDate ? ` for ${g.targetDate}` : ""}.`
        : `${g.name}'s deadline needs more than this plan can allocate; contributing what fits and flagging the timeline.`,
      confidence: goalNeeds[i].feasible ? "high" : "medium",
    });
  });
  remaining -= sumMinor(goalAmounts);

  // 5 & 6. GROW / ENJOY — split what remains by risk preference (sustainable enjoyment is deliberate)
  const [growW, enjoyW] = GROW_ENJOY_WEIGHTS[profile.riskPreference];
  const [grow, enjoy] = allocateProportionally(clampNonNegative(remaining), [growW, enjoyW]);
  items.push({
    bucket: "grow",
    amountMinor: grow,
    priority: 5,
    reasonCode: "risk_based_split",
    reason: `With safety and goals funded, ${growW}% of the remainder goes to long-term growth based on your ${profile.riskPreference} risk preference. This is an educational allocation — ONE does not execute investments.`,
    confidence: "medium",
  });
  items.push({
    bucket: "enjoy",
    amountMinor: enjoy,
    priority: 6,
    reasonCode: "sustainable_enjoyment",
    reason: `Enjoy money is deliberate: ${formatMoney(enjoy, currency)} is yours guilt-free. Plans that leave no room for life don't last.`,
    confidence: "high",
  });
  remaining = 0;

  const rec: AllocationRecommendation = {
    totalMinor: incomeMinor,
    currency,
    items,
    engineVersion: ENGINE_VERSION,
  };

  // Invariant: items must sum exactly to income.
  const total = sumMinor(items.map((i) => i.amountMinor));
  if (total !== incomeMinor) {
    throw new Error(`allocation invariant violated: items sum ${total} !== income ${incomeMinor}`);
  }
  return rec;
}

/** Sum allocation items into per-bucket totals (goals collapse into one number). */
export function bucketTotals(rec: AllocationRecommendation): Record<string, number> {
  const totals: Record<string, number> = { life: 0, bills: 0, protect: 0, grow: 0, goals: 0, enjoy: 0 };
  for (const item of rec.items) totals[item.bucket] += item.amountMinor;
  return totals;
}
