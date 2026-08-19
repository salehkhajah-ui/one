import { describe, expect, it } from "vitest";
import { sumMinor } from "../../money";
import { buildDemoState } from "../../demo/state";
import { mockAIProvider } from "../../ai/mock";

// A fixed mid-month date keeps this test deterministic regardless of when it runs.
const NOW = new Date(2026, 7, 19); // 2026-08-19

describe("Demo Mode state", () => {
  const state = buildDemoState(NOW);

  it("anchors payday correctly", () => {
    expect(state.nextPaydayISO).toBe("2026-08-25");
    expect(state.daysToPayday).toBe(6);
  });

  it("generates months of realistic transactions including salary and recurring bills", () => {
    expect(state.transactions.length).toBeGreaterThan(100);
    expect(state.transactions.some((t) => t.category === "Income")).toBe(true);
    expect(state.transactions.some((t) => t.merchantNormalized === "netflix")).toBe(true);
    expect(state.transactions.some((t) => t.category === "Groceries")).toBe(true);
  });

  it("buckets decompose total cash exactly (every dinar has a job)", () => {
    expect(sumMinor(state.buckets.map((b) => b.amountMinor))).toBe(state.totalCashMinor);
  });

  it("safe to spend is coherent with the enjoy bucket", () => {
    const enjoy = state.buckets.find((b) => b.key === "enjoy")!;
    expect(enjoy.amountMinor).toBe(state.safeToSpend.discretionaryMinor);
    expect(state.safeToSpend.dailyMinor).toBeGreaterThan(0);
  });

  it("allocation sums to salary", () => {
    expect(sumMinor(state.allocation.items.map((i) => i.amountMinor))).toBe(1_200_000);
  });

  it("detects the Netflix price increase", () => {
    expect(state.secondaryInsight).not.toBeNull();
    expect(state.secondaryInsight!.type).toBe("subscription_increase");
  });

  it("found-money insight jobs sum to the available amount when present", () => {
    if (state.insight) {
      expect(sumMinor(state.insightJobs.map((j) => j.amountMinor))).toBe(state.insight.availableMinor);
    }
  });

  it("score is in range with four components", () => {
    expect(state.score.score).toBeGreaterThan(0);
    expect(state.score.score).toBeLessThanOrEqual(100);
    expect(state.score.components).toHaveLength(4);
  });

  it("worth-it evaluator works end to end", () => {
    const r = state.evaluatePurchase("Test phone", 300_000);
    expect(r.verdict).toBeTruthy();
    expect(r.alternatives.length).toBeGreaterThan(0);
  });
});

describe("MockAIProvider answers from engine data", () => {
  const state = buildDemoState(NOW);

  it("answers safe-to-spend questions with real numbers", () => {
    const a = mockAIProvider.answerFinancialQuestion("What can I safely spend this weekend?", state);
    expect(a.tool).toBe("getSafeToSpend");
    expect(a.card?.kind).toBe("safeToSpend");
  });

  it("simulates purchases from questions", () => {
    const a = mockAIProvider.answerFinancialQuestion("Can I afford a 300 KD phone?", state);
    expect(a.tool).toBe("simulatePurchase");
    expect(a.card?.kind).toBe("worthIt");
  });

  it("projects goal ETAs", () => {
    const a = mockAIProvider.answerFinancialQuestion("When will I reach my Japan goal?", state);
    expect(a.tool).toBe("getGoalProjection");
    expect(a.text).toMatch(/Japan/);
  });

  it("explains Protect allocation with the engine's reason", () => {
    const a = mockAIProvider.answerFinancialQuestion("Why did ONE allocate money to Protect?", state);
    expect(a.tool).toBe("explainAllocation");
    expect(a.text.length).toBeGreaterThan(30);
  });

  it("falls back honestly instead of inventing answers", () => {
    const a = mockAIProvider.answerFinancialQuestion("What's the meaning of life?", state);
    expect(a.tool).toBe("help");
    expect(a.text).toMatch(/mock|Demo Mode/i);
  });
});
