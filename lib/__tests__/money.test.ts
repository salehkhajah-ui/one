import { describe, expect, it } from "vitest";
import {
  allocateProportionally,
  divideMinor,
  formatAmount,
  formatMoney,
  fromMajor,
  percentOf,
  sumMinor,
  toMajor,
} from "../money";

describe("money — KWD three-decimal precision", () => {
  it("converts majors to fils (1 KD = 1000 fils)", () => {
    expect(fromMajor(1)).toBe(1000);
    expect(fromMajor(1250.75)).toBe(1250750);
    expect(fromMajor(0.001)).toBe(1);
    expect(fromMajor(12.75)).toBe(12750);
  });

  it("round-trips majors", () => {
    expect(toMajor(fromMajor(1250.75))).toBeCloseTo(1250.75, 10);
  });

  it("USD uses 2 decimals (100 minor per major)", () => {
    expect(fromMajor(10.99, "USD")).toBe(1099);
  });

  it("rejects unsafe values", () => {
    expect(() => sumMinor([1.5])).toThrow();
    expect(() => divideMinor(10.2, 3)).toThrow();
    expect(() => formatMoney(0.5)).toThrow();
  });
});

describe("divideMinor", () => {
  it("floors by default (safe for daily budgets)", () => {
    expect(divideMinor(1000, 3)).toBe(333);
  });
  it("supports round and ceil", () => {
    expect(divideMinor(1000, 3, "round")).toBe(333);
    expect(divideMinor(1000, 3, "ceil")).toBe(334);
  });
  it("throws on division by zero", () => {
    expect(() => divideMinor(100, 0)).toThrow();
  });
});

describe("percentOf (basis points)", () => {
  it("computes 12% of 1,200.000 KD", () => {
    expect(percentOf(1_200_000, 1_200)).toBe(144_000);
  });
  it("handles rounding", () => {
    expect(percentOf(1001, 3333)).toBe(334); // 33.33% of 1.001 KD
  });
});

describe("allocateProportionally — largest remainder", () => {
  it("always sums exactly to total", () => {
    for (const total of [0, 1, 7, 100, 999, 1_500_000, 32_000]) {
      for (const weights of [[1, 1, 1], [3, 2, 1], [45, 55], [31, 47, 16, 6], [1, 0, 2]]) {
        const parts = allocateProportionally(total, weights);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });
  it("gives zero to zero weights", () => {
    expect(allocateProportionally(100, [1, 0, 1])[1]).toBe(0);
  });
  it("returns zeros when all weights are zero", () => {
    expect(allocateProportionally(100, [0, 0])).toEqual([0, 0]);
  });
  it("splits the 32 KD found-money example sensibly", () => {
    const [protect, grow, japan, enjoy] = allocateProportionally(32_000, [31, 47, 16, 6]);
    expect(protect + grow + japan + enjoy).toBe(32_000);
    expect(grow).toBeGreaterThan(protect);
    expect(enjoy).toBeGreaterThan(0);
  });
});

describe("formatting", () => {
  it("formats KWD with 3 decimals", () => {
    expect(formatAmount(12_750)).toBe("12.750");
    expect(formatAmount(1_247_500)).toBe("1,247.500");
  });
  it("formatMoney includes currency", () => {
    expect(formatMoney(12_750)).toMatch(/12\.750/);
    expect(formatMoney(12_750)).toMatch(/KWD|KD/);
  });
});
