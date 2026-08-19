/**
 * Local persistence for ONE's setup state (Milestone 1.5).
 * This is the placeholder for Supabase persistence (Milestone 2): the shapes
 * mirror docs/DATA_MODEL.md so the swap is a storage change, not a redesign.
 * Pure TS aside from window.localStorage access, always guarded.
 */
import type { FinancialProfile, Goal } from "../engine/types";

export interface StoredBill {
  id: string;
  name: string;
  amountMinor: number;
  dayOfMonth: number;
}

export interface StoredGoal {
  id: string;
  name: string;
  emoji: string;
  targetMinor: number;
  currentMinor: number;
  /** months from setup to target; null = open-ended */
  months: number | null;
  priority: Goal["priority"];
}

export interface AcceptedPlan {
  /** plan applies until this payday (ISO); stale plans are ignored */
  appliedUntilISO: string;
  protectMinor: number;
  goalsMinor: number;
  growMinor: number;
}

export interface UserSetup {
  version: 1;
  mode: "demo" | "manual";
  createdAtISO: string;
  /** manual mode only */
  manual?: {
    displayName: string;
    monthlyIncomeMinor: number;
    incomeType: FinancialProfile["incomeType"];
    paydayDayOfMonth: number;
    essentialMonthlyEstimateMinor: number;
    checkingBalanceMinor: number;
    protectBalanceMinor: number;
    riskPreference: FinancialProfile["riskPreference"];
    investmentExperience: FinancialProfile["investmentExperience"];
    bills: StoredBill[];
    goals: StoredGoal[];
  };
  acceptedPlan?: AcceptedPlan;
}

const KEY = "one.setup.v1";

export function loadSetup(): UserSetup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSetup;
    if (parsed.version !== 1 || (parsed.mode !== "demo" && parsed.mode !== "manual")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSetup(setup: UserSetup): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(setup));
  } catch {
    // Storage may be unavailable (private mode) — the app still works, it just won't persist.
  }
}

export function clearSetup(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
