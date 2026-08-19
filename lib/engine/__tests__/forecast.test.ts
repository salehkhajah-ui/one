import { describe, expect, it } from "vitest";
import { calculateCashFlowForecast, type ForecastInput } from "../forecast";
import { fromMajor } from "../../money";
import type { RecurringItem } from "../types";

function bill(merchant: string, amountKD: number, nextISO: string): RecurringItem {
  return {
    id: merchant,
    merchant,
    merchantNormalized: merchant.toLowerCase(),
    averageAmountMinor: fromMajor(amountKD),
    frequency: "monthly",
    nextExpectedDate: nextISO,
    confidence: 1,
    type: "bill",
    active: true,
  };
}

const base: ForecastInput = {
  todayISO: "2026-08-19",
  startBalanceMinor: fromMajor(700),
  bufferMinor: fromMajor(100),
  salaryMinor: fromMajor(1200),
  paydayDayOfMonth: 25,
  scheduled: [bill("Zain", 12, "2026-09-03"), bill("Rent", 250, "2026-09-01")],
  dailySpendMinor: fromMajor(20),
};

describe("calculateCashFlowForecast", () => {
  it("projects 30 days with salary bump and bill dips", () => {
    const f = calculateCashFlowForecast(base);
    expect(f.points).toHaveLength(30);
    const payday = f.points.find((p) => p.dateISO === "2026-08-25")!;
    expect(payday.events.some((e) => e.label === "Salary")).toBe(true);
    const rentDay = f.points.find((p) => p.dateISO === "2026-09-01")!;
    expect(rentDay.events.some((e) => e.label === "Rent")).toBe(true);
    // Day 1: 700 - 20 spend = 680
    expect(f.points[0].balanceMinor).toBe(fromMajor(680));
    // Payday is day 6: 700 − 6×20 spend + 1,200 salary = 1,780
    expect(payday.balanceMinor).toBe(fromMajor(1780));
  });

  it("stays-above-buffer case reports no warning", () => {
    const f = calculateCashFlowForecast(base);
    expect(f.firstBelowBufferISO).toBeNull();
    expect(f.minMinor).toBeGreaterThan(f.bufferMinor);
  });

  it("detects the first below-buffer day (heavy spending, low balance)", () => {
    const f = calculateCashFlowForecast({ ...base, startBalanceMinor: fromMajor(200), dailySpendMinor: fromMajor(30) });
    // 200 - 30/day → below 100 KD buffer strictly after day 3 (110 on the 22nd, 80 on the 23rd)
    expect(f.firstBelowBufferISO).toBe("2026-08-23");
    // Salary on the 25th rescues the balance afterwards
    const after = f.points.find((p) => p.dateISO === "2026-08-26")!;
    expect(after.balanceMinor).toBeGreaterThan(f.bufferMinor);
  });

  it("min tracks the lowest point (day before payday)", () => {
    const f = calculateCashFlowForecast({ ...base, startBalanceMinor: fromMajor(200), dailySpendMinor: fromMajor(15) });
    expect(f.minDateISO).toBe("2026-08-24");
  });

  it("monthly bills recur within the horizon (Sep 3 and Oct 3 both fall inside 45 days)", () => {
    const f = calculateCashFlowForecast({ ...base, horizonDays: 45 });
    const zainDays = f.points.filter((p) => p.events.some((e) => e.label === "Zain"));
    expect(zainDays.map((p) => p.dateISO)).toEqual(["2026-09-03", "2026-10-03"]);
  });

  it("no salary and zero spend → flat line except bills", () => {
    const f = calculateCashFlowForecast({ ...base, salaryMinor: 0, dailySpendMinor: 0, scheduled: [] });
    expect(new Set(f.points.map((p) => p.balanceMinor)).size).toBe(1);
  });

  it("balance may go negative and is reported honestly", () => {
    const f = calculateCashFlowForecast({ ...base, startBalanceMinor: fromMajor(50), salaryMinor: 0, dailySpendMinor: fromMajor(20) });
    expect(f.minMinor).toBeLessThan(0);
    expect(f.firstBelowBufferISO).toBe("2026-08-20");
  });

  it("validates inputs", () => {
    expect(() => calculateCashFlowForecast({ ...base, dailySpendMinor: -1 })).toThrow();
    expect(() => calculateCashFlowForecast({ ...base, startBalanceMinor: 10.5 })).toThrow();
  });
});
