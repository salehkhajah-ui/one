/**
 * Money insights — deterministic detection over transactions.
 * Milestone 1 implements two detectors used by Demo Mode:
 *  - under-forecast category spending → "ONE Found Money"
 *  - subscription price increases (same merchant, higher recurring amount)
 * More detectors (duplicates, unused services, fees) arrive in Milestone 3.
 */
import { allocateProportionally, formatMoney, sumMinor } from "../money";
import type { CurrencyCode } from "../money";
import type { Category, MoneyInsight, Transaction } from "./types";

/** Sum debits for a category within [fromISO, toISO] inclusive. */
export function categorySpend(
  transactions: Transaction[],
  category: Category,
  fromISO: string,
  toISO: string,
): number {
  return sumMinor(
    transactions
      .filter(
        (t) =>
          t.direction === "debit" &&
          t.category === category &&
          t.transactionDate >= fromISO &&
          t.transactionDate <= toISO,
      )
      .map((t) => t.amountMinor),
  );
}

export interface FoundMoneyParams {
  transactions: Transaction[];
  category: Category;
  /** expected spend for the period, from history or profile estimate */
  expectedMinor: number;
  fromISO: string;
  toISO: string;
  currency: CurrencyCode;
  /** ignore trivial differences below this */
  thresholdMinor: number;
}

export function detectFoundMoney(params: FoundMoneyParams): MoneyInsight | null {
  const actual = categorySpend(params.transactions, params.category, params.fromISO, params.toISO);
  const saved = params.expectedMinor - actual;
  if (saved < params.thresholdMinor) return null;

  const supporting = params.transactions
    .filter(
      (t) =>
        t.direction === "debit" &&
        t.category === params.category &&
        t.transactionDate >= params.fromISO &&
        t.transactionDate <= params.toISO,
    )
    .map((t) => t.id);

  return {
    id: `found-${params.category.toLowerCase()}-${params.toISO}`,
    type: "found_money",
    title: `ONE found ${formatMoney(saved, params.currency)}`,
    description: `You spent less on ${params.category.toLowerCase()} than expected this month (${formatMoney(actual, params.currency)} vs ${formatMoney(params.expectedMinor, params.currency)} expected).`,
    monthlyImpactMinor: saved,
    annualImpactMinor: saved * 12,
    availableMinor: saved,
    confidence: "medium",
    supportingTransactionIds: supporting,
    status: "new",
  };
}

/** Detect a recurring merchant whose latest charge is above its earlier charge. */
export function detectSubscriptionIncrease(
  transactions: Transaction[],
  currency: CurrencyCode,
): MoneyInsight | null {
  const recurring = transactions.filter(
    (t) => t.direction === "debit" && t.category === "Subscriptions" && t.isRecurring,
  );
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of recurring) {
    const list = byMerchant.get(t.merchantNormalized) ?? [];
    list.push(t);
    byMerchant.set(t.merchantNormalized, list);
  }
  for (const [, list] of byMerchant) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const increase = last.amountMinor - first.amountMinor;
    if (increase > 0) {
      return {
        id: `subinc-${last.merchantNormalized}-${last.transactionDate}`,
        type: "subscription_increase",
        title: `${last.merchant} went up by ${formatMoney(increase, currency)}/month`,
        description: `${last.merchant} charged ${formatMoney(last.amountMinor, currency)} most recently, up from ${formatMoney(first.amountMinor, currency)}. That's ${formatMoney(increase * 12, currency)}/year if it stays.`,
        monthlyImpactMinor: increase,
        annualImpactMinor: increase * 12,
        availableMinor: 0,
        confidence: "high",
        supportingTransactionIds: [first.id, last.id],
        status: "new",
      };
    }
  }
  return null;
}

export interface JobSuggestion {
  bucket: "protect" | "grow" | "goal" | "enjoy";
  label: string;
  amountMinor: number;
}

/**
 * "Give this money a job" — split found money across future-oriented buckets.
 * Weights favor growth and protection but always leave a little joy.
 */
export function suggestJobsForFoundMoney(
  availableMinor: number,
  goalName: string | null,
): JobSuggestion[] {
  const weights = goalName ? [31, 47, 16, 6] : [40, 50, 0, 10];
  const [protect, grow, goal, enjoy] = allocateProportionally(availableMinor, weights);
  const out: JobSuggestion[] = [
    { bucket: "protect", label: "Protect", amountMinor: protect },
    { bucket: "grow", label: "Grow", amountMinor: grow },
  ];
  if (goalName) out.push({ bucket: "goal", label: goalName, amountMinor: goal });
  out.push({ bucket: "enjoy", label: "Enjoy", amountMinor: enjoy });
  return out.filter((j) => j.amountMinor > 0);
}
