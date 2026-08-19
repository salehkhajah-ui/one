import { describe, expect, it } from "vitest";
import { fromMajor, sumMinor } from "../../money";
import { bucketTotals, calculateAllocation, type AllocationInput } from "../allocation";
import type { FinancialProfile, Goal } from "../types";

const profile: FinancialProfile = {
  userId: "u1",
  displayName: "Omar",
  monthlyIncomeMinor: fromMajor(1200),
  incomeType: "salary",
  payFrequency: "monthly",
  paydayDayOfMonth: 25,
  essentialMonthlyEstimateMinor: fromMajor(480),
  housingCostMinor: fromMajor(0),
  debtPaymentsMinor: 0,
  emergencyTargetMonths: 3,
  minimumCashBufferMinor: fromMajor(100),
  riskPreference: "moderate",
  investmentExperience: "new",
  preferredCurrency: "KWD",
  country: "KW",
};

const goals: Goal[] = [
  {
    id: "g-japan",
    name: "Japan Trip",
    emoji: "🇯🇵",
    targetMinor: fromMajor(1500),
    currentMinor: fromMajor(450),
    currency: "KWD",
    targetDate: "2027-03-01",
    priority: "high",
    deadlineFlexible: true,
    autoAllocate: true,
    status: "active",
  },
];

const input: AllocationInput = {
  incomeMinor: fromMajor(1200),
  currency: "KWD",
  profile,
  billsDueMinor: fromMajor(220),
  protectCurrentMinor: fromMajor(400),
  goals,
  todayISO: "2026-08-19",
};

describe("calculateAllocation", () => {
  it("items always sum exactly to income (KWD fils precision)", () => {
    for (const income of [1200, 1500, 1247.5, 999.999, 350, 0.001]) {
      const rec = calculateAllocation({ ...input, incomeMinor: fromMajor(income) });
      expect(sumMinor(rec.items.map((i) => i.amountMinor))).toBe(fromMajor(income));
    }
  });

  it("funds essentials and bills first", () => {
    const rec = calculateAllocation(input);
    const t = bucketTotals(rec);
    expect(t.life).toBe(fromMajor(480));
    expect(t.bills).toBe(fromMajor(220));
  });

  it("contributes toward Protect while below stage target, capped at the stage gap", () => {
    const rec = calculateAllocation(input);
    const t = bucketTotals(rec);
    // Stage: 1 month of essentials (480). Gap = 480 - 400 = 80, below 12% of income (144) → capped at 80.
    expect(t.protect).toBe(fromMajor(80));
  });

  it("contributes the full 12% of income when the stage gap is large", () => {
    const rec = calculateAllocation({ ...input, protectCurrentMinor: fromMajor(50) });
    expect(bucketTotals(rec).protect).toBe(fromMajor(144)); // 12% of 1,200
  });

  it("stops Protect contributions once the final stage is fully covered", () => {
    const rec = calculateAllocation({
      ...input,
      protectCurrentMinor: fromMajor(480 * 3), // covers 3 months = current stage target
    });
    expect(bucketTotals(rec).protect).toBe(0);
  });

  it("caps Protect at the remaining stage gap (high emergency fund)", () => {
    const rec = calculateAllocation({
      ...input,
      protectCurrentMinor: fromMajor(480 * 3 - 20), // 20 KD short of stage target
    });
    expect(bucketTotals(rec).protect).toBe(fromMajor(20));
  });

  it("splits remainder between grow/enjoy by risk preference", () => {
    const low = bucketTotals(calculateAllocation({ ...input, profile: { ...profile, riskPreference: "low" } }));
    const high = bucketTotals(calculateAllocation({ ...input, profile: { ...profile, riskPreference: "high" } }));
    expect(high.grow).toBeGreaterThan(low.grow);
    expect(low.enjoy).toBeGreaterThan(high.enjoy);
    expect(low.enjoy).toBeGreaterThan(0); // enjoyment is never zeroed when money remains
  });

  it("zero income → all zeros, no crash", () => {
    const rec = calculateAllocation({ ...input, incomeMinor: 0 });
    expect(sumMinor(rec.items.map((i) => i.amountMinor))).toBe(0);
  });

  it("income below essentials: everything goes to life, later buckets zero", () => {
    const rec = calculateAllocation({ ...input, incomeMinor: fromMajor(350) });
    const t = bucketTotals(rec);
    expect(t.life).toBe(fromMajor(350));
    expect(t.bills + t.protect + t.goals + t.grow + t.enjoy).toBe(0);
  });

  it("income covering essentials but not all bills: bills get the rest", () => {
    const rec = calculateAllocation({ ...input, incomeMinor: fromMajor(600) });
    const t = bucketTotals(rec);
    expect(t.life).toBe(fromMajor(480));
    expect(t.bills).toBe(fromMajor(120));
    expect(t.grow).toBe(0);
  });

  it("multiple goals share by priority when budget is short", () => {
    const manyGoals: Goal[] = [
      { ...goals[0], id: "g1", priority: "high" },
      { ...goals[0], id: "g2", name: "Car", priority: "low" },
    ];
    const rec = calculateAllocation({
      ...input,
      incomeMinor: fromMajor(900), // tight budget after life+bills+protect
      goals: manyGoals,
    });
    const g1 = rec.items.find((i) => i.goalId === "g1")!.amountMinor;
    const g2 = rec.items.find((i) => i.goalId === "g2")!.amountMinor;
    expect(g1).toBeGreaterThan(g2);
    expect(sumMinor(rec.items.map((i) => i.amountMinor))).toBe(fromMajor(900));
  });

  it("includes debt payments inside bills with explanation", () => {
    const rec = calculateAllocation({
      ...input,
      profile: { ...profile, debtPaymentsMinor: fromMajor(100) },
    });
    expect(bucketTotals(rec).bills).toBe(fromMajor(320));
    expect(rec.items.find((i) => i.bucket === "bills")!.reason).toMatch(/debt/i);
  });

  it("every item carries a human-readable reason with real numbers", () => {
    const rec = calculateAllocation(input);
    for (const item of rec.items) {
      expect(item.reason.length).toBeGreaterThan(20);
      expect(item.reasonCode).toBeTruthy();
    }
  });
});
