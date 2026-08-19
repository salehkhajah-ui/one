/**
 * Safe to Spend — the hero calculation.
 * Deterministic; see docs/FINANCIAL_ENGINE.md for the formula and assumptions.
 */
import { clampNonNegative, divideMinor } from "../money";
import type { SafeToSpendInput, SafeToSpendResult, Confidence } from "./types";

function assertNonNegativeInputs(input: SafeToSpendInput): void {
  const fields: Array<[string, number]> = [
    ["availableCashMinor", input.availableCashMinor],
    ["reservedBillsMinor", input.reservedBillsMinor],
    ["essentialsRemainingMinor", input.essentialsRemainingMinor],
    ["safetyBufferMinor", input.safetyBufferMinor],
    ["goalCommitmentsMinor", input.goalCommitmentsMinor],
    ["plannedGrowthMinor", input.plannedGrowthMinor],
  ];
  for (const [name, v] of fields) {
    if (!Number.isSafeInteger(v) || v < 0) {
      throw new Error(`safeToSpend: ${name} must be a non-negative safe integer, got ${v}`);
    }
  }
}

export function calculateSafeToSpend(
  input: SafeToSpendInput,
  confidence: Confidence = "high",
): SafeToSpendResult {
  assertNonNegativeInputs(input);

  const committed =
    input.reservedBillsMinor +
    input.essentialsRemainingMinor +
    input.safetyBufferMinor +
    input.goalCommitmentsMinor +
    input.plannedGrowthMinor;

  const raw = input.availableCashMinor - committed;
  const discretionaryMinor = clampNonNegative(raw);
  const shortfallMinor = raw < 0 ? -raw : 0;
  const daysRemaining = Math.max(1, Math.floor(input.daysUntilNextIncome));

  // Floor: better to under-promise daily spending than to overdraw commitments.
  const dailyMinor = divideMinor(discretionaryMinor, daysRemaining, "floor");

  return {
    discretionaryMinor,
    dailyMinor,
    daysRemaining,
    isConstrained: raw < 0,
    shortfallMinor,
    breakdown: { ...input },
    confidence,
  };
}

/**
 * Recompute after a hypothetical purchase today.
 * Purchase reduces available cash; commitments stay (the point of protected money).
 */
export function safeToSpendAfterPurchase(
  input: SafeToSpendInput,
  purchaseMinor: number,
  confidence: Confidence = "high",
): SafeToSpendResult {
  if (!Number.isSafeInteger(purchaseMinor) || purchaseMinor < 0) {
    throw new Error(`safeToSpendAfterPurchase: purchase must be a non-negative safe integer`);
  }
  return calculateSafeToSpend(
    { ...input, availableCashMinor: clampNonNegative(input.availableCashMinor - purchaseMinor) },
    confidence,
  );
}
