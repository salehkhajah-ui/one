/**
 * Localized presentation builders — turn engine reason-codes and structured
 * results into strings in the active locale. The engine's own English strings
 * remain for audit/AI use; the UI always renders through these.
 */
import type { AppState } from "../../lib/app/state";
import type { AllocationItem, Category, MoneyInsight, OneScore, ScoreComponent } from "../../lib/engine/types";
import type { WorthItAlternative, WorthItResult } from "../../lib/engine/worthIt";
import { emergencyStageLabel, formatDateShort, money, t } from "../../lib/i18n";
import type { StringKey } from "../../lib/i18n-strings";

export function catLabel(category: Category): string {
  return t(`cat.${category}` as StringKey);
}

const GROW_PCT = { low: 45, moderate: 60, high: 70 } as const;

export function allocationReason(item: AllocationItem, state: AppState): string {
  switch (item.reasonCode) {
    case "essentials_estimate":
      return t("reason.life", { amount: money(state.profile.essentialMonthlyEstimateMinor) });
    case "known_obligations":
      return t("reason.bills", { amount: money(item.amountMinor) });
    case "below_stage_target":
      return t("reason.protect.gap", {
        current: money(state.emergency.currentMinor),
        stage: emergencyStageLabel(state.emergency.stage, state.profile.emergencyTargetMonths),
        target: money(state.emergency.stageTargetMinor),
      });
    case "stage_complete":
      return t("reason.protect.done", { stage: emergencyStageLabel(state.emergency.stage, state.profile.emergencyTargetMonths) });
    case "goal_pace": {
      const goal = state.goals.find((g) => g.id === item.goalId);
      return t("reason.goal", {
        name: goal?.name ?? "",
        amount: money(goal?.plan.requiredMonthlyMinor ?? item.amountMinor),
        date: goal?.targetDate ? t("reason.goal.for", { date: formatDateShort(goal.targetDate) }) : "",
      });
    }
    case "risk_based_split":
      return t("reason.grow", {
        pct: GROW_PCT[state.profile.riskPreference],
        risk: t(`risk.${state.profile.riskPreference}` as StringKey),
      });
    case "sustainable_enjoyment":
      return t("reason.enjoy", { amount: money(item.amountMinor) });
    default:
      return item.reason;
  }
}

export function scoreComponentLabel(c: ScoreComponent): string {
  return t(`score.${c.key}` as StringKey);
}

export function scoreFormula(c: ScoreComponent, hasHistory: boolean): string {
  if (c.key === "cashflow") {
    return t("score.f.cashflow", { basis: t(hasHistory ? "score.basis.history" : "score.basis.plan") });
  }
  return t(`score.f.${c.key}` as StringKey);
}

export function scoreMove(move: OneScore["bestNextMove"]): string {
  if (move.improves === "emergency" && move.amountMinor) {
    return t("score.move.emergency", { amount: money(move.amountMinor) });
  }
  if (move.improves === "cashflow") {
    return move.action.includes("strong shape") ? t("score.move.done") : t("score.move.cashflow");
  }
  return t(`score.move.${move.improves}` as StringKey);
}

export function insightTitle(i: MoneyInsight): string {
  if (i.type === "found_money") return t("insight.found.title", { amount: money(i.availableMinor) });
  if (i.type === "subscription_increase" && i.meta?.merchant) {
    return t("insight.subinc.title", { merchant: i.meta.merchant, amount: money(i.monthlyImpactMinor) });
  }
  return i.title;
}

export function insightDescription(i: MoneyInsight): string {
  if (i.type === "found_money" && i.meta) {
    return t("insight.found.desc", {
      category: i.meta.category ? catLabel(i.meta.category) : "",
      actual: money(i.meta.actualMinor ?? 0),
      expected: money(i.meta.expectedMinor ?? 0),
    });
  }
  if (i.type === "subscription_increase" && i.meta?.merchant) {
    return t("insight.subinc.desc", {
      merchant: i.meta.merchant,
      from: money(i.meta.fromMinor ?? 0),
      to: money(i.meta.toMinor ?? 0),
      annual: money(i.annualImpactMinor),
    });
  }
  return i.description;
}

export function worthItHeadline(r: WorthItResult): string {
  const params = { item: r.itemName, shortfall: money(r.shortfallBeyondEnjoyMinor) };
  return t(`wi.h.${r.verdict}` as StringKey, params);
}

export function worthItAlternative(a: WorthItAlternative, r: WorthItResult, nextPaydayISO: string): { label: string; detail: string } {
  switch (a.key) {
    case "use_enjoy":
      return { label: t("wi.a.use_enjoy"), detail: t("wi.a.use_enjoy.d", { amount: money(r.enjoyAvailableMinor) }) };
    case "buy_now":
      return { label: t("wi.a.buy_now"), detail: t("wi.a.buy_now.d", { daily: money(r.dailySafeToSpendAfterMinor) }) };
    case "wait_payday":
      return {
        label: t("wi.a.wait_payday"),
        detail: a.detail.includes("Fresh")
          ? t("wi.a.wait_payday.covered", { date: formatDateShort(nextPaydayISO) })
          : t("wi.a.wait_payday.spread"),
      };
    case "save_months":
      return {
        label: r.monthsToSave === 1 ? t("wi.a.save_months.1") : t("wi.a.save_months.n", { n: r.monthsToSave ?? 0 }),
        detail: t("wi.a.save_months.d"),
      };
    case "reduce_goal":
      return {
        label: t("wi.a.reduce_goal", { goal: r.goalName ?? "" }),
        detail: t("wi.a.reduce_goal.d", { amount: money(r.goalDivertedMinor), goal: r.goalName ?? "", days: r.goalDelayDays ?? 0 }),
      };
  }
}
