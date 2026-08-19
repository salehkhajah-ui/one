/**
 * Goal contribution and completion projection — deterministic.
 */
import { divideMinor } from "../money";
import { addDays, daysBetween, monthsBetween } from "./dates";
import type { Goal } from "./types";

export interface GoalContributionPlan {
  goalId: string;
  remainingMinor: number;
  /** months until targetDate (min 1); null when open-ended */
  monthsRemaining: number | null;
  requiredMonthlyMinor: number;
  /** false when the deadline requires more than a plausible contribution (deadline pressure) */
  feasible: boolean;
}

/** Open-ended goals get a gentle default pace: finish in 24 months. */
const DEFAULT_OPEN_ENDED_MONTHS = 24;

export function requiredMonthlyContribution(goal: Goal, todayISO: string): GoalContributionPlan {
  const remainingMinor = Math.max(0, goal.targetMinor - goal.currentMinor);
  if (remainingMinor === 0) {
    return { goalId: goal.id, remainingMinor: 0, monthsRemaining: null, requiredMonthlyMinor: 0, feasible: true };
  }

  let monthsRemaining: number | null = null;
  if (goal.targetDate) {
    monthsRemaining = Math.max(1, monthsBetween(todayISO, goal.targetDate));
  }
  const months = monthsRemaining ?? DEFAULT_OPEN_ENDED_MONTHS;
  const requiredMonthlyMinor = divideMinor(remainingMinor, months, "ceil");

  // Deadline pressure heuristic: infeasible when the deadline has passed
  // (monthsBetween clamped to 1 while remaining is large relative to target period).
  const feasible = goal.targetDate ? daysBetween(todayISO, goal.targetDate) > 0 : true;

  return { goalId: goal.id, remainingMinor, monthsRemaining, requiredMonthlyMinor, feasible };
}

export interface GoalProjection {
  goalId: string;
  /** ISO date when the goal completes at the given monthly pace; null if pace is 0 */
  projectedDate: string | null;
  /** days from today to projected completion; null if never */
  daysToComplete: number | null;
  onTrack: boolean | null;
}

export function projectGoalCompletion(
  goal: Goal,
  monthlyContributionMinor: number,
  todayISO: string,
): GoalProjection {
  const remaining = Math.max(0, goal.targetMinor - goal.currentMinor);
  if (remaining === 0) {
    return { goalId: goal.id, projectedDate: todayISO, daysToComplete: 0, onTrack: true };
  }
  if (monthlyContributionMinor <= 0) {
    return { goalId: goal.id, projectedDate: null, daysToComplete: null, onTrack: goal.targetDate ? false : null };
  }
  // Convert monthly pace to daily (30-day month) and project forward.
  const dailyPace = monthlyContributionMinor / 30;
  const daysToComplete = Math.ceil(remaining / dailyPace);
  const projectedDate = addDays(todayISO, daysToComplete);
  // 15-day grace absorbs the 30-day-month approximation so a goal funded at its
  // exact required pace is never nagged as "behind".
  const onTrack = goal.targetDate ? daysBetween(todayISO, goal.targetDate) + 15 >= daysToComplete : null;
  return { goalId: goal.id, projectedDate, daysToComplete, onTrack };
}

/** Extra days a goal is delayed if `divertedMinor` is taken away from it at the given monthly pace. */
export function goalDelayDays(monthlyContributionMinor: number, divertedMinor: number): number {
  if (divertedMinor <= 0) return 0;
  if (monthlyContributionMinor <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(divertedMinor / (monthlyContributionMinor / 30));
}
