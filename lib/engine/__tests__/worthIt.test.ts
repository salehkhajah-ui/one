import { describe, expect, it } from "vitest";
import { fromMajor } from "../../money";
import { evaluateWorthIt, type WorthItInput } from "../worthIt";
import type { Goal, SafeToSpendInput } from "../types";

const sts: SafeToSpendInput = {
  availableCashMinor: fromMajor(730),
  reservedBillsMinor: fromMajor(120),
  essentialsRemainingMinor: fromMajor(250),
  safetyBufferMinor: fromMajor(100),
  goalCommitmentsMinor: fromMajor(60),
  plannedGrowthMinor: fromMajor(80),
  daysUntilNextIncome: 10,
};

const topGoal: Goal & { monthlyContributionMinor: number } = {
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
  monthlyContributionMinor: fromMajor(130),
};

const base: WorthItInput = {
  itemName: "New phone",
  priceMinor: fromMajor(300),
  currency: "KWD",
  safeToSpend: sts,
  enjoyAvailableMinor: fromMajor(45),
  enjoyMonthlyMinor: fromMajor(150),
  topGoal,
  growMonthlyMinor: fromMajor(80),
  todayISO: "2026-08-19",
  nextPaydayISO: "2026-08-25",
};

describe("evaluateWorthIt", () => {
  it("cheap item covered by Enjoy → guilt-free yes, goals untouched", () => {
    const r = evaluateWorthIt({ ...base, priceMinor: fromMajor(20) });
    expect(r.verdict).toBe("yes_enjoy");
    expect(r.affordableFromEnjoy).toBe(true);
    expect(r.goalDelayDays).toBeNull();
    expect(r.growReductionMinor).toBe(0);
    expect(r.headline).toMatch(/goals stay/i);
  });

  it("300 KD phone exceeds discretionary → protected money at risk", () => {
    const r = evaluateWorthIt(base); // discretionary = 120
    expect(r.verdict).toBe("protected_at_risk");
    expect(r.affordableWithoutProtected).toBe(false);
    expect(r.suggestedDateISO).not.toBeNull(); // save-up plan exists
    expect(r.alternatives.some((a) => a.key === "save_months")).toBe(true);
  });

  it("mid-size purchase within discretionary but beyond Enjoy → shows goal/grow impact", () => {
    const r = evaluateWorthIt({ ...base, priceMinor: fromMajor(100) });
    expect(r.affordableWithoutProtected).toBe(true);
    expect(r.affordableFromEnjoy).toBe(false);
    // shortfall beyond Enjoy = 55; split across goal (130) + grow (80)
    expect((r.goalDelayDays ?? 0) + r.growReductionMinor).toBeGreaterThan(0);
    expect(r.dailySafeToSpendAfterMinor).toBeLessThan(r.dailySafeToSpendBeforeMinor);
  });

  it("waiting until payday is suggested when fresh Enjoy would cover it", () => {
    const r = evaluateWorthIt({ ...base, priceMinor: fromMajor(100) });
    expect(r.verdict).toBe("delay_helps");
    expect(r.suggestedDateISO).toBe("2026-08-25");
  });

  it("never uses shaming language", () => {
    for (const price of [20, 100, 300, 1000]) {
      const r = evaluateWorthIt({ ...base, priceMinor: fromMajor(price) });
      expect(r.headline).not.toMatch(/terrible|bad decision|irresponsible|shame|waste/i);
    }
  });

  it("rejects invalid price", () => {
    expect(() => evaluateWorthIt({ ...base, priceMinor: 0 })).toThrow();
    expect(() => evaluateWorthIt({ ...base, priceMinor: -5 })).toThrow();
  });
});
