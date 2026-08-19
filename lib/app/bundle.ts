/**
 * Data bundle sources: demo (seeded sample data) or manual (the user's own
 * numbers from onboarding). Both feed the same buildAppState.
 */
import { clampNonNegative, fromMajor, sumMinor } from "../money";
import type { Account, Category, FinancialProfile, Goal, RecurringItem, Transaction } from "../engine/types";
import { parseISODate, toISODate } from "../engine/dates";
import { demoAccounts, demoGoals, demoProfile, demoRecurringItems, generateDemoTransactions } from "../demo/data";
import type { DataBundle } from "./state";
import type { StoredTransaction, UserSetup } from "./storage";

const KNOWN_CATEGORIES: Category[] = [
  "Income", "Housing", "Groceries", "Dining", "Transport", "Shopping", "Entertainment", "Subscriptions",
  "Utilities", "Health", "Education", "Travel", "Debt", "Transfers", "Investments", "Savings", "Fees", "Cash", "Other",
];

function toEngineTransaction(t: StoredTransaction, userId: string): Transaction {
  const category = (KNOWN_CATEGORIES as string[]).includes(t.category) ? (t.category as Category) : "Other";
  return {
    id: t.id,
    userId,
    accountId: "acc-checking",
    amountMinor: t.amountMinor,
    currency: "KWD",
    direction: t.direction,
    merchant: t.merchant,
    merchantNormalized: t.merchant.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: t.note ?? t.merchant,
    category,
    transactionDate: t.dateISO,
    postedDate: t.dateISO,
    isRecurring: false,
    source: "manual",
    confidence: 1,
  };
}

/** Merge user-entered transactions into a bundle: history grows and the checking balance moves. */
function applyUserTransactions(
  accounts: Account[],
  transactions: Transaction[],
  userTx: StoredTransaction[],
  userId: string,
): { accounts: Account[]; transactions: Transaction[] } {
  if (userTx.length === 0) return { accounts, transactions };
  const engineTx = userTx.map((t) => toEngineTransaction(t, userId));
  const net =
    sumMinor(engineTx.filter((t) => t.direction === "credit").map((t) => t.amountMinor)) -
    sumMinor(engineTx.filter((t) => t.direction === "debit").map((t) => t.amountMinor));
  const adjusted = accounts.map((a) =>
    a.kind === "checking" ? { ...a, balanceMinor: clampNonNegative(a.balanceMinor + net) } : a,
  );
  const merged = [...engineTx, ...transactions].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  return { accounts: adjusted, transactions: merged };
}

export function demoBundle(todayISO: string, userTx: StoredTransaction[] = []): DataBundle {
  const { accounts, transactions } = applyUserTransactions(
    demoAccounts,
    generateDemoTransactions(todayISO),
    userTx,
    demoProfile.userId,
  );
  return {
    profile: demoProfile,
    accounts,
    goals: demoGoals(todayISO),
    transactions,
    recurring: demoRecurringItems(todayISO),
    hasHistory: true,
  };
}

export function manualBundle(
  setup: NonNullable<UserSetup["manual"]>,
  todayISO: string,
  userTx: StoredTransaction[] = [],
): DataBundle {
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

  const merged = applyUserTransactions(accounts, [], userTx, profile.userId);
  return {
    profile,
    accounts: merged.accounts,
    goals,
    transactions: merged.transactions,
    recurring,
    hasHistory: false,
  };
}
