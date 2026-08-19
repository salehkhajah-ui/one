import { describe, expect, it } from "vitest";
import { fromMajor } from "../../money";
import { calculateCompoundProjection, projectAllScenarios, SCENARIOS } from "../projection";

const base = SCENARIOS.find((s) => s.key === "base")!;

describe("calculateCompoundProjection", () => {
  it("zero rate = simple accumulation", () => {
    const r = calculateCompoundProjection(0, fromMajor(100), 2, {
      key: "base",
      label: "0%",
      annualReturnPct: 0,
    });
    expect(r.futureValueMinor).toBe(fromMajor(2400));
    expect(r.hypotheticalGainMinor).toBe(0);
  });

  it("matches the known annuity formula (100 KD/month, 6%, 20y ≈ 46,204 KD)", () => {
    const r = calculateCompoundProjection(0, fromMajor(100), 20, base);
    const major = r.futureValueMinor / 1000;
    expect(major).toBeGreaterThan(46_000);
    expect(major).toBeLessThan(46_500);
    expect(r.totalContributedMinor).toBe(fromMajor(24_000));
    expect(r.hypotheticalGainMinor).toBe(r.futureValueMinor - r.totalContributedMinor);
  });

  it("compounds a lump sum (1000 KD at 6% for 10y ≈ 1,819 KD)", () => {
    const r = calculateCompoundProjection(fromMajor(1000), 0, 10, base);
    const major = r.futureValueMinor / 1000;
    expect(major).toBeGreaterThan(1810);
    expect(major).toBeLessThan(1830);
  });

  it("longer horizons and higher rates strictly increase value", () => {
    const [c, b, o] = projectAllScenarios(0, fromMajor(150), 10);
    expect(o.futureValueMinor).toBeGreaterThan(b.futureValueMinor);
    expect(b.futureValueMinor).toBeGreaterThan(c.futureValueMinor);
    const short = calculateCompoundProjection(0, fromMajor(150), 5, base);
    expect(b.futureValueMinor).toBeGreaterThan(short.futureValueMinor);
  });

  it("always returns hypothetical/not-guaranteed assumptions", () => {
    const r = calculateCompoundProjection(0, fromMajor(100), 20, base);
    expect(r.assumptions.join(" ")).toMatch(/hypothetical/i);
    expect(r.assumptions.join(" ")).toMatch(/not guaranteed/i);
    expect(r.assumptions.join(" ")).toMatch(/lose value/i);
  });

  it("validates inputs", () => {
    expect(() => calculateCompoundProjection(-1, 0, 5, base)).toThrow();
    expect(() => calculateCompoundProjection(0, 10.5, 5, base)).toThrow();
    expect(() => calculateCompoundProjection(0, 0, 100, base)).toThrow();
  });
});
