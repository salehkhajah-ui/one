/**
 * MockAIProvider — rule-based intent matching over the fixed tool surface.
 * Every number in every answer comes from the deterministic engine via DemoState.
 * Understands English and Arabic questions; answers follow the active locale.
 * A real LLM provider will implement the same interface behind env config
 * (Milestone 3) and will receive these same structured results to phrase.
 */
import { fromMajor } from "../money";
import { calculateCompoundProjection, SCENARIOS } from "../engine/projection";
import type { DemoState } from "../demo/state";
import { formatDateShort, money, t } from "../i18n";
import type { StringKey } from "../i18n-strings";
import type { AIProvider, ChatAnswer } from "./provider";

/** Map Arabic-Indic digits to Latin so amounts parse either way. */
function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => {
    const east = "٠١٢٣٤٥٦٧٨٩".indexOf(d);
    if (east >= 0) return String(east);
    return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  });
}

function extractAmountMinor(question: string): number | null {
  const m = normalizeDigits(question).replace(/,/g, "").match(/(\d+(?:\.\d{1,3})?)\s*(?:kd|kwd|dinar|دينار|د\.ك)?/i);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return fromMajor(value);
}

function hasAny(q: string, words: string[]): boolean {
  return words.some((w) => q.includes(w));
}

function answerSafeToSpend(state: DemoState): ChatAnswer {
  const s = state.safeToSpend;
  if (s.isConstrained) {
    return {
      tool: "getSafeToSpend",
      text: t("chat.a.stsConstrained", { shortfall: money(s.shortfallMinor, state.currency), days: state.daysToPayday }),
      card: { kind: "safeToSpend", dailyMinor: 0, daysRemaining: s.daysRemaining, discretionaryMinor: 0 },
    };
  }
  return {
    tool: "getSafeToSpend",
    text: t("chat.a.sts", {
      daily: money(s.dailyMinor, state.currency),
      total: money(s.discretionaryMinor, state.currency),
      days: s.daysRemaining,
    }),
    card: { kind: "safeToSpend", dailyMinor: s.dailyMinor, daysRemaining: s.daysRemaining, discretionaryMinor: s.discretionaryMinor },
  };
}

function answerAfford(question: string, state: DemoState): ChatAnswer {
  const price = extractAmountMinor(question);
  if (!price) {
    return { tool: "simulatePurchase", text: t("chat.a.affordAsk") };
  }
  const itemMatch =
    question.match(/afford (?:a |an |the )?([\w\s]+?)(?:\?|$|for|at)/i) ??
    question.match(/(?:أشتري|اشتري|اشترى|آخذ|اخذ)\s+(.+?)(?:\s*(?:بـ|ب)\s*[\d٠-٩]|\?|؟|$)/);
  const fallback = t("chat.a.thisItem");
  const item = itemMatch
    ? normalizeDigits(itemMatch[1]).trim().replace(/\d+(\.\d+)?\s*(kd|kwd|دينار)?/i, "").trim() || fallback
    : fallback;
  const result = state.evaluatePurchase(item, price);
  const text = t(`wi.h.${result.verdict}` as StringKey, {
    item: result.itemName,
    shortfall: money(result.shortfallBeyondEnjoyMinor, state.currency),
  });
  return { tool: "simulatePurchase", text, card: { kind: "worthIt", result } };
}

function answerGoalEta(question: string, state: DemoState): ChatAnswer {
  const q = question.toLowerCase();
  const goal =
    state.goals.find((g) => q.includes(g.name.toLowerCase().split(" ")[0])) ??
    state.goals.find((g) => g.priority === "high") ??
    state.goals[0];
  if (!goal) {
    return { tool: "getGoalProjection", text: t("chat.a.goalNone") };
  }
  const p = goal.projection;
  if (!p.projectedDate) {
    return {
      tool: "getGoalProjection",
      text: t("chat.a.goalNoPace", { name: goal.name, remaining: money(goal.targetMinor - goal.currentMinor, state.currency) }),
      card: { kind: "goal", goalId: goal.id },
    };
  }
  return {
    tool: "getGoalProjection",
    text: t("chat.a.goalEta", {
      name: goal.name,
      date: formatDateShort(p.projectedDate),
      days: p.daysToComplete ?? 0,
      current: money(goal.currentMinor, state.currency),
      target: money(goal.targetMinor, state.currency),
      pct: goal.progressPct,
      late: p.onTrack === false ? t("chat.a.goalLate") : "",
    }),
    card: { kind: "goal", goalId: goal.id },
  };
}

function answerCategorySpend(question: string, state: DemoState): ChatAnswer {
  const q = question.toLowerCase();
  const category =
    hasAny(q, ["eat", "dining", "restaurant", "coffee", "أكل", "مطعم", "مطاعم", "قهوة"])
      ? "Dining"
      : hasAny(q, ["grocer", "تموينات", "بقالة", "جمعية"])
        ? "Groceries"
        : hasAny(q, ["transport", "fuel", "petrol", "مواصلات", "بنزين", "وقود"])
          ? "Transport"
          : hasAny(q, ["shopping", "تسوق", "تسوّق"])
            ? "Shopping"
            : hasAny(q, ["subscription", "اشتراك"])
              ? "Subscriptions"
              : null;
  if (!category) {
    const top = state.monthSpendByCategory.slice(0, 3);
    return {
      tool: "getSpendingByCategory",
      text: t("chat.a.spendTop", {
        list: top.map((c) => `${t(`cat.${c.category}` as StringKey)} ${money(c.amountMinor, state.currency)}`).join(" · "),
      }),
    };
  }
  const found = state.monthSpendByCategory.find((c) => c.category === category);
  const label = t(`cat.${category}` as StringKey);
  return {
    tool: "getSpendingByCategory",
    text: found
      ? t("chat.a.spendCat", { amount: money(found.amountMinor, state.currency), category: label })
      : t("chat.a.spendCatNone", { category: label }),
  };
}

function answerWhyProtect(state: DemoState): ChatAnswer {
  const item = state.allocation.items.find((i) => i.bucket === "protect");
  if (!item) return { tool: "explainAllocation", text: t("chat.a.protectNone") };
  if (item.reasonCode === "below_stage_target") {
    return {
      tool: "explainAllocation",
      text: t("reason.protect.gap", {
        current: money(state.emergency.currentMinor, state.currency),
        stage: state.emergency.stageLabel,
        target: money(state.emergency.stageTargetMinor, state.currency),
      }),
    };
  }
  if (item.reasonCode === "stage_complete") {
    return { tool: "explainAllocation", text: t("reason.protect.done", { stage: state.emergency.stageLabel }) };
  }
  return { tool: "explainAllocation", text: item.reason };
}

function answerWhyLower(state: DemoState): ChatAnswer {
  const b = state.safeToSpendInput;
  return {
    tool: "explainSafeToSpend",
    text: t("chat.a.whyLower", {
      cash: money(b.availableCashMinor, state.currency),
      bills: money(b.reservedBillsMinor, state.currency),
      essentials: money(b.essentialsRemainingMinor, state.currency),
      days: state.daysToPayday,
      buffer: money(b.safetyBufferMinor, state.currency),
      goals: money(b.goalCommitmentsMinor, state.currency),
      growth: money(b.plannedGrowthMinor, state.currency),
      disc: money(state.safeToSpend.discretionaryMinor, state.currency),
    }),
  };
}

function answerIncreaseGrow(question: string, state: DemoState): ChatAnswer {
  const delta = extractAmountMinor(question) ?? fromMajor(50);
  const years = 10;
  const base = SCENARIOS.find((s) => s.key === "base")!;
  const current = calculateCompoundProjection(0, state.growMonthlyMinor, years, base);
  const increased = calculateCompoundProjection(0, state.growMonthlyMinor + delta, years, base);
  const diff = increased.futureValueMinor - current.futureValueMinor;
  return {
    tool: "projectGrowth",
    text: t("chat.a.growDelta", {
      delta: money(delta, state.currency),
      diff: money(diff, state.currency),
      years,
      rate: base.annualReturnPct,
    }),
    card: {
      kind: "projection",
      monthlyMinor: state.growMonthlyMinor + delta,
      years,
      futureValueMinor: increased.futureValueMinor,
      scenarioLabel: t("grow.base"),
      ratePct: base.annualReturnPct,
    },
  };
}

function answerSaveTarget(question: string, state: DemoState): ChatAnswer {
  const target = extractAmountMinor(question) ?? fromMajor(500);
  const monthlyCapacity = state.enjoyMonthlyMinor + state.growMonthlyMinor;
  const months = monthlyCapacity > 0 ? Math.ceil(target / monthlyCapacity) : null;
  if (months === null) return { tool: "planSaving", text: t("chat.a.saveNone") };
  const gentle = Math.ceil(target / Math.max(1, state.growMonthlyMinor + Math.floor(state.enjoyMonthlyMinor / 2)));
  return {
    tool: "planSaving",
    text: t("chat.a.save", { target: money(target, state.currency), monthly: money(monthlyCapacity, state.currency), months, gentle }),
  };
}

export const mockAIProvider: AIProvider = {
  name: "MockAIProvider",
  answerFinancialQuestion(question: string, state: DemoState): ChatAnswer {
    const q = normalizeDigits(question.toLowerCase());
    const why = hasAny(q, ["why", "ليش", "لماذا", "ليه"]);
    if (hasAny(q, ["afford", "worth it", "buy", "أقدر أشتري", "اقدر اشتري", "اشتري", "أشتري", "آخذ", "اخذ", "يستاهل", "يسوى", "على قدي", "شراء"]))
      return answerAfford(question, state);
    if (why && hasAny(q, ["lower", "safe to spend", "أقل", "اقل", "انخفض", "المتاح"])) return answerWhyLower(state);
    if (why && hasAny(q, ["protect", "حماية", "للحماية"])) return answerWhyProtect(state);
    if (hasAny(q, ["increase", "زود", "زدت", "زيادة", "أزيد", "ازيد", "ماذا لو"]) && hasAny(q, ["grow", "نمو", "النمو"]))
      return answerIncreaseGrow(question, state);
    if (hasAny(q, ["save", "وفر", "أوفر", "اوفر", "ادخر", "أدخر", "ادّخر"]) && extractAmountMinor(question))
      return answerSaveTarget(question, state);
    if (hasAny(q, ["goal", "japan", "car", "reach", "هدف", "هدفي", "اليابان", "سيارة", "أوصل", "اوصل", "متى"]))
      return answerGoalEta(question, state);
    if (hasAny(q, ["spent", "spend on", "spending", "صرفت", "كم صرفت"])) return answerCategorySpend(question, state);
    if (hasAny(q, ["spend", "weekend", "today", "dinner", "أصرف", "اصرف", "ويكند", "نهاية الأسبوع", "اليوم", "عشاء"]))
      return answerSafeToSpend(state);
    return { tool: "help", text: t("chat.a.help") };
  },
};
