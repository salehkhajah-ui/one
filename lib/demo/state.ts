/**
 * Demo application state — composes demo data with the deterministic engine.
 * This is the "application services" layer: the UI and the AI tools both read
 * from here, so chat can never invent numbers the app doesn't have.
 */
import { clampNonNegative, divideMinor, sumMinor } from "../money";
import type { CurrencyCode } from "../money";
import { bucketTotals, calculateAllocation } from "../engine/allocation";
import type { AllocationRecommendation } from "../engine/types";
import { addDays, daysBetween, nextPayday, toISODate } from "../engine/dates";
import { calculateEmergencyStatus, type EmergencyStatus } from "../engine/emergency";
import { categorySpend, detectFoundMoney, detectSubscriptionIncrease, suggestJobsForFoundMoney, type JobSuggestion } from "../engine/insights";
import { projectGoalCompletion, requiredMonthlyContribution, type GoalContributionPlan, type GoalProjection } from "../engine/goals";
import { calculateSafeToSpend } from "../engine/safeToSpend";
import { calculateOneScore } from "../engine/score";
import { evaluateWorthIt, type WorthItInput, type WorthItResult } from "../engine/worthIt";
import type { Account, Category, FinancialProfile, Goal, MoneyInsight, OneScore, RecurringItem, SafeToSpendInput, SafeToSpendResult, Transaction } from "../engine/types";
import { demoAccounts, demoGoals, demoProfile, demoRecurringItems, generateDemoTransactions } from "./data";

export interface BucketView {
  key: "life" | "bills" | "protect" | "grow" | "goals" | "enjoy";
  label: string;
  amountMinor: number;
  hint: string;
}

export interface GoalView extends Goal {
  plan: GoalContributionPlan;
  projection: GoalProjection;
  progressPct: number;
}

export interface DemoState {
  todayISO: string;
  currency: CurrencyCode;
  profile: FinancialProfile;
  accounts: Account[];
  transactions: Transaction[];
  recurring: RecurringItem[];
  goals: GoalView[];
  emergency: EmergencyStatus;
  nextPaydayISO: string;
  daysToPayday: number;
  totalCashMinor: number;
  buckets: BucketView[];
  safeToSpendInput: SafeToSpendInput;
  safeToSpend: SafeToSpendResult;
  allocation: AllocationRecommendation;
  allocationBuckets: Record<string, number>;
  growMonthlyMinor: number;
  enjoyMonthlyMinor: number;
  goalMonthlyTotalMinor: number;
  insight: MoneyInsight | null;
  insightJobs: JobSuggestion[];
  secondaryInsight: MoneyInsight | null;
  score: OneScore;
  monthSpendByCategory: Array<{ category: Category; amountMinor: number }>;
  evaluatePurchase: (itemName: string, priceMinor: number) => WorthItResult;
}

/** Prorate a monthly flow across `days` of a 30-day cycle. */
function prorate(monthlyMinor: number, days: number): number {
  return divideMinor(monthlyMinor * Math.max(0, Math.min(days, 30)), 30, "round");
}

export function buildDemoState(now = new Date()): DemoState {
  const todayISO = toISODate(now);
  const currency: CurrencyCode = "KWD";
  const profile = demoProfile;
  const accounts = demoAccounts;
  const transactions = generateDemoTransactions(todayISO);
  const recurring = demoRecurringItems(todayISO);
  const rawGoals = demoGoals(todayISO);

  const paydayISO = nextPayday(todayISO, profile.paydayDayOfMonth);
  const daysToPayday = daysBetween(todayISO, paydayISO);

  const checking = accounts.find((a) => a.kind === "checking")!;
  const savings = accounts.find((a) => a.kind === "savings")!;
  const totalCashMinor = sumMinor(accounts.map((a) => a.balanceMinor));

  const emergency = calculateEmergencyStatus(
    savings.balanceMinor,
    profile.essentialMonthlyEstimateMinor,
    profile.emergencyTargetMonths,
  );

  // Monthly allocation plan (what happens each payday)
  const billsMonthlyMinor = sumMinor(
    recurring.filter((r) => r.type === "bill" || r.type === "subscription").map((r) => r.averageAmountMinor),
  );
  const allocation = calculateAllocation({
    incomeMinor: profile.monthlyIncomeMinor ?? 0,
    currency,
    profile,
    billsDueMinor: billsMonthlyMinor,
    protectCurrentMinor: savings.balanceMinor,
    goals: rawGoals,
    todayISO,
  });
  const allocationBuckets = bucketTotals(allocation);
  const growMonthlyMinor = allocationBuckets.grow;
  const enjoyMonthlyMinor = allocationBuckets.enjoy;
  const goalMonthlyTotalMinor = allocationBuckets.goals;

  // Goals with plans and projections at the allocated pace
  const goalItems = allocation.items.filter((i) => i.bucket === "goals");
  const goals: GoalView[] = rawGoals.map((g) => {
    const plan = requiredMonthlyContribution(g, todayISO);
    const allocated = goalItems.find((i) => i.goalId === g.id)?.amountMinor ?? 0;
    const projection = projectGoalCompletion(g, allocated, todayISO);
    return {
      ...g,
      plan,
      projection,
      progressPct: g.targetMinor > 0 ? Math.round((g.currentMinor / g.targetMinor) * 100) : 0,
    };
  });

  // Safe to Spend for the remainder of this pay cycle
  const reservedBillsMinor = sumMinor(
    recurring
      .filter((r) => (r.type === "bill" || r.type === "subscription") && r.nextExpectedDate < paydayISO)
      .map((r) => r.averageAmountMinor),
  );
  const safeToSpendInput: SafeToSpendInput = {
    availableCashMinor: checking.balanceMinor,
    reservedBillsMinor,
    essentialsRemainingMinor: prorate(profile.essentialMonthlyEstimateMinor, daysToPayday),
    safetyBufferMinor: profile.minimumCashBufferMinor,
    goalCommitmentsMinor: prorate(goalMonthlyTotalMinor, daysToPayday),
    plannedGrowthMinor: prorate(growMonthlyMinor, daysToPayday),
    daysUntilNextIncome: daysToPayday,
  };
  const safeToSpend = calculateSafeToSpend(safeToSpendInput);

  // "Your money" — decompose current cash so every dinar shows its job.
  // Enjoy holds the discretionary pool (it is exactly what Safe to Spend draws from).
  const buckets: BucketView[] = [
    { key: "life", label: "Life", amountMinor: safeToSpendInput.essentialsRemainingMinor, hint: "Essentials until payday" },
    { key: "bills", label: "Bills", amountMinor: reservedBillsMinor + profile.minimumCashBufferMinor, hint: "Due before payday + cash buffer" },
    { key: "protect", label: "Protect", amountMinor: savings.balanceMinor, hint: "Emergency reserve" },
    { key: "grow", label: "Grow", amountMinor: safeToSpendInput.plannedGrowthMinor, hint: "This cycle's growth plan" },
    { key: "goals", label: "Goals", amountMinor: safeToSpendInput.goalCommitmentsMinor, hint: "This cycle's goal pace" },
    { key: "enjoy", label: "Enjoy", amountMinor: safeToSpend.discretionaryMinor, hint: "Spendable — powers Safe to Spend" },
  ];

  // Insights
  const monthStartISO = todayISO.slice(0, 8) + "01";
  const threeMonthsAgoISO = addDays(monthStartISO, -90);
  const priorTransport = categorySpend(transactions, "Transport", threeMonthsAgoISO, addDays(monthStartISO, -1));
  const expectedTransportMonthly = divideMinor(priorTransport, 3, "round");
  const dayOfMonth = daysBetween(monthStartISO, todayISO) + 1;
  const insight = detectFoundMoney({
    transactions,
    category: "Transport",
    expectedMinor: prorate(expectedTransportMonthly, dayOfMonth),
    fromISO: monthStartISO,
    toISO: todayISO,
    currency,
    thresholdMinor: 5000,
  });
  const topGoal = goals.find((g) => g.priority === "high") ?? goals[0] ?? null;
  const insightJobs = insight ? suggestJobsForFoundMoney(insight.availableMinor, topGoal?.name ?? null) : [];
  const secondaryInsight = detectSubscriptionIncrease(transactions, currency);

  // ONE Score over the last 90 days of transactions
  const ninetyDaysAgo = addDays(todayISO, -90);
  const income90 = sumMinor(
    transactions.filter((t) => t.direction === "credit" && t.transactionDate >= ninetyDaysAgo).map((t) => t.amountMinor),
  );
  const spend90 = sumMinor(
    transactions.filter((t) => t.direction === "debit" && t.transactionDate >= ninetyDaysAgo).map((t) => t.amountMinor),
  );
  const score = calculateOneScore({
    currency,
    protectBalanceMinor: savings.balanceMinor,
    essentialMonthlyMinor: profile.essentialMonthlyEstimateMinor,
    incomeMinor: income90,
    spendMinor: spend90,
    growMonthlyMinor,
    monthlyIncomeMinor: profile.monthlyIncomeMinor ?? 0,
    goals: rawGoals,
    basis: "last 90 days",
  });

  // Current-month spending by category (for Home activity + chat answers)
  const categories = new Map<Category, number>();
  for (const t of transactions) {
    if (t.direction === "debit" && t.transactionDate >= monthStartISO) {
      categories.set(t.category, (categories.get(t.category) ?? 0) + t.amountMinor);
    }
  }
  const monthSpendByCategory = [...categories.entries()]
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);

  const enjoyAvailableMinor = clampNonNegative(
    Math.min(prorate(enjoyMonthlyMinor, daysToPayday), safeToSpend.discretionaryMinor),
  );

  const evaluatePurchase = (itemName: string, priceMinor: number): WorthItResult => {
    const input: WorthItInput = {
      itemName,
      priceMinor,
      currency,
      safeToSpend: safeToSpendInput,
      enjoyAvailableMinor,
      enjoyMonthlyMinor,
      topGoal: topGoal
        ? { ...topGoal, monthlyContributionMinor: goalItems.find((i) => i.goalId === topGoal.id)?.amountMinor ?? 0 }
        : null,
      growMonthlyMinor,
      todayISO,
      nextPaydayISO: paydayISO,
    };
    return evaluateWorthIt(input);
  };

  return {
    todayISO,
    currency,
    profile,
    accounts,
    transactions,
    recurring,
    goals,
    emergency,
    nextPaydayISO: paydayISO,
    daysToPayday,
    totalCashMinor,
    buckets,
    safeToSpendInput,
    safeToSpend,
    allocation,
    allocationBuckets,
    growMonthlyMinor,
    enjoyMonthlyMinor,
    goalMonthlyTotalMinor,
    insight,
    insightJobs,
    secondaryInsight,
    score,
    monthSpendByCategory,
    evaluatePurchase,
  };
}
