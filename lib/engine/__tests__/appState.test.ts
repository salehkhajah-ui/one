import { describe, expect, it } from "vitest";
import { fromMajor, sumMinor } from "../../money";
import { manualBundle } from "../../app/bundle";
import { buildAppState } from "../../app/state";
import type { UserSetup } from "../../app/storage";

const NOW = new Date(2026, 7, 19); // 2026-08-19

const manual: NonNullable<UserSetup["manual"]> = {
  displayName: "Saleh",
  monthlyIncomeMinor: fromMajor(1000),
  incomeType: "salary",
  paydayDayOfMonth: 25,
  essentialMonthlyEstimateMinor: fromMajor(400),
  checkingBalanceMinor: fromMajor(600),
  protectBalanceMinor: fromMajor(200),
  riskPreference: "moderate",
  investmentExperience: "some",
  bills: [
    { id: "b1", name: "Rent", amountMinor: fromMajor(250), dayOfMonth: 1 },
    { id: "b2", name: "Phone", amountMinor: fromMajor(10), dayOfMonth: 20 },
  ],
  goals: [
    { id: "g1", name: "Travel", emoji: "✈️", targetMinor: fromMajor(1200), currentMinor: 0, months: 12, priority: "high" },
  ],
};

describe("manual mode (no transaction history)", () => {
  const state = buildAppState(manualBundle(manual, "2026-08-19"), "manual", NOW);

  it("builds a full state from onboarding answers", () => {
    expect(state.mode).toBe("manual");
    expect(state.profile.displayName).toBe("Saleh");
    expect(state.nextPaydayISO).toBe("2026-08-25");
    expect(sumMinor(state.allocation.items.map((i) => i.amountMinor))).toBe(fromMajor(1000));
  });

  it("is honest about missing history: no insights, plan-based score basis", () => {
    expect(state.hasHistory).toBe(false);
    expect(state.insight).toBeNull();
    expect(state.secondaryInsight).toBeNull();
    expect(state.transactions).toHaveLength(0);
    const cashflow = state.score.components.find((c) => c.key === "cashflow")!;
    expect(cashflow.formula).toMatch(/your plan — no transaction history yet/);
    expect(state.safeToSpend.confidence).toBe("medium");
  });

  it("reserves only bills due before payday (rent on the 1st is after the 25th)", () => {
    expect(state.safeToSpendInput.reservedBillsMinor).toBe(fromMajor(10)); // phone on the 20th... already past on the 19th? no: 20th < 25th
  });

  it("goal from template gets a real target date and pace", () => {
    const g = state.goals[0];
    expect(g.targetDate).toBe("2027-08-19");
    expect(g.plan.requiredMonthlyMinor).toBe(fromMajor(100)); // 1200 / 12
  });
});

describe("user-entered transactions", () => {
  it("spending moves the checking balance and Safe to Spend down", () => {
    const before = buildAppState(manualBundle(manual, "2026-08-19"), "manual", NOW);
    const after = buildAppState(
      manualBundle(manual, "2026-08-19", [
        { id: "user-tx-1", amountMinor: fromMajor(50), direction: "debit", merchant: "Coffee", category: "Dining", dateISO: "2026-08-19" },
      ]),
      "manual",
      NOW,
    );
    expect(after.safeToSpendInput.availableCashMinor).toBe(before.safeToSpendInput.availableCashMinor - fromMajor(50));
    expect(after.safeToSpend.discretionaryMinor).toBe(before.safeToSpend.discretionaryMinor - fromMajor(50));
    expect(after.transactions).toHaveLength(1);
    expect(after.monthSpendByCategory.find((c) => c.category === "Dining")?.amountMinor).toBe(fromMajor(50));
  });

  it("income raises the balance; unknown categories fall back to Other; balance never goes negative", () => {
    const state = buildAppState(
      manualBundle(manual, "2026-08-19", [
        { id: "user-tx-1", amountMinor: fromMajor(100), direction: "credit", merchant: "Bonus", category: "Income", dateISO: "2026-08-18" },
        { id: "user-tx-2", amountMinor: fromMajor(10), direction: "debit", merchant: "??", category: "Nonsense", dateISO: "2026-08-19" },
      ]),
      "manual",
      NOW,
    );
    expect(state.safeToSpendInput.availableCashMinor).toBe(fromMajor(600 + 100 - 10));
    expect(state.transactions.find((t) => t.id === "user-tx-2")?.category).toBe("Other");
    const drained = buildAppState(
      manualBundle(manual, "2026-08-19", [
        { id: "user-tx-3", amountMinor: fromMajor(9999), direction: "debit", merchant: "Big", category: "Shopping", dateISO: "2026-08-19" },
      ]),
      "manual",
      NOW,
    );
    expect(drained.safeToSpendInput.availableCashMinor).toBe(0);
  });
});

describe("accepted plan override", () => {
  const bundle = manualBundle(manual, "2026-08-19");
  const rec = buildAppState(bundle, "manual", NOW);
  const flexTotal = rec.allocation.totalMinor - rec.allocationBuckets.life - rec.allocationBuckets.bills;

  it("applies a valid accepted plan to the in-force buckets", () => {
    const state = buildAppState(bundle, "manual", NOW, {
      appliedUntilISO: "2026-08-25",
      protectMinor: fromMajor(50),
      goalsMinor: fromMajor(80),
      growMinor: fromMajor(40),
    });
    expect(state.planIsAccepted).toBe(true);
    expect(state.planBuckets.protect).toBe(fromMajor(50));
    expect(state.planBuckets.goals).toBe(fromMajor(80));
    expect(state.planBuckets.grow).toBe(fromMajor(40));
    expect(state.planBuckets.enjoy).toBe(flexTotal - fromMajor(170));
    // recommendation stays intact for comparison
    expect(state.allocationBuckets.protect).not.toBe(fromMajor(50));
  });

  it("ignores stale accepted plans (payday passed)", () => {
    const state = buildAppState(bundle, "manual", NOW, {
      appliedUntilISO: "2026-08-10",
      protectMinor: fromMajor(50),
      goalsMinor: fromMajor(80),
      growMinor: fromMajor(40),
    });
    expect(state.planIsAccepted).toBe(false);
    expect(state.planBuckets).toEqual(state.allocationBuckets);
  });
});
