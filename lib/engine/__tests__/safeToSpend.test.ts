import { describe, expect, it } from "vitest";
import { fromMajor } from "../../money";
import { calculateSafeToSpend, safeToSpendAfterPurchase } from "../safeToSpend";
import type { SafeToSpendInput } from "../types";

const base: SafeToSpendInput = {
  availableCashMinor: fromMajor(730),
  reservedBillsMinor: fromMajor(120),
  essentialsRemainingMinor: fromMajor(250),
  safetyBufferMinor: fromMajor(100),
  goalCommitmentsMinor: fromMajor(60),
  plannedGrowthMinor: fromMajor(80),
  daysUntilNextIncome: 10,
};

describe("calculateSafeToSpend", () => {
  it("computes discretionary and daily amounts", () => {
    const r = calculateSafeToSpend(base);
    expect(r.discretionaryMinor).toBe(fromMajor(120)); // 730-120-250-100-60-80
    expect(r.dailyMinor).toBe(fromMajor(12)); // 120/10
    expect(r.isConstrained).toBe(false);
  });

  it("floors the daily amount (never over-promises)", () => {
    const r = calculateSafeToSpend({ ...base, daysUntilNextIncome: 7 });
    expect(r.dailyMinor).toBe(17_142); // floor(120000/7)
  });

  it("payday today/tomorrow: days clamp to at least 1", () => {
    const today = calculateSafeToSpend({ ...base, daysUntilNextIncome: 0 });
    expect(today.daysRemaining).toBe(1);
    expect(today.dailyMinor).toBe(fromMajor(120));
    const tomorrow = calculateSafeToSpend({ ...base, daysUntilNextIncome: 1 });
    expect(tomorrow.dailyMinor).toBe(fromMajor(120));
  });

  it("payday 30 days away spreads thin", () => {
    const r = calculateSafeToSpend({ ...base, daysUntilNextIncome: 30 });
    expect(r.dailyMinor).toBe(fromMajor(4));
  });

  it("zero balance → constrained with shortfall, daily 0", () => {
    const r = calculateSafeToSpend({ ...base, availableCashMinor: 0 });
    expect(r.isConstrained).toBe(true);
    expect(r.dailyMinor).toBe(0);
    expect(r.shortfallMinor).toBe(fromMajor(610));
  });

  it("large upcoming bill flips to constrained", () => {
    const r = calculateSafeToSpend({ ...base, reservedBillsMinor: fromMajor(700) });
    expect(r.isConstrained).toBe(true);
    expect(r.discretionaryMinor).toBe(0);
  });

  it("negative cash flow scenario never yields negative outputs", () => {
    const r = calculateSafeToSpend({
      ...base,
      availableCashMinor: fromMajor(50),
      essentialsRemainingMinor: fromMajor(400),
    });
    expect(r.discretionaryMinor).toBe(0);
    expect(r.dailyMinor).toBe(0);
    expect(r.shortfallMinor).toBeGreaterThan(0);
  });

  it("rejects negative inputs", () => {
    expect(() => calculateSafeToSpend({ ...base, reservedBillsMinor: -1 })).toThrow();
    expect(() => calculateSafeToSpend({ ...base, availableCashMinor: 10.5 })).toThrow();
  });
});

describe("safeToSpendAfterPurchase", () => {
  it("overspending reduces future daily Safe to Spend", () => {
    const before = calculateSafeToSpend(base);
    const after = safeToSpendAfterPurchase(base, fromMajor(60));
    expect(after.discretionaryMinor).toBe(before.discretionaryMinor - fromMajor(60));
    expect(after.dailyMinor).toBeLessThan(before.dailyMinor);
  });

  it("purchase larger than cash clamps at zero (no negative balances)", () => {
    const after = safeToSpendAfterPurchase(base, fromMajor(10_000));
    expect(after.discretionaryMinor).toBe(0);
    expect(after.isConstrained).toBe(true);
  });
});
