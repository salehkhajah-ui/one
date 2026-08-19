import { describe, expect, it } from "vitest";
import { fromMajor } from "../../money";
import { calculateOneScore, type ScoreInput } from "../score";
import type { Goal } from "../types";

const goals: Goal[] = [
  {
    id: "g1",
    name: "Japan",
    emoji: "🇯🇵",
    targetMinor: fromMajor(1500),
    currentMinor: fromMajor(720),
    currency: "KWD",
    targetDate: "2027-03-01",
    priority: "high",
    deadlineFlexible: true,
    autoAllocate: true,
    status: "active",
  },
];

const base: ScoreInput = {
  currency: "KWD",
  protectBalanceMinor: fromMajor(650),
  essentialMonthlyMinor: fromMajor(620),
  incomeMinor: fromMajor(3600),
  spendMinor: fromMajor(3100),
  growMonthlyMinor: fromMajor(80),
  monthlyIncomeMinor: fromMajor(1200),
  goals,
  basis: "last 90 days",
};

describe("calculateOneScore", () => {
  it("stays within 0–100 with sensible components", () => {
    const s = calculateOneScore(base);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
    expect(s.components).toHaveLength(4);
    for (const c of s.components) {
      expect(c.value).toBeGreaterThanOrEqual(0);
      expect(c.value).toBeLessThanOrEqual(100);
      expect(c.formula.length).toBeGreaterThan(10); // transparent formulas required
    }
  });

  it("emergency component: ~1 month covered ≈ 35/100 vs 3-month benchmark", () => {
    const s = calculateOneScore(base);
    const emergency = s.components.find((c) => c.key === "emergency")!;
    expect(emergency.value).toBe(35); // (650/620)/3*100 ≈ 34.9 → 35
  });

  it("perfect inputs cap at 100", () => {
    const s = calculateOneScore({
      ...base,
      protectBalanceMinor: fromMajor(620 * 6),
      spendMinor: fromMajor(2000),
      growMonthlyMinor: fromMajor(200),
      goals: [{ ...goals[0], currentMinor: goals[0].targetMinor }],
    });
    expect(s.score).toBe(100);
  });

  it("zero income / zero data does not crash and floors at 0", () => {
    const s = calculateOneScore({
      ...base,
      incomeMinor: 0,
      spendMinor: 0,
      monthlyIncomeMinor: 0,
      protectBalanceMinor: 0,
      essentialMonthlyMinor: 0,
      growMonthlyMinor: 0,
      goals: [],
    });
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.bestNextMove.action.length).toBeGreaterThan(0);
  });

  it("best next move prioritizes safety (Protect) over investing", () => {
    const s = calculateOneScore(base); // emergency far from full, growth also low
    expect(s.bestNextMove.improves).toBe("emergency");
    expect(s.bestNextMove.action).toMatch(/Protect/);
  });

  it("suggests growth only after emergency is fully covered", () => {
    const s = calculateOneScore({
      ...base,
      protectBalanceMinor: fromMajor(620 * 3),
      spendMinor: fromMajor(2500),
      goals: [{ ...goals[0], currentMinor: fromMajor(1400) }],
    });
    expect(s.bestNextMove.improves).toBe("growth");
    expect(s.bestNextMove.action).not.toMatch(/must|need to/i); // encouraging, not coercive
  });
});
