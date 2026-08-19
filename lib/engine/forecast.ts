/**
 * 30-day cash-flow forecast — deterministic day-by-day balance projection.
 * Inputs: current cash, scheduled income (payday), recurring bills, and an
 * estimated daily spending run-rate. Detects the first day the balance would
 * fall below the user's safety buffer. See docs/FINANCIAL_ENGINE.md.
 */
import { addDays } from "./dates";
import type { RecurringItem } from "./types";

export interface ForecastEvent {
  label: string;
  amountMinor: number;
  direction: "in" | "out";
}

export interface ForecastPoint {
  dateISO: string;
  /** projected end-of-day balance (can go negative — that's the warning) */
  balanceMinor: number;
  events: ForecastEvent[];
}

export interface CashFlowForecast {
  points: ForecastPoint[];
  minMinor: number;
  minDateISO: string;
  /** first day projected below the buffer; null when the horizon stays safe */
  firstBelowBufferISO: string | null;
  bufferMinor: number;
}

export interface ForecastInput {
  todayISO: string;
  startBalanceMinor: number;
  bufferMinor: number;
  horizonDays?: number;
  /** monthly salary amount; 0 disables income */
  salaryMinor: number;
  paydayDayOfMonth: number;
  /** recurring outflows (bills/subscriptions) with their next expected dates */
  scheduled: RecurringItem[];
  /** estimated everyday spending per day, EXCLUDING the scheduled items above */
  dailySpendMinor: number;
}

function occursOn(dateISO: string, item: RecurringItem, horizonEndISO: string): boolean {
  // Monthly recurrence: nextExpectedDate, then same day-of-month afterwards.
  if (item.frequency !== "monthly") return dateISO === item.nextExpectedDate;
  if (dateISO < item.nextExpectedDate || dateISO > horizonEndISO) return false;
  return dateISO.slice(8, 10) === item.nextExpectedDate.slice(8, 10);
}

export function calculateCashFlowForecast(input: ForecastInput): CashFlowForecast {
  const horizon = Math.max(1, Math.min(input.horizonDays ?? 30, 90));
  if (!Number.isSafeInteger(input.startBalanceMinor)) throw new Error("forecast: startBalance must be integer");
  if (!Number.isSafeInteger(input.dailySpendMinor) || input.dailySpendMinor < 0)
    throw new Error("forecast: dailySpend must be a non-negative integer");

  const horizonEndISO = addDays(input.todayISO, horizon);
  const points: ForecastPoint[] = [];
  let balance = input.startBalanceMinor;
  let minMinor = balance;
  let minDateISO = input.todayISO;
  let firstBelowBufferISO: string | null = null;

  for (let d = 1; d <= horizon; d++) {
    const dateISO = addDays(input.todayISO, d);
    const events: ForecastEvent[] = [];

    if (input.salaryMinor > 0 && Number(dateISO.slice(8, 10)) === input.paydayDayOfMonth) {
      balance += input.salaryMinor;
      events.push({ label: "Salary", amountMinor: input.salaryMinor, direction: "in" });
    }

    for (const item of input.scheduled) {
      if (item.active && occursOn(dateISO, item, horizonEndISO)) {
        balance -= item.averageAmountMinor;
        events.push({ label: item.merchant, amountMinor: item.averageAmountMinor, direction: "out" });
      }
    }

    balance -= input.dailySpendMinor;

    points.push({ dateISO, balanceMinor: balance, events });
    if (balance < minMinor) {
      minMinor = balance;
      minDateISO = dateISO;
    }
    if (firstBelowBufferISO === null && balance < input.bufferMinor) {
      firstBelowBufferISO = dateISO;
    }
  }

  return { points, minMinor, minDateISO, firstBelowBufferISO, bufferMinor: input.bufferMinor };
}
