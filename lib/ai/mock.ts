/**
 * MockAIProvider — rule-based intent matching over the fixed tool surface.
 * Every number in every answer comes from the deterministic engine via DemoState.
 * A real LLM provider will implement the same interface behind env config
 * (Milestone 3) and will receive these same structured results to phrase.
 */
import { formatMoney, fromMajor } from "../money";
import { calculateCompoundProjection, SCENARIOS } from "../engine/projection";
import type { DemoState } from "../demo/state";
import type { AIProvider, ChatAnswer } from "./provider";

function extractAmountMinor(question: string): number | null {
  const m = question.replace(/,/g, "").match(/(\d+(?:\.\d{1,3})?)\s*(?:kd|kwd|dinar)?/i);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return fromMajor(value);
}

function answerSafeToSpend(state: DemoState): ChatAnswer {
  const s = state.safeToSpend;
  if (s.isConstrained) {
    return {
      tool: "getSafeToSpend",
      text: `Right now your commitments are ${formatMoney(s.shortfallMinor, state.currency)} ahead of your available cash, so Safe to Spend is 0 until payday (${state.daysToPayday} days away). Your bills and essentials stay protected — that's the system working.`,
      card: { kind: "safeToSpend", dailyMinor: 0, daysRemaining: s.daysRemaining, discretionaryMinor: 0 },
    };
  }
  return {
    tool: "getSafeToSpend",
    text: `You can safely spend about ${formatMoney(s.dailyMinor, state.currency)} per day — ${formatMoney(s.discretionaryMinor, state.currency)} in total until payday in ${s.daysRemaining} days. Bills, essentials, Protect, your goals and Grow are already set aside.`,
    card: { kind: "safeToSpend", dailyMinor: s.dailyMinor, daysRemaining: s.daysRemaining, discretionaryMinor: s.discretionaryMinor },
  };
}

function answerAfford(question: string, state: DemoState): ChatAnswer {
  const price = extractAmountMinor(question);
  if (!price) {
    return {
      tool: "simulatePurchase",
      text: "Tell me the price and I'll run it through your plan — for example: “Can I afford a 300 KD phone?”",
    };
  }
  const itemMatch = question.match(/afford (?:a |an |the )?([\w\s]+?)(?:\?|$|for|at)/i);
  const item = itemMatch ? itemMatch[1].trim().replace(/\d+(\.\d+)?\s*(kd|kwd)?/i, "").trim() || "this" : "this";
  const result = state.evaluatePurchase(item, price);
  return { tool: "simulatePurchase", text: result.headline, card: { kind: "worthIt", result } };
}

function answerGoalEta(question: string, state: DemoState): ChatAnswer {
  const goal =
    state.goals.find((g) => question.toLowerCase().includes(g.name.toLowerCase().split(" ")[0])) ??
    state.goals.find((g) => g.priority === "high") ??
    state.goals[0];
  if (!goal) {
    return { tool: "getGoalProjection", text: "You don't have any goals yet. Create one on the Goals tab and I'll track the pace for you." };
  }
  const p = goal.projection;
  if (!p.projectedDate) {
    return {
      tool: "getGoalProjection",
      text: `${goal.name} has ${formatMoney(goal.targetMinor - goal.currentMinor, state.currency)} to go, but nothing is currently flowing into it. Adding it to your payday plan gives it a completion date.`,
      card: { kind: "goal", goalId: goal.id },
    };
  }
  return {
    tool: "getGoalProjection",
    text: `At your current pace, you're on track to reach ${goal.name} around ${p.projectedDate} (about ${p.daysToComplete} days). You've saved ${formatMoney(goal.currentMinor, state.currency)} of ${formatMoney(goal.targetMinor, state.currency)} — ${goal.progressPct}%.${p.onTrack === false ? " That lands after your target date; a small monthly increase would close the gap." : ""}`,
    card: { kind: "goal", goalId: goal.id },
  };
}

function answerCategorySpend(question: string, state: DemoState): ChatAnswer {
  const q = question.toLowerCase();
  const category = q.includes("eat") || q.includes("dining") || q.includes("restaurant") || q.includes("coffee")
    ? "Dining"
    : q.includes("grocer")
      ? "Groceries"
      : q.includes("transport") || q.includes("fuel") || q.includes("petrol")
        ? "Transport"
        : q.includes("shopping")
          ? "Shopping"
          : q.includes("subscription")
            ? "Subscriptions"
            : null;
  if (!category) {
    const top = state.monthSpendByCategory.slice(0, 3);
    return {
      tool: "getSpendingByCategory",
      text: `This month so far: ${top.map((t) => `${t.category} ${formatMoney(t.amountMinor, state.currency)}`).join(" · ")}. Ask about a specific category for detail.`,
    };
  }
  const found = state.monthSpendByCategory.find((c) => c.category === category);
  return {
    tool: "getSpendingByCategory",
    text: found
      ? `You've spent ${formatMoney(found.amountMinor, state.currency)} on ${category.toLowerCase()} this month.`
      : `No ${category.toLowerCase()} spending recorded this month.`,
  };
}

function answerWhyProtect(state: DemoState): ChatAnswer {
  const item = state.allocation.items.find((i) => i.bucket === "protect");
  return {
    tool: "explainAllocation",
    text: item ? item.reason : "Protect isn't part of the current plan.",
  };
}

function answerWhyLower(state: DemoState): ChatAnswer {
  const b = state.safeToSpendInput;
  return {
    tool: "explainSafeToSpend",
    text: `Safe to Spend is what's left after protecting everything else. From ${formatMoney(b.availableCashMinor, state.currency)} available: ${formatMoney(b.reservedBillsMinor, state.currency)} bills due before payday, ${formatMoney(b.essentialsRemainingMinor, state.currency)} essentials for the next ${state.daysToPayday} days, ${formatMoney(b.safetyBufferMinor, state.currency)} cash buffer, ${formatMoney(b.goalCommitmentsMinor, state.currency)} goal pace and ${formatMoney(b.plannedGrowthMinor, state.currency)} Grow plan. What remains — ${formatMoney(state.safeToSpend.discretionaryMinor, state.currency)} — is spread across the days until payday.`,
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
    text: `Adding ${formatMoney(delta, state.currency)}/month to Grow could hypothetically mean about ${formatMoney(diff, state.currency)} more after ${years} years (base scenario, ${base.annualReturnPct}% annual, not guaranteed). Worth checking your Enjoy balance first — sustainable beats maximal.`,
    card: {
      kind: "projection",
      monthlyMinor: state.growMonthlyMinor + delta,
      years,
      futureValueMinor: increased.futureValueMinor,
      scenarioLabel: base.label,
      ratePct: base.annualReturnPct,
    },
  };
}

function answerSaveTarget(question: string, state: DemoState): ChatAnswer {
  const target = extractAmountMinor(question) ?? fromMajor(500);
  const monthlyCapacity = state.enjoyMonthlyMinor + state.growMonthlyMinor;
  const months = monthlyCapacity > 0 ? Math.ceil(target / monthlyCapacity) : null;
  return {
    tool: "planSaving",
    text:
      months !== null
        ? `To put aside ${formatMoney(target, state.currency)}: redirecting your Enjoy + Grow flow (${formatMoney(monthlyCapacity, state.currency)}/month) gets there in about ${months} month${months > 1 ? "s" : ""}. A gentler split — half of Enjoy plus Grow — takes roughly ${Math.ceil(target / Math.max(1, state.growMonthlyMinor + Math.floor(state.enjoyMonthlyMinor / 2)))} months and still leaves room to live.`
        : `Your current plan has no spare monthly flow to redirect. After payday, we can carve a saving line into the allocation.`,
  };
}

export const mockAIProvider: AIProvider = {
  name: "MockAIProvider",
  answerFinancialQuestion(question: string, state: DemoState): ChatAnswer {
    const q = question.toLowerCase();
    if (q.includes("afford") || q.includes("worth it") || q.includes("buy")) return answerAfford(question, state);
    if (q.includes("why") && (q.includes("lower") || q.includes("safe to spend"))) return answerWhyLower(state);
    if (q.includes("why") && q.includes("protect")) return answerWhyProtect(state);
    if (q.includes("increase") && q.includes("grow")) return answerIncreaseGrow(question, state);
    if (q.includes("save") && extractAmountMinor(question)) return answerSaveTarget(question, state);
    if (q.includes("goal") || q.includes("japan") || q.includes("car") || q.includes("reach")) return answerGoalEta(question, state);
    if (q.includes("spent") || q.includes("spend on") || q.includes("spending")) return answerCategorySpend(question, state);
    if (q.includes("spend") || q.includes("weekend") || q.includes("today") || q.includes("dinner")) return answerSafeToSpend(state);
    return {
      tool: "help",
      text: "I can answer from your actual numbers — try “What can I safely spend this weekend?”, “Can I afford a 300 KD phone?”, “When will I reach my Japan goal?”, or “Why did ONE allocate money to Protect?” (Demo Mode uses a mock assistant; the full ONE assistant arrives with a configured AI provider.)",
    };
  },
};
