/**
 * Emergency fund staged targets.
 * Stage 1: starter fund (default 500 KD)
 * Stage 2: 1 month of essential expenses
 * Stage 3: 3 months of essential expenses
 * Stage 4: user-selected target (3–6+ months)
 * Defaults are suggestions, not guaranteed financial advice; assumptions are surfaced in the UI.
 */
import { fromMajor } from "../money";

export interface EmergencyStatus {
  stage: 1 | 2 | 3 | 4;
  stageLabel: string;
  /** target of the CURRENT stage being worked toward */
  stageTargetMinor: number;
  /** final target based on user's emergencyTargetMonths */
  finalTargetMinor: number;
  currentMinor: number;
  /** months of essential expenses currently covered (2 dp) */
  monthsCovered: number;
  /** remaining to complete current stage */
  stageGapMinor: number;
}

export const STARTER_EMERGENCY_MINOR = fromMajor(500, "KWD");

export function calculateEmergencyStatus(
  currentMinor: number,
  essentialMonthlyMinor: number,
  targetMonths: number,
): EmergencyStatus {
  if (!Number.isSafeInteger(currentMinor) || currentMinor < 0)
    throw new Error("emergency: currentMinor must be non-negative integer");
  if (!Number.isSafeInteger(essentialMonthlyMinor) || essentialMonthlyMinor < 0)
    throw new Error("emergency: essentialMonthlyMinor must be non-negative integer");

  const months = Math.max(3, targetMonths);
  const oneMonth = essentialMonthlyMinor;
  const threeMonths = essentialMonthlyMinor * 3;
  const finalTargetMinor = essentialMonthlyMinor * months;

  const monthsCovered =
    essentialMonthlyMinor === 0 ? 0 : Math.round((currentMinor / essentialMonthlyMinor) * 100) / 100;

  let stage: EmergencyStatus["stage"];
  let stageTargetMinor: number;
  let stageLabel: string;

  if (currentMinor < STARTER_EMERGENCY_MINOR && STARTER_EMERGENCY_MINOR < oneMonth) {
    stage = 1;
    stageTargetMinor = STARTER_EMERGENCY_MINOR;
    stageLabel = "Starter fund";
  } else if (currentMinor < oneMonth) {
    stage = 2;
    stageTargetMinor = oneMonth;
    stageLabel = "1 month of essentials";
  } else if (currentMinor < threeMonths) {
    stage = 3;
    stageTargetMinor = threeMonths;
    stageLabel = "3 months of essentials";
  } else {
    stage = 4;
    stageTargetMinor = finalTargetMinor;
    stageLabel = `${months} months of essentials`;
  }

  return {
    stage,
    stageLabel,
    stageTargetMinor,
    finalTargetMinor,
    currentMinor,
    monthsCovered,
    stageGapMinor: Math.max(0, stageTargetMinor - currentMinor),
  };
}
