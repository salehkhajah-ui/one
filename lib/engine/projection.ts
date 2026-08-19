/**
 * Compound growth projections — deterministic, clearly hypothetical.
 * Used by Grow / Future Me / Future Value simulator.
 * Assumptions are always returned alongside numbers so the UI can display them.
 */

export interface ProjectionScenario {
  key: "conservative" | "base" | "optimistic";
  label: string;
  annualReturnPct: number;
}

export const SCENARIOS: ProjectionScenario[] = [
  { key: "conservative", label: "Conservative", annualReturnPct: 3 },
  { key: "base", label: "Base", annualReturnPct: 6 },
  { key: "optimistic", label: "Optimistic", annualReturnPct: 9 },
];

export interface CompoundProjectionResult {
  scenario: ProjectionScenario;
  years: number;
  monthlyContributionMinor: number;
  startingBalanceMinor: number;
  /** hypothetical future value, rounded to integer minor units at the end */
  futureValueMinor: number;
  totalContributedMinor: number;
  hypotheticalGainMinor: number;
  assumptions: string[];
}

/**
 * Future value of a starting balance plus monthly contributions with monthly compounding.
 * Floating point is used ONLY inside this projection (a hypothetical, not a balance),
 * and the result is rounded once at the end.
 */
export function calculateCompoundProjection(
  startingBalanceMinor: number,
  monthlyContributionMinor: number,
  years: number,
  scenario: ProjectionScenario,
): CompoundProjectionResult {
  if (!Number.isSafeInteger(startingBalanceMinor) || startingBalanceMinor < 0)
    throw new Error("projection: startingBalanceMinor must be a non-negative integer");
  if (!Number.isSafeInteger(monthlyContributionMinor) || monthlyContributionMinor < 0)
    throw new Error("projection: monthlyContributionMinor must be a non-negative integer");
  if (years < 0 || years > 60) throw new Error("projection: years out of range");

  const months = Math.round(years * 12);
  const monthlyRate = scenario.annualReturnPct / 100 / 12;

  let fv: number;
  if (monthlyRate === 0) {
    fv = startingBalanceMinor + monthlyContributionMinor * months;
  } else {
    const growth = Math.pow(1 + monthlyRate, months);
    const fvLump = startingBalanceMinor * growth;
    const fvAnnuity = monthlyContributionMinor * ((growth - 1) / monthlyRate);
    fv = fvLump + fvAnnuity;
  }

  const futureValueMinor = Math.round(fv);
  const totalContributedMinor = startingBalanceMinor + monthlyContributionMinor * months;

  return {
    scenario,
    years,
    monthlyContributionMinor,
    startingBalanceMinor,
    futureValueMinor,
    totalContributedMinor,
    hypotheticalGainMinor: futureValueMinor - totalContributedMinor,
    assumptions: [
      `Assumes a hypothetical ${scenario.annualReturnPct}% annual return, compounded monthly.`,
      "Inflation is not included.",
      "Returns are hypothetical and not guaranteed — investments can lose value.",
      "ONE provides educational projections and does not execute investments.",
    ],
  };
}

export function projectAllScenarios(
  startingBalanceMinor: number,
  monthlyContributionMinor: number,
  years: number,
): CompoundProjectionResult[] {
  return SCENARIOS.map((s) =>
    calculateCompoundProjection(startingBalanceMinor, monthlyContributionMinor, years, s),
  );
}
