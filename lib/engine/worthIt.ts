/**
 * Worth It? — deterministic purchase simulation.
 * Answers affordability, impact, and timing. Never shames the user.
 */
import { clampNonNegative, formatMoney } from "../money";
import type { CurrencyCode } from "../money";
import { addDays } from "./dates";
import { goalDelayDays } from "./goals";
import { calculateSafeToSpend, safeToSpendAfterPurchase } from "./safeToSpend";
import type { Goal, SafeToSpendInput } from "./types";

export type WorthItVerdict = "yes_enjoy" | "yes_discretionary" | "delay_helps" | "protected_at_risk";

export interface WorthItAlternative {
  key: "buy_now" | "wait_payday" | "save_months" | "use_enjoy" | "reduce_goal";
  label: string;
  detail: string;
}

export interface WorthItInput {
  itemName: string;
  priceMinor: number;
  currency: CurrencyCode;
  safeToSpend: SafeToSpendInput;
  /** Enjoy money currently available */
  enjoyAvailableMinor: number;
  /** Enjoy money expected each month (for save-up timing) */
  enjoyMonthlyMinor: number;
  /** highest-priority active goal, for impact framing */
  topGoal: (Goal & { monthlyContributionMinor: number }) | null;
  growMonthlyMinor: number;
  todayISO: string;
  nextPaydayISO: string;
}

export interface WorthItResult {
  itemName: string;
  priceMinor: number;
  verdict: WorthItVerdict;
  /** can purchase without touching protected money (bills/essentials/protect) */
  affordableWithoutProtected: boolean;
  affordableFromEnjoy: boolean;
  dailySafeToSpendBeforeMinor: number;
  dailySafeToSpendAfterMinor: number;
  discretionaryAfterMinor: number;
  /** approximate delay to the top goal if the shortfall is diverted from it */
  goalDelayDays: number | null;
  goalName: string | null;
  /** grow contribution reduction this month if bought from current allocation */
  growReductionMinor: number;
  /** amount beyond the Enjoy balance that would come from Goals/Grow */
  shortfallBeyondEnjoyMinor: number;
  /** amount that would be diverted from the top goal */
  goalDivertedMinor: number;
  /** save-up horizon at the Enjoy pace, when applicable */
  monthsToSave: number | null;
  enjoyAvailableMinor: number;
  suggestedDateISO: string | null;
  headline: string;
  alternatives: WorthItAlternative[];
}

export function evaluateWorthIt(input: WorthItInput): WorthItResult {
  const { priceMinor, currency, itemName } = input;
  if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0) {
    throw new Error("worthIt: priceMinor must be a positive safe integer");
  }

  const before = calculateSafeToSpend(input.safeToSpend);
  const after = safeToSpendAfterPurchase(input.safeToSpend, priceMinor);

  const affordableFromEnjoy = priceMinor <= input.enjoyAvailableMinor;
  const affordableWithoutProtected = priceMinor <= before.discretionaryMinor;

  // Shortfall beyond Enjoy would in practice come out of Goals/Grow money.
  const shortfallBeyondEnjoy = clampNonNegative(priceMinor - input.enjoyAvailableMinor);
  const goalMonthly = input.topGoal?.monthlyContributionMinor ?? 0;
  const goalGrowTotal = goalMonthly + input.growMonthlyMinor;
  const goalShare =
    goalGrowTotal > 0 ? Math.round((shortfallBeyondEnjoy * goalMonthly) / goalGrowTotal) : 0;
  const growShare = clampNonNegative(Math.min(shortfallBeyondEnjoy - goalShare, input.growMonthlyMinor));
  const delay =
    input.topGoal && goalShare > 0 ? goalDelayDays(goalMonthly, Math.min(goalShare, goalMonthly)) : 0;

  // Timing: does waiting until payday (fresh Enjoy) cover it without touching goals?
  const coveredAfterPayday = priceMinor <= input.enjoyAvailableMinor + input.enjoyMonthlyMinor;
  const monthsToSave =
    input.enjoyMonthlyMinor > 0
      ? Math.ceil(shortfallBeyondEnjoy / input.enjoyMonthlyMinor)
      : null;

  let verdict: WorthItVerdict;
  let headline: string;
  let suggestedDateISO: string | null = null;

  if (affordableFromEnjoy) {
    verdict = "yes_enjoy";
    headline = `You can afford ${itemName} from Enjoy without touching protected money. Your goals stay exactly on track.`;
  } else if (affordableWithoutProtected) {
    verdict = "yes_discretionary";
    headline = `You can afford ${itemName} without touching protected money, but ${formatMoney(shortfallBeyondEnjoy, currency)} would come from this month's Goals/Grow pace.`;
    if (coveredAfterPayday) {
      verdict = "delay_helps";
      suggestedDateISO = input.nextPaydayISO;
      headline = `Buying ${itemName} today would divert ${formatMoney(shortfallBeyondEnjoy, currency)} from your goals. Waiting until payday avoids that.`;
    }
  } else {
    verdict = "protected_at_risk";
    suggestedDateISO =
      monthsToSave !== null && monthsToSave <= 6 ? addDays(input.todayISO, monthsToSave * 30) : null;
    headline = `${itemName} costs more than what's safely available right now — buying today would reach into protected money.`;
  }

  const alternatives: WorthItAlternative[] = [];
  if (affordableFromEnjoy) {
    alternatives.push({
      key: "use_enjoy",
      label: "Buy from Enjoy",
      detail: `Covered by your ${formatMoney(input.enjoyAvailableMinor, currency)} Enjoy balance. Guilt-free.`,
    });
  }
  if (affordableWithoutProtected && !affordableFromEnjoy) {
    alternatives.push({
      key: "buy_now",
      label: "Buy now",
      detail: `Possible without touching protected money; Safe to Spend drops to ${formatMoney(after.dailyMinor, currency)}/day.`,
    });
  }
  alternatives.push({
    key: "wait_payday",
    label: "Wait until payday",
    detail: coveredAfterPayday
      ? `Fresh Enjoy money on ${input.nextPaydayISO} covers it without touching goals.`
      : `Waiting spreads the impact across two pay periods.`,
  });
  if (monthsToSave !== null && monthsToSave >= 1 && !affordableFromEnjoy) {
    alternatives.push({
      key: "save_months",
      label: monthsToSave === 1 ? "Save for a month" : `Save for ${monthsToSave} months`,
      detail: `Setting aside Enjoy money covers it by then with zero goal impact.`,
    });
  }
  if (input.topGoal && goalShare > 0) {
    alternatives.push({
      key: "reduce_goal",
      label: `Use ${input.topGoal.name} money`,
      detail: `Diverting ${formatMoney(Math.min(goalShare, goalMonthly), currency)} delays ${input.topGoal.name} by about ${delay} days.`,
    });
  }

  return {
    itemName,
    priceMinor,
    verdict,
    affordableWithoutProtected,
    affordableFromEnjoy,
    dailySafeToSpendBeforeMinor: before.dailyMinor,
    dailySafeToSpendAfterMinor: after.dailyMinor,
    discretionaryAfterMinor: after.discretionaryMinor,
    goalDelayDays: input.topGoal && goalShare > 0 ? delay : null,
    goalName: input.topGoal?.name ?? null,
    growReductionMinor: growShare,
    shortfallBeyondEnjoyMinor: shortfallBeyondEnjoy,
    goalDivertedMinor: input.topGoal ? Math.min(goalShare, goalMonthly) : 0,
    monthsToSave,
    enjoyAvailableMinor: input.enjoyAvailableMinor,
    suggestedDateISO,
    headline,
    alternatives,
  };
}
