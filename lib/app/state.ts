/**
 * Application state builder — composes a data bundle (demo or the user's own
 * numbers) with the deterministic engine. The UI and the AI tools both read
 * from here, so chat can never invent numbers the app doesn't have.
 */
import { clampNonNegative, divideMinor, sumMinor } from "../money";
import type { CurrencyCode } from "../money";
import { bucketTotals, calculateAllocation } from "../engine/allocation";
import type { AllocationRecommendation } from "../engine/types";
import { addDays, daysBetween, nextPayday, toISODate } from "../engine/dates";
import { calculateEmergencyStatus, type EmergencyStatus } from "../engine/emergency";
import {
  categorySpend,
  detectFoundMoney,
  detectSubscriptionIncrease,
  suggestJobsForFoundMoney,
  type JobSuggestion,
} from "../engine/insights";
import {
  projectGoalCompletion,
  requiredMonthlyContribution,
  type GoalContributionPlan,
  type GoalProjection,
} from "../engine/goals";
import { calculateCashFlowForecast, type CashFlowForecast } from "../engine/forecast";
import { calculateSafeToSpend } from "../engine/safeToSpend";
import { calculateOneScore } from "../engine/score";
import { evaluateWorthIt, type WorthItInput, type WorthItResult } from "../engine/worthIt";
import type {
  Account,
  Category,
  FinancialProfile,
  Goal,
  MoneyInsight,
  OneScore,
  RecurringItem,
  SafeToSpendInput,
  SafeToSpendResult,
  Transaction,
} from "../engine/types";
import type { AcceptedPlan } from "./storage";

export interface DataBundle {
  profile: FinancialProfile;
  accounts: Account[];
  goals: Goal[];
  transactions: Transaction[];
  recurring: RecurringItem[];
  /** true when months of transaction history exist (demo); manual setups start without it */
  hasHistory: boolean;
}

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

export interface AppState {
  mode: "demo" | "manual";
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
  isPaydayToday: boolean;
  totalCashMinor: number;
  buckets: BucketView[];
  safeToSpendInput: SafeToSpendInput;
  safeToSpend: SafeToSpendResult;
  allocation: AllocationRecommendation;
  /** recommendation totals per bucket (before any accepted-plan override) */
  allocationBuckets: Record<string, number>;
  /** the plan in force: accepted override when valid, else the recommendation */
  planBuckets: Record<string, number>;
  planIsAccepted: boolean;
  growMonthlyMinor: number;
  enjoyMonthlyMinor: number;
  goalMonthlyTotalMinor: number;
  hasHistory: boolean;
  insight: MoneyInsight | null;
  insightJobs: JobSuggestion[];
  secondaryInsight: MoneyInsight | null;
  score: OneScore;
  monthSpendByCategory: Array<{ category: Category; amountMinor: number }>;
  forecast: CashFlowForecast;
  /** how the forecast's daily spending estimate was derived (explainability) */
  forecastBasis: string;
  evaluatePurchase: (itemName: string, priceMinor: number) => WorthItResult;
}

/** Prorate a monthly flow across `days` of a 30-day cycle. */
function prorate(monthlyMinor: number, days: number): number {
  return divideMinor(monthlyMinor * Math.max(0, Math.min(days, 30)), 30, "round");
}

export function buildAppState(
  bundle: DataBundle,
  mode: AppState["mode"],
  now = new Date(),
  accepted?: AcceptedPlan,
): AppState {
  const todayISO = toISODate(now);
  const { profile, accounts, transactions, recurring, hasHistory } = bundle;
  const rawGoals = bundle.goals;
  const currency = profile.preferredCurrency;

  const paydayISO = nextPayday(todayISO, profile.paydayDayOfMonth);
  const daysToPayday = daysBetween(todayISO, paydayISO);
  const isPaydayToday = Number(todayISO.slice(8, 10)) === profile.paydayDayOfMonth;

  const checking = accounts.find((a) => a.kind === "checking") ?? accounts[0];
  const savings = accounts.find((a) => a.kind === "savings");
  const protectBalanceMinor = savings?.balanceMinor ?? 0;
  const totalCashMinor = sumMinor(accounts.map((a) => a.balanceMinor));

  const emergency = calculateEmergencyStatus(
    protectBalanceMinor,
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
    protectCurrentMinor: protectBalanceMinor,
    goals: rawGoals,
    todayISO,
  });
  const allocationBuckets = bucketTotals(allocation);

  // Accepted plan override (valid until its payday passes)
  const acceptedValid = accepted !== undefined && accepted.appliedUntilISO > todayISO;
  const flexTotal = Math.max(0, allocation.totalMinor - allocationBuckets.life - allocationBuckets.bills);
  const planBuckets: Record<string, number> = acceptedValid
    ? {
        life: allocationBuckets.life,
        bills: allocationBuckets.bills,
        protect: Math.min(accepted.protectMinor, flexTotal),
        goals: Math.min(accepted.goalsMinor, flexTotal),
        grow: Math.min(accepted.growMinor, flexTotal),
        enjoy: clampNonNegative(flexTotal - accepted.protectMinor - accepted.goalsMinor - accepted.growMinor),
      }
    : { ...allocationBuckets };

  const growMonthlyMinor = planBuckets.grow;
  const enjoyMonthlyMinor = planBuckets.enjoy;
  const goalMonthlyTotalMinor = planBuckets.goals;

  // Goals with plans and projections at the in-force pace
  const goalItems = allocation.items.filter((i) => i.bucket === "goals");
  const goalScale = allocationBuckets.goals > 0 ? goalMonthlyTotalMinor / allocationBuckets.goals : 0;
  const goals: GoalView[] = rawGoals.map((g) => {
    const plan = requiredMonthlyContribution(g, todayISO);
    const recAllocated = goalItems.find((i) => i.goalId === g.id)?.amountMinor ?? 0;
    const allocated = Math.round(recAllocated * goalScale);
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
    availableCashMinor: checking?.balanceMinor ?? 0,
    reservedBillsMinor,
    essentialsRemainingMinor: prorate(profile.essentialMonthlyEstimateMinor, daysToPayday),
    safetyBufferMinor: profile.minimumCashBufferMinor,
    goalCommitmentsMinor: prorate(goalMonthlyTotalMinor, daysToPayday),
    plannedGrowthMinor: prorate(growMonthlyMinor, daysToPayday),
    daysUntilNextIncome: daysToPayday,
  };
  const safeToSpend = calculateSafeToSpend(safeToSpendInput, hasHistory ? "high" : "medium");

  // "Your money" — decompose current cash so every dinar shows its job.
  const buckets: BucketView[] = [
    {
      key: "life",
      label: "Life",
      amountMinor: safeToSpendInput.essentialsRemainingMinor,
      hint: "Essentials until payday",
    },
    {
      key: "bills",
      label: "Bills",
      amountMinor: reservedBillsMinor + profile.minimumCashBufferMinor,
      hint: "Due before payday + cash buffer",
    },
    { key: "protect", label: "Protect", amountMinor: protectBalanceMinor, hint: "Emergency reserve" },
    { key: "grow", label: "Grow", amountMinor: safeToSpendInput.plannedGrowthMinor, hint: "This cycle's growth plan" },
    { key: "goals", label: "Goals", amountMinor: safeToSpendInput.goalCommitmentsMinor, hint: "This cycle's goal pace" },
    {
      key: "enjoy",
      label: "Enjoy",
      amountMinor: safeToSpend.discretionaryMinor,
      hint: "Spendable — powers Safe to Spend",
    },
  ];

  // Insights — only from real history; a plan with no data has nothing honest to find.
  const monthStartISO = todayISO.slice(0, 8) + "01";
  let insight: MoneyInsight | null = null;
  let secondaryInsight: MoneyInsight | null = null;
  if (hasHistory) {
    const threeMonthsAgoISO = addDays(monthStartISO, -90);
    const priorTransport = categorySpend(transactions, "Transport", threeMonthsAgoISO, addDays(monthStartISO, -1));
    const expectedTransportMonthly = divideMinor(priorTransport, 3, "round");
    const dayOfMonth = daysBetween(monthStartISO, todayISO) + 1;
    insight = detectFoundMoney({
      transactions,
      category: "Transport",
      expectedMinor: prorate(expectedTransportMonthly, dayOfMonth),
      fromISO: monthStartISO,
      toISO: todayISO,
      currency,
      thresholdMinor: 5000,
    });
    secondaryInsight = detectSubscriptionIncrease(transactions, currency);
  }
  const topGoal = goals.find((g) => g.priority === "high") ?? goals[0] ?? null;
  const insightJobs = insight ? suggestJobsForFoundMoney(insight.availableMinor, topGoal?.name ?? null) : [];

  // ONE Score — history-based when possible, otherwise honestly plan-based.
  const ninetyDaysAgo = addDays(todayISO, -90);
  const income90 = hasHistory
    ? sumMinor(
        transactions
          .filter((t) => t.direction === "credit" && t.transactionDate >= ninetyDaysAgo)
          .map((t) => t.amountMinor),
      )
    : (profile.monthlyIncomeMinor ?? 0) * 3;
  const spend90 = hasHistory
    ? sumMinor(
        transactions
          .filter((t) => t.direction === "debit" && t.transactionDate >= ninetyDaysAgo)
          .map((t) => t.amountMinor),
      )
    : (profile.essentialMonthlyEstimateMinor + billsMonthlyMinor + enjoyMonthlyMinor) * 3;
  const score = calculateOneScore({
    currency,
    protectBalanceMinor,
    essentialMonthlyMinor: profile.essentialMonthlyEstimateMinor,
    incomeMinor: income90,
    spendMinor: spend90,
    growMonthlyMinor,
    monthlyIncomeMinor: profile.monthlyIncomeMinor ?? 0,
    goals: rawGoals,
    basis: hasHistory ? "last 90 days" : "your plan — no transaction history yet",
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

  // 30-day cash-flow forecast — daily run-rate from real history when it exists,
  // otherwise from the plan (essentials + enjoy pace).
  const thirtyDaysAgo = addDays(todayISO, -30);
  const nonRecurringSpend30 = sumMinor(
    transactions
      .filter((t) => t.direction === "debit" && !t.isRecurring && t.transactionDate >= thirtyDaysAgo)
      .map((t) => t.amountMinor),
  );
  const dailySpendMinor = hasHistory
    ? divideMinor(nonRecurringSpend30, 30, "round")
    : divideMinor(profile.essentialMonthlyEstimateMinor + enjoyMonthlyMinor, 30, "round");
  const forecastBasis = hasHistory
    ? "your average daily spending over the last 30 days (bills counted separately)"
    : "your plan's essentials + Enjoy pace (no spending history yet)";
  const forecast = calculateCashFlowForecast({
    todayISO,
    startBalanceMinor: checking?.balanceMinor ?? 0,
    bufferMinor: profile.minimumCashBufferMinor,
    horizonDays: 30,
    salaryMinor: profile.monthlyIncomeMinor ?? 0,
    paydayDayOfMonth: profile.paydayDayOfMonth,
    scheduled: recurring.filter((r) => r.type === "bill" || r.type === "subscription"),
    dailySpendMinor,
  });

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
        ? {
            ...topGoal,
            monthlyContributionMinor: Math.round(
              (goalItems.find((i) => i.goalId === topGoal.id)?.amountMinor ?? 0) * goalScale,
            ),
          }
        : null,
      growMonthlyMinor,
      todayISO,
      nextPaydayISO: paydayISO,
    };
    return evaluateWorthIt(input);
  };

  return {
    mode,
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
    isPaydayToday,
    totalCashMinor,
    buckets,
    safeToSpendInput,
    safeToSpend,
    allocation,
    allocationBuckets,
    planBuckets,
    planIsAccepted: acceptedValid,
    growMonthlyMinor,
    enjoyMonthlyMinor,
    goalMonthlyTotalMinor,
    hasHistory,
    insight,
    insightJobs,
    secondaryInsight,
    score,
    monthSpendByCategory,
    forecast,
    forecastBasis,
    evaluatePurchase,
  };
}
