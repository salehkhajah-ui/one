import { describe, expect, it } from "vitest";
import { fromMajor } from "../../money";
import { addDays, daysBetween, daysUntilNextPayday, monthsBetween, nextPayday } from "../dates";
import { calculateEmergencyStatus, STARTER_EMERGENCY_MINOR } from "../emergency";

describe("emergency stages", () => {
  const essentials = fromMajor(620);

  it("stage 1: below starter fund", () => {
    const s = calculateEmergencyStatus(fromMajor(200), essentials, 3);
    expect(s.stage).toBe(1);
    expect(s.stageTargetMinor).toBe(STARTER_EMERGENCY_MINOR);
    expect(s.stageGapMinor).toBe(fromMajor(300));
  });

  it("stage 2: past starter, below one month", () => {
    const s = calculateEmergencyStatus(fromMajor(550), essentials, 3);
    expect(s.stage).toBe(2);
    expect(s.stageTargetMinor).toBe(essentials);
  });

  it("stage 3: past one month, below three months", () => {
    const s = calculateEmergencyStatus(fromMajor(700), essentials, 3);
    expect(s.stage).toBe(3);
    expect(s.stageTargetMinor).toBe(essentials * 3);
    expect(s.monthsCovered).toBeCloseTo(1.13, 2);
  });

  it("stage 4: at/above three months, works toward user target", () => {
    const s = calculateEmergencyStatus(essentials * 4, essentials, 6);
    expect(s.stage).toBe(4);
    expect(s.finalTargetMinor).toBe(essentials * 6);
  });

  it("zero essentials does not divide by zero", () => {
    const s = calculateEmergencyStatus(fromMajor(100), 0, 3);
    expect(s.monthsCovered).toBe(0);
  });
});

describe("date helpers", () => {
  it("daysBetween and addDays are consistent", () => {
    expect(daysBetween("2026-08-19", "2026-08-25")).toBe(6);
    expect(addDays("2026-08-19", 6)).toBe("2026-08-25");
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
  });

  it("nextPayday rolls to next month when today is on/after payday", () => {
    expect(nextPayday("2026-08-19", 25)).toBe("2026-08-25");
    expect(nextPayday("2026-08-25", 25)).toBe("2026-09-25");
    expect(nextPayday("2026-08-26", 25)).toBe("2026-09-25");
  });

  it("daysUntilNextPayday", () => {
    expect(daysUntilNextPayday("2026-08-19", 25)).toBe(6);
    expect(daysUntilNextPayday("2026-08-25", 25)).toBe(31);
  });

  it("monthsBetween", () => {
    expect(monthsBetween("2026-08-19", "2027-03-01")).toBe(7);
    expect(monthsBetween("2026-08-19", "2026-08-30")).toBe(0);
  });
});
