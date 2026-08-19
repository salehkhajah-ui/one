/**
 * Data bundle sources: demo (seeded sample data) or manual (the user's own
 * numbers from onboarding). Both feed the same buildAppState.
 */
import { fromMajor } from "../money";
import type { Account, FinancialProfile, Goal, RecurringItem } from "../engine/types";
import { parseISODate, toISODate } from "../engine/dates";
import { demoAccounts, demoGoals, demoProfile, demoRecurringItems, generateDemoTransactions } from "../demo/data";
import type { DataBundle } from "./state";
import type { UserSetup } from "./storage";

export function demoBundle(todayISO: string): DataBundle {
  return {
    profile: demoProfile,
    accounts: demoAccounts,
    goals: demoGoals(todayISO),
    transactions: generateDemoTransactions(todayISO),
    recurring: demoRecurringItems(todayISO),
    hasHistory: true,
  };
}

export function manualBundle(setup: NonNullable<UserSetup["manual"]>, todayISO: string): DataBundle {
  const profile: FinancialProfile = {
    userId: "local-user",
    displayName: setup.displayName || "there",
    monthlyIncomeMinor: setup.monthlyIncomeMinor,
    incomeType: setup.incomeType,
    payFrequency: "monthly",
    paydayDayOfMonth: setup.paydayDayOfMonth,
    essentialMonthlyEstimateMinor: setup.essentialMonthlyEstimateMinor,
    housingCostMinor: 0,
    debtPaymentsMinor: 0,
    emergencyTargetMonths: 3,
    minimumCashBufferMinor: fromMajor(100),
    riskPreference: setup.riskPreference,
    investmentExperience: setup.investmentExperience,
    preferredCurrency: "KWD",
    country: "KW",
  };

  const accounts: Account[] = [
    { id: "acc-checking", name: "Checking", kind: "checking", balanceMinor: setup.checkingBalanceMinor, currency: "KWD" },
    { id: "acc-protect", name: "Emergency savings", kind: "savings", balanceMinor: setup.protectBalanceMinor, currency: "KWD" },
  ];

  const today = parseISODate(todayISO);
  const goals: Goal[] = setup.goals.map((g) => {
    const targetDate =
      g.months === null ? null : toISODate(new Date(today.getFullYear(), today.getMonth() + g.months, today.getDate()));
    return {
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      targetMinor: g.targetMinor,
      currentMinor: g.currentMinor,
      currency: "KWD",
      targetDate,
      priority: g.priority,
      deadlineFlexible: true,
      autoAllocate: true,
      status: "active",
    };
  });

  const recurring: RecurringItem[] = setup.bills.map((b) => {
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), Math.min(28, Math.max(1, b.dayOfMonth)));
    const next =
      thisMonth.getTime() > today.getTime()
        ? thisMonth
        : new Date(today.getFullYear(), today.getMonth() + 1, Math.min(28, Math.max(1, b.dayOfMonth)));
    return {
      id: b.id,
      merchant: b.name,
      merchantNormalized: b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      averageAmountMinor: b.amountMinor,
      frequency: "monthly",
      nextExpectedDate: toISODate(next),
      confidence: 1,
      type: "bill",
      active: true,
    };
  });

  return { profile, accounts, goals, transactions: [], recurring, hasHistory: false };
}
