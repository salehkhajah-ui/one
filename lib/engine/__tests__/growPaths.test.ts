import { describe, expect, it } from "vitest";
import { calculateEmergencyStatus } from "../emergency";
import { buildGrowPaths, futureValueAtRate, oneYearDepositRange, oneYearMarketRange, RED_FLAGS, TRUST_CRITERIA } from "../growPaths";
import { fromMajor } from "../../money";

describe("futureValueAtRate", () => {
  it("handles zero and positive rates", () => {
    expect(futureValueAtRate(0, fromMajor(100), 12, 0)).toBe(fromMajor(1200));
    expect(futureValueAtRate(fromMajor(1000), 0, 12, 12)).toBeGreaterThan(fromMajor(1120)); // monthly compounding beats simple 12%
  });
  it("handles NEGATIVE rates (losing years exist)", () => {
    const v = futureValueAtRate(fromMajor(1000), 0, 12, -18);
    expect(v).toBeLessThan(fromMajor(1000));
    expect(v).toBeGreaterThan(fromMajor(800));
  });
});

describe("one-year ranges", () => {
  it("market range includes a losing outcome and orders low < mid < high", () => {
    const r = oneYearMarketRange(0, fromMajor(150));
    expect(r.lowMinor).toBeLessThan(r.contributedMinor); // the honest part
    expect(r.lowMinor).toBeLessThan(r.midMinor);
    expect(r.midMinor).toBeLessThan(r.highMinor);
    expect(r.assumptions.join(" ")).toMatch(/CAN lose money/i);
    expect(r.assumptions.join(" ")).toMatch(/not a prediction/i);
  });

  it("deposit range never loses capital and stays modest", () => {
    const r = oneYearDepositRange(0, fromMajor(150));
    expect(r.lowMinor).toBeGreaterThanOrEqual(r.contributedMinor);
    expect(r.highMinor).toBeLessThan(oneYearMarketRange(0, fromMajor(150)).highMinor);
  });
});

describe("buildGrowPaths", () => {
  const baseInput = {
    currency: "KWD" as const,
    growMonthlyMinor: fromMajor(150),
    emergency: calculateEmergencyStatus(fromMajor(2000), fromMajor(480), 3), // healthy: stage 4
    riskPreference: "moderate" as const,
  };

  it("healthy emergency fund → investing paths only, no protect-first nag", () => {
    const paths = buildGrowPaths(baseInput);
    expect(paths.map((p) => p.key)).toEqual(["index_investing", "capital_stable"]);
  });

  it("weak emergency fund → safety net leads (never pushes investing over safety)", () => {
    const paths = buildGrowPaths({
      ...baseInput,
      emergency: calculateEmergencyStatus(fromMajor(200), fromMajor(480), 3), // stage 1
    });
    expect(paths[0].key).toBe("protect_first");
    expect(paths[0].range).toBeNull(); // no fake return number on safety
  });

  it("low risk preference puts capital-stable before index investing", () => {
    const paths = buildGrowPaths({ ...baseInput, riskPreference: "low" });
    const keys = paths.map((p) => p.key);
    expect(keys.indexOf("capital_stable")).toBeLessThan(keys.indexOf("index_investing"));
  });

  it("index path teaches process (regulated broker, diversified funds), names no securities", () => {
    const paths = buildGrowPaths(baseInput);
    const idx = paths.find((p) => p.key === "index_investing")!;
    expect(`${idx.summary} ${idx.steps.join(" ")}`).toMatch(/regulat/i);
    expect(idx.steps.join(" ")).toMatch(/not individual stocks/i);
  });

  it("trust criteria and red flags exist for the UI to surface", () => {
    expect(TRUST_CRITERIA.length).toBeGreaterThanOrEqual(4);
    expect(RED_FLAGS.join(" ")).toMatch(/Guaranteed/i);
  });
});
