import { describe, expect, it } from "vitest";
import { fromMajor } from "../../money";
import { goalDelayDays, projectGoalCompletion, requiredMonthlyContribution } from "../goals";
import type { Goal } from "../types";

const goal: Goal = {
  id: "g-japan",
  name: "Japan Trip",
  emoji: "🇯🇵",
  targetMinor: fromMajor(1500),
  currentMinor: fromMajor(720),
  currency: "KWD",
  targetDate: "2027-03-01",
  priority: "high",
  deadlineFlexible: true,
  autoAllocate: true,
  status: "active",
};

describe("requiredMonthlyContribution", () => {
  it("divides remaining by months to deadline (ceil — never underfunds)", () => {
    const plan = requiredMonthlyContribution(goal, "2026-08-19");
    expect(plan.remainingMinor).toBe(fromMajor(780));
    expect(plan.monthsRemaining).toBe(7);
    expect(plan.requiredMonthlyMinor).toBe(Math.ceil(fromMajor(780) / 7));
    expect(plan.feasible).toBe(true);
  });

  it("completed goal needs nothing", () => {
    const plan = requiredMonthlyContribution({ ...goal, currentMinor: goal.targetMinor }, "2026-08-19");
    expect(plan.requiredMonthlyMinor).toBe(0);
  });

  it("passed deadline → infeasible flag (goal deadline impossible)", () => {
    const plan = requiredMonthlyContribution({ ...goal, targetDate: "2026-01-01" }, "2026-08-19");
    expect(plan.feasible).toBe(false);
    expect(plan.monthsRemaining).toBe(1); // clamped, still returns a workable number
  });

  it("open-ended goal uses gentle default pace", () => {
    const plan = requiredMonthlyContribution({ ...goal, targetDate: null }, "2026-08-19");
    expect(plan.requiredMonthlyMinor).toBe(Math.ceil(fromMajor(780) / 24));
  });
});

describe("projectGoalCompletion", () => {
  it("projects a completion date from monthly pace", () => {
    const p = projectGoalCompletion(goal, fromMajor(120), "2026-08-19");
    // 780 remaining at 4 KD/day → 195 days
    expect(p.daysToComplete).toBe(195);
    expect(p.projectedDate).toBe("2027-03-02");
  });

  it("zero pace with a deadline → not on track, no date", () => {
    const p = projectGoalCompletion(goal, 0, "2026-08-19");
    expect(p.projectedDate).toBeNull();
    expect(p.onTrack).toBe(false);
  });

  it("completed goal projects today", () => {
    const p = projectGoalCompletion({ ...goal, currentMinor: goal.targetMinor }, 0, "2026-08-19");
    expect(p.daysToComplete).toBe(0);
    expect(p.onTrack).toBe(true);
  });
});

describe("goalDelayDays", () => {
  it("300 KD phone at 130 KD/month goal pace ≈ 70 days; 80 KD ≈ 19 days", () => {
    expect(goalDelayDays(fromMajor(130), fromMajor(300))).toBe(70);
    expect(goalDelayDays(fromMajor(130), fromMajor(80))).toBe(19);
  });
  it("zero diversion → zero delay", () => {
    expect(goalDelayDays(fromMajor(130), 0)).toBe(0);
  });
});
