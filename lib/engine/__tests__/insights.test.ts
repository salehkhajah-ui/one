import { describe, expect, it } from "vitest";
import { fromMajor, sumMinor } from "../../money";
import { detectFoundMoney, detectSubscriptionIncrease, suggestJobsForFoundMoney } from "../insights";
import type { Transaction } from "../types";

function tx(partial: Partial<Transaction> & { id: string; amountMinor: number }): Transaction {
  return {
    userId: "u1",
    accountId: "a1",
    currency: "KWD",
    direction: "debit",
    merchant: "M",
    merchantNormalized: "m",
    description: "",
    category: "Transport",
    transactionDate: "2026-08-10",
    postedDate: "2026-08-10",
    isRecurring: false,
    source: "demo",
    confidence: 1,
    ...partial,
  };
}

describe("detectFoundMoney", () => {
  const params = {
    category: "Transport" as const,
    expectedMinor: fromMajor(80),
    fromISO: "2026-08-01",
    toISO: "2026-08-31",
    currency: "KWD" as const,
    thresholdMinor: fromMajor(5),
  };

  it("finds money when spending is under forecast", () => {
    const insight = detectFoundMoney({
      ...params,
      transactions: [tx({ id: "t1", amountMinor: fromMajor(30) }), tx({ id: "t2", amountMinor: fromMajor(18) })],
    });
    expect(insight).not.toBeNull();
    expect(insight!.availableMinor).toBe(fromMajor(32));
    expect(insight!.title).toMatch(/32\.000/);
    expect(insight!.supportingTransactionIds).toEqual(["t1", "t2"]);
  });

  it("returns null when the difference is trivial or spending exceeded forecast", () => {
    expect(
      detectFoundMoney({ ...params, transactions: [tx({ id: "t1", amountMinor: fromMajor(78) })] }),
    ).toBeNull();
    expect(
      detectFoundMoney({ ...params, transactions: [tx({ id: "t1", amountMinor: fromMajor(95) })] }),
    ).toBeNull();
  });

  it("missing transaction history yields the full expected amount — callers must gate on confidence", () => {
    const insight = detectFoundMoney({ ...params, transactions: [] });
    expect(insight!.confidence).toBe("medium"); // never presented as certain
  });
});

describe("detectSubscriptionIncrease", () => {
  it("detects a price increase on the same recurring merchant", () => {
    const insight = detectSubscriptionIncrease(
      [
        tx({ id: "s1", amountMinor: fromMajor(4.5), category: "Subscriptions", isRecurring: true, merchant: "Netflix", merchantNormalized: "netflix", transactionDate: "2026-06-05" }),
        tx({ id: "s2", amountMinor: fromMajor(4.5), category: "Subscriptions", isRecurring: true, merchant: "Netflix", merchantNormalized: "netflix", transactionDate: "2026-07-05" }),
        tx({ id: "s3", amountMinor: fromMajor(6), category: "Subscriptions", isRecurring: true, merchant: "Netflix", merchantNormalized: "netflix", transactionDate: "2026-08-05" }),
      ],
      "KWD",
    );
    expect(insight).not.toBeNull();
    expect(insight!.monthlyImpactMinor).toBe(fromMajor(1.5));
    expect(insight!.annualImpactMinor).toBe(fromMajor(18));
  });

  it("stable subscriptions produce no insight (no fake warnings)", () => {
    const insight = detectSubscriptionIncrease(
      [
        tx({ id: "s1", amountMinor: fromMajor(4.5), category: "Subscriptions", isRecurring: true, merchantNormalized: "netflix", transactionDate: "2026-07-05" }),
        tx({ id: "s2", amountMinor: fromMajor(4.5), category: "Subscriptions", isRecurring: true, merchantNormalized: "netflix", transactionDate: "2026-08-05" }),
      ],
      "KWD",
    );
    expect(insight).toBeNull();
  });
});

describe("suggestJobsForFoundMoney", () => {
  it("splits 32 KD across Protect/Grow/Goal/Enjoy exactly", () => {
    const jobs = suggestJobsForFoundMoney(fromMajor(32), "Japan Trip");
    expect(sumMinor(jobs.map((j) => j.amountMinor))).toBe(fromMajor(32));
    expect(jobs.map((j) => j.bucket)).toContain("goal");
  });
  it("without a goal, splits across Protect/Grow/Enjoy", () => {
    const jobs = suggestJobsForFoundMoney(fromMajor(10), null);
    expect(jobs.every((j) => j.bucket !== "goal")).toBe(true);
    expect(sumMinor(jobs.map((j) => j.amountMinor))).toBe(fromMajor(10));
  });
});
