/**
 * Demo Mode — realistic Kuwaiti sample data for Omar (24, salary 1,200 KD, payday 25th).
 * Deterministic (seeded) and anchored to "today" so paydays and bills fall naturally
 * around the current date. Every major screen works from this data with no APIs.
 */
import { fromMajor } from "../money";
import type { Account, FinancialProfile, Goal, RecurringItem, Transaction } from "../engine/types";
import { addDays, parseISODate, toISODate } from "../engine/dates";
import { intBetween, mulberry32, pick } from "./seed";

export const DEMO_USER_ID = "demo-omar";

export const demoProfile: FinancialProfile = {
  userId: DEMO_USER_ID,
  displayName: "Omar",
  monthlyIncomeMinor: fromMajor(1200),
  incomeType: "salary",
  payFrequency: "monthly",
  paydayDayOfMonth: 25,
  essentialMonthlyEstimateMinor: fromMajor(480),
  housingCostMinor: 0,
  debtPaymentsMinor: 0,
  emergencyTargetMonths: 3,
  minimumCashBufferMinor: fromMajor(100),
  riskPreference: "moderate",
  investmentExperience: "new",
  preferredCurrency: "KWD",
  country: "KW",
};

export const demoAccounts: Account[] = [
  { id: "acc-checking", name: "NBK Checking", kind: "checking", balanceMinor: fromMajor(730), currency: "KWD" },
  { id: "acc-savings", name: "NBK Savings", kind: "savings", balanceMinor: fromMajor(400), currency: "KWD" },
];

export function demoGoals(todayISO: string): Goal[] {
  const today = parseISODate(todayISO);
  const japanDate = new Date(today.getFullYear(), today.getMonth() + 7, 1);
  return [
    {
      id: "goal-japan",
      name: "Japan Trip",
      emoji: "🇯🇵",
      targetMinor: fromMajor(1500),
      currentMinor: fromMajor(450),
      currency: "KWD",
      targetDate: toISODate(japanDate),
      priority: "high",
      deadlineFlexible: true,
      autoAllocate: true,
      status: "active",
    },
    {
      id: "goal-car",
      name: "Car",
      emoji: "🚗",
      targetMinor: fromMajor(5000),
      currentMinor: fromMajor(1800),
      currency: "KWD",
      targetDate: null,
      priority: "medium",
      deadlineFlexible: true,
      autoAllocate: true,
      status: "active",
    },
  ];
}

interface RecurringDef {
  merchant: string;
  normalized: string;
  amountMinor: number;
  dayOfMonth: number;
  category: Transaction["category"];
  type: RecurringItem["type"];
  /** month offset (from oldest) at which the amount changes, for the price-increase insight */
  amountFromMonth?: { month: number; amountMinor: number };
}

const RECURRING: RecurringDef[] = [
  { merchant: "Zain", normalized: "zain", amountMinor: fromMajor(12), dayOfMonth: 3, category: "Utilities", type: "bill" },
  { merchant: "Ooredoo Fiber", normalized: "ooredoo", amountMinor: fromMajor(25), dayOfMonth: 5, category: "Utilities", type: "bill" },
  {
    merchant: "Netflix",
    normalized: "netflix",
    amountMinor: fromMajor(4.5),
    dayOfMonth: 8,
    category: "Subscriptions",
    type: "subscription",
    amountFromMonth: { month: 3, amountMinor: fromMajor(6) }, // price increase in the most recent months
  },
  { merchant: "Spotify", normalized: "spotify", amountMinor: fromMajor(2.5), dayOfMonth: 11, category: "Subscriptions", type: "subscription" },
  { merchant: "Flare Fitness", normalized: "flare-fitness", amountMinor: fromMajor(20), dayOfMonth: 14, category: "Health", type: "subscription" },
];

const GROCERY_MERCHANTS = ["The Sultan Center", "LuLu Hypermarket", "City Centre", "Saveco"];
const DINING_MERCHANTS = ["Mais Alghanim", "Shake Shack", "Pick", "Zaatar w Zeit", "Slider Station", "Freej Swaileh"];
const COFFEE_MERCHANTS = ["%Arabica", "Caribou Coffee", "Starbucks", "Vol.1"];
const FUEL_MERCHANTS = ["KNPC Station", "Oula Station"];
const SHOPPING_MERCHANTS = ["The Avenues", "Xcite", "H&M", "IKEA Kuwait", "360 Mall"];

let txCounter = 0;
function makeTx(
  partial: Omit<Transaction, "id" | "userId" | "accountId" | "currency" | "postedDate" | "merchantNormalized" | "source" | "confidence" | "isRecurring" | "description"> &
    Partial<Pick<Transaction, "isRecurring" | "description" | "merchantNormalized">>,
): Transaction {
  txCounter += 1;
  return {
    id: `demo-tx-${txCounter}`,
    userId: DEMO_USER_ID,
    accountId: "acc-checking",
    currency: "KWD",
    postedDate: partial.transactionDate,
    merchantNormalized: partial.merchantNormalized ?? partial.merchant.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    source: "demo",
    confidence: 1,
    isRecurring: partial.isRecurring ?? false,
    description: partial.description ?? partial.merchant,
    ...partial,
  };
}

/**
 * Generate ~4 months of transactions ending today.
 * The current month intentionally runs light on Transport so the
 * "ONE found money" insight has something real to find.
 */
export function generateDemoTransactions(todayISO: string): Transaction[] {
  txCounter = 0;
  const rng = mulberry32(20260819);
  const txs: Transaction[] = [];
  const today = parseISODate(todayISO);
  const start = new Date(today.getFullYear(), today.getMonth() - 4, 1);
  const startISO = toISODate(start);
  const totalDays = Math.round((today.getTime() - start.getTime()) / 86_400_000);

  for (let d = 0; d <= totalDays; d++) {
    const iso = addDays(startISO, d);
    const date = parseISODate(iso);
    const dom = date.getDate();
    const dow = date.getDay(); // 0 Sun … 6 Sat (Kuwait weekend: Fri/Sat)
    const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const monthIndex = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());

    // Salary on the 25th
    if (dom === demoProfile.paydayDayOfMonth) {
      txs.push(
        makeTx({
          amountMinor: fromMajor(1200),
          direction: "credit",
          merchant: "Salary — Alghanim Industries",
          merchantNormalized: "salary-alghanim",
          category: "Income",
          transactionDate: iso,
          isRecurring: true,
          recurringGroupId: "rec-salary",
        }),
      );
    }

    // Recurring bills & subscriptions
    for (const r of RECURRING) {
      if (dom === r.dayOfMonth) {
        const amount =
          r.amountFromMonth && monthIndex >= r.amountFromMonth.month ? r.amountFromMonth.amountMinor : r.amountMinor;
        txs.push(
          makeTx({
            amountMinor: amount,
            direction: "debit",
            merchant: r.merchant,
            merchantNormalized: r.normalized,
            category: r.category,
            transactionDate: iso,
            isRecurring: true,
            recurringGroupId: `rec-${r.normalized}`,
          }),
        );
      }
    }

    // Fuel roughly twice a week — but rarely in the current month (found-money setup)
    const fuelChance = isCurrentMonth ? 0.07 : 0.28;
    if ((dow === 1 || dow === 4) && rng() < fuelChance * 3.5) {
      txs.push(
        makeTx({
          amountMinor: fromMajor(intBetween(rng, 7, 11)),
          direction: "debit",
          merchant: pick(rng, FUEL_MERCHANTS),
          category: "Transport",
          transactionDate: iso,
        }),
      );
    }

    // Groceries ~ twice a week
    if ((dow === 2 || dow === 6) && rng() < 0.85) {
      txs.push(
        makeTx({
          amountMinor: fromMajor(intBetween(rng, 12, 32)) + intBetween(rng, 0, 999),
          direction: "debit",
          merchant: pick(rng, GROCERY_MERCHANTS),
          category: "Groceries",
          transactionDate: iso,
        }),
      );
    }

    // Dining — heavier on the Kuwaiti weekend (Thu night / Fri / Sat)
    const diningChance = dow === 5 || dow === 6 || dow === 4 ? 0.55 : 0.18;
    if (rng() < diningChance) {
      txs.push(
        makeTx({
          amountMinor: fromMajor(intBetween(rng, 4, 16)) + intBetween(rng, 0, 750),
          direction: "debit",
          merchant: pick(rng, DINING_MERCHANTS),
          category: "Dining",
          transactionDate: iso,
        }),
      );
    }

    // Coffee ~ 3x/week
    if (rng() < 0.42) {
      txs.push(
        makeTx({
          amountMinor: fromMajor(intBetween(rng, 1, 3)) + intBetween(rng, 0, 900),
          direction: "debit",
          merchant: pick(rng, COFFEE_MERCHANTS),
          category: "Dining",
          subcategory: "Coffee",
          transactionDate: iso,
        }),
      );
    }

    // Occasional shopping (a few times a month)
    if (rng() < 0.08) {
      txs.push(
        makeTx({
          amountMinor: fromMajor(intBetween(rng, 8, 55)),
          direction: "debit",
          merchant: pick(rng, SHOPPING_MERCHANTS),
          category: "Shopping",
          transactionDate: iso,
        }),
      );
    }

    // Rare entertainment
    if ((dow === 5 || dow === 6) && rng() < 0.12) {
      txs.push(
        makeTx({
          amountMinor: fromMajor(intBetween(rng, 3, 12)),
          direction: "debit",
          merchant: "VOX Cinemas",
          category: "Entertainment",
          transactionDate: iso,
        }),
      );
    }
  }

  return txs.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

export function demoRecurringItems(todayISO: string): RecurringItem[] {
  const today = parseISODate(todayISO);
  const items: RecurringItem[] = RECURRING.map((r) => {
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), r.dayOfMonth);
    const next = thisMonth.getTime() > today.getTime() ? thisMonth : new Date(today.getFullYear(), today.getMonth() + 1, r.dayOfMonth);
    return {
      id: `rec-${r.normalized}`,
      merchant: r.merchant,
      merchantNormalized: r.normalized,
      averageAmountMinor: r.amountFromMonth ? r.amountFromMonth.amountMinor : r.amountMinor,
      frequency: "monthly",
      nextExpectedDate: toISODate(next),
      confidence: 0.95,
      type: r.type,
      active: true,
    };
  });
  return items;
}
