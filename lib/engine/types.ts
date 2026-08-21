/**
 * Domain types for the ONE financial engine.
 * Pure TypeScript — no React/Next imports. All money fields are integer minor units (fils).
 */
import type { CurrencyCode } from "../money";

export type BucketKey = "life" | "bills" | "protect" | "grow" | "goals" | "enjoy";

export const BUCKET_KEYS: BucketKey[] = ["life", "bills", "protect", "grow", "goals", "enjoy"];

export type IncomeType = "salary" | "irregular" | "mixed";
export type RiskPreference = "low" | "moderate" | "high";
export type Direction = "credit" | "debit";
export type TransactionSource = "manual" | "csv" | "demo" | "bank_api_future";

export type Category =
  | "Income"
  | "Housing"
  | "Groceries"
  | "Dining"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Subscriptions"
  | "Utilities"
  | "Health"
  | "Education"
  | "Travel"
  | "Debt"
  | "Transfers"
  | "Investments"
  | "Savings"
  | "Fees"
  | "Cash"
  | "Other";

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  externalId?: string | null;
  /** always positive; use `direction` for sign */
  amountMinor: number;
  currency: CurrencyCode;
  direction: Direction;
  merchant: string;
  merchantNormalized: string;
  description: string;
  category: Category;
  subcategory?: string;
  /** ISO date (yyyy-mm-dd) */
  transactionDate: string;
  postedDate: string;
  isRecurring: boolean;
  recurringGroupId?: string | null;
  source: TransactionSource;
  /** classification confidence 0..1 */
  confidence: number;
}

export interface Account {
  id: string;
  name: string;
  kind: "checking" | "savings" | "cash" | "other";
  balanceMinor: number;
  currency: CurrencyCode;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  targetMinor: number;
  currentMinor: number;
  currency: CurrencyCode;
  /** ISO date or null for open-ended */
  targetDate: string | null;
  priority: "low" | "medium" | "high";
  deadlineFlexible: boolean;
  autoAllocate: boolean;
  status: "active" | "paused" | "done";
}

export interface RecurringItem {
  id: string;
  merchant: string;
  merchantNormalized: string;
  averageAmountMinor: number;
  frequency: "weekly" | "monthly" | "yearly";
  /** ISO date */
  nextExpectedDate: string;
  confidence: number;
  type: "bill" | "subscription" | "income" | "other";
  active: boolean;
}

export interface FinancialProfile {
  userId: string;
  displayName: string;
  monthlyIncomeMinor: number | null;
  incomeType: IncomeType;
  payFrequency: "monthly";
  /** day of month salary usually arrives (1..28) */
  paydayDayOfMonth: number;
  essentialMonthlyEstimateMinor: number;
  housingCostMinor: number;
  debtPaymentsMinor: number;
  emergencyTargetMonths: number;
  minimumCashBufferMinor: number;
  riskPreference: RiskPreference;
  investmentExperience: "new" | "some" | "experienced";
  dependentsCount?: number;
  preferredCurrency: CurrencyCode;
  country: string;
}

export type Confidence = "low" | "medium" | "high";

/** A number that carries how sure the engine is, and what data period informed it. */
export interface Estimate {
  valueMinor: number;
  confidence: Confidence;
  /** e.g. "last 90 days of transactions" */
  basis: string;
}

export interface AllocationItem {
  bucket: BucketKey;
  /** goal-level detail when bucket === "goals" */
  goalId?: string;
  amountMinor: number;
  priority: number;
  reasonCode: string;
  /** human-readable explanation with the actual inputs used */
  reason: string;
  confidence: Confidence;
}

export interface AllocationRecommendation {
  totalMinor: number;
  currency: CurrencyCode;
  items: AllocationItem[];
  /** engine version for auditability */
  engineVersion: string;
}

export interface SafeToSpendInput {
  availableCashMinor: number;
  reservedBillsMinor: number;
  essentialsRemainingMinor: number;
  safetyBufferMinor: number;
  goalCommitmentsMinor: number;
  plannedGrowthMinor: number;
  daysUntilNextIncome: number;
}

export interface SafeToSpendResult {
  /** total discretionary until next income (never negative) */
  discretionaryMinor: number;
  /** recommended daily amount (floored to be safe) */
  dailyMinor: number;
  daysRemaining: number;
  /** true when commitments exceed cash — user is constrained, daily is 0 */
  isConstrained: boolean;
  /** amount by which commitments exceed cash when constrained */
  shortfallMinor: number;
  breakdown: SafeToSpendInput;
  confidence: Confidence;
}

export type InsightType =
  | "found_money"
  | "subscription_increase"
  | "duplicate_subscription"
  | "price_increase"
  | "unusual_spend"
  | "fee"
  | "forgotten_subscription";

export type InsightStatus = "new" | "reviewed" | "accepted" | "dismissed" | "resolved";

export interface MoneyInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  monthlyImpactMinor: number;
  annualImpactMinor: number;
  /** money that can be re-assigned right now (for "give it a job") */
  availableMinor: number;
  confidence: Confidence;
  supportingTransactionIds: string[];
  status: InsightStatus;
  /** structured inputs so the UI can localize title/description */
  meta?: {
    category?: Category;
    actualMinor?: number;
    expectedMinor?: number;
    merchant?: string;
    fromMinor?: number;
    toMinor?: number;
  };
}

export interface ScoreComponent {
  key: "emergency" | "cashflow" | "growth" | "goals";
  label: string;
  /** 0..100 */
  value: number;
  /** transparent formula description with actual inputs */
  formula: string;
}

export interface OneScore {
  /** 0..100 */
  score: number;
  components: ScoreComponent[];
  bestNextMove: {
    action: string;
    /** which component it improves */
    improves: ScoreComponent["key"];
    amountMinor?: number;
  };
}
