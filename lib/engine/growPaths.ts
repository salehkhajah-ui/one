/**
 * Grow Paths — educational pathways for the Grow allocation, with honest
 * one-year outcome ranges (including losing years). Deterministic; every
 * range carries its assumptions. ONE recommends pathways and criteria —
 * never specific securities, and it never executes anything (spec §36, §63).
 */
import { formatMoney } from "../money";
import type { CurrencyCode } from "../money";
import type { EmergencyStatus } from "./emergency";

export interface YearRange {
  lowMinor: number;
  midMinor: number;
  highMinor: number;
  contributedMinor: number;
  lowRatePct: number;
  midRatePct: number;
  highRatePct: number;
  assumptions: string[];
}

/** FV of a starting balance + monthly deposits over `months` at an annual rate (monthly compounding). Supports negative rates. */
export function futureValueAtRate(
  startMinor: number,
  monthlyMinor: number,
  months: number,
  annualRatePct: number,
): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return Math.round(startMinor + monthlyMinor * months);
  const g = Math.pow(1 + r, months);
  return Math.round(startMinor * g + monthlyMinor * ((g - 1) / r));
}

/**
 * One-year range for a diversified, broad-market portfolio.
 * Band: −18% / +7% / +22% — inside the historical spread of single-year
 * global stock-market returns (extremes have been wider). Not a prediction.
 */
export function oneYearMarketRange(startMinor: number, monthlyMinor: number): YearRange {
  const low = -18;
  const mid = 7;
  const high = 22;
  return {
    lowMinor: futureValueAtRate(startMinor, monthlyMinor, 12, low),
    midMinor: futureValueAtRate(startMinor, monthlyMinor, 12, mid),
    highMinor: futureValueAtRate(startMinor, monthlyMinor, 12, high),
    contributedMinor: startMinor + monthlyMinor * 12,
    lowRatePct: low,
    midRatePct: mid,
    highRatePct: high,
    assumptions: [
      "Range reflects the historical spread of single-year returns for broad, diversified stock indexes; individual years have been worse and better.",
      "A single year CAN lose money — long horizons smooth this out, short ones don't.",
      "Hypothetical and not a prediction or a guarantee. Fees, taxes and currency effects not included.",
    ],
  };
}

/** One-year range for capital-stable products (term deposits / savings). Illustrative rates — check advertised rates. */
export function oneYearDepositRange(startMinor: number, monthlyMinor: number): YearRange {
  const low = 1;
  const mid = 2.5;
  const high = 4;
  return {
    lowMinor: futureValueAtRate(startMinor, monthlyMinor, 12, low),
    midMinor: futureValueAtRate(startMinor, monthlyMinor, 12, mid),
    highMinor: futureValueAtRate(startMinor, monthlyMinor, 12, high),
    contributedMinor: startMinor + monthlyMinor * 12,
    lowRatePct: low,
    midRatePct: mid,
    highRatePct: high,
    assumptions: [
      "Illustrative rate band for bank term deposits / savings accounts — ONE does not fetch live rates yet; check what your bank currently advertises.",
      "Capital-stable products protect the amount you put in; the trade-off is lower growth.",
      "Hypothetical and not a guarantee of any specific product's rate.",
    ],
  };
}

export interface GrowPath {
  key: "protect_first" | "index_investing" | "capital_stable";
  title: string;
  emoji: string;
  summary: string;
  steps: string[];
  range: YearRange | null;
  /** why this path is shown for THIS user */
  reason: string;
}

export interface GrowPathsInput {
  currency: CurrencyCode;
  growMonthlyMinor: number;
  emergency: EmergencyStatus;
  riskPreference: "low" | "moderate" | "high";
}

/** Criteria ONE uses before ever pointing at a provider — surfaced in the UI verbatim. */
export const TRUST_CRITERIA = [
  "Regulated by a recognized authority (in Kuwait: the CMA; abroad: e.g. SEC, FCA) — verifiable on the regulator's own website",
  "Client money held in segregated accounts, separate from the firm's own",
  "Diversified, low-fee products (broad index funds) — not single hot stocks",
  "You can withdraw without punitive lock-ups, and fees are published clearly",
];

/** Red flags ONE teaches users to walk away from. */
export const RED_FLAGS = [
  "“Guaranteed” high returns (e.g. fixed 10%+ monthly) — real markets cannot promise this",
  "Pressure to decide today, referral bonuses for recruiting friends",
  "Unregulated apps, Telegram/WhatsApp “signals” groups, or payment in crypto only",
  "Anyone asking for your banking passwords or OTP codes",
];

export function buildGrowPaths(input: GrowPathsInput): GrowPath[] {
  const { currency, growMonthlyMinor, emergency } = input;
  const paths: GrowPath[] = [];

  if (emergency.stage <= 2 && emergency.stageGapMinor > 0) {
    paths.push({
      key: "protect_first",
      title: "Finish your safety net first",
      emoji: "🛡️",
      summary: `The highest-value move right now is completing your "${emergency.stageLabel}" milestone (${formatMoney(emergency.stageGapMinor, currency)} to go). A safety net pays off by keeping you out of debt when life happens — a return no market can match.`,
      steps: [
        "Keep Protect funded on every payday until the milestone is done",
        "Hold it somewhere instant-access (savings account), not invested",
        "Then shift the same habit toward Grow",
      ],
      range: null,
      reason: "Your emergency reserve is below one month of essentials.",
    });
  }

  paths.push({
    key: "index_investing",
    title: "Diversified index investing",
    emoji: "📈",
    summary: `Putting your ${formatMoney(growMonthlyMinor, currency)}/month to work in broad, low-fee index funds through a regulated broker.`,
    steps: [
      "Choose a broker that meets ONE's trust criteria below — verify its license on the regulator's website yourself",
      "Open the account (typically Civil ID + IBAN + a few days of verification)",
      "Set an automatic monthly transfer for your Grow amount",
      "Buy a broad, diversified, low-cost index fund — not individual stocks — and leave it alone",
    ],
    range: oneYearMarketRange(0, growMonthlyMinor),
    reason: "Matches your Grow allocation; diversified and liquid.",
  });

  paths.push({
    key: "capital_stable",
    title: "Capital-stable saving",
    emoji: "🏦",
    summary: `Term deposits or high-yield savings at your bank keep the amount you put in safe, in exchange for lower growth. A reasonable home for money you may need within ~2 years.`,
    steps: [
      "Ask your bank for current term-deposit and savings rates (they change)",
      "Ladder deposits (e.g. 3/6/12 months) so some money is always close to unlocked",
      "Avoid locking money you might need — early exit usually forfeits the return",
    ],
    range: oneYearDepositRange(0, growMonthlyMinor),
    reason: "Zero-drama option, useful for near-term money and low risk tolerance.",
  });

  // Low risk preference: lead with capital-stable after protect.
  if (input.riskPreference === "low") {
    const idx = paths.findIndex((p) => p.key === "index_investing");
    const cap = paths.findIndex((p) => p.key === "capital_stable");
    if (idx >= 0 && cap >= 0 && idx < cap) {
      const [capPath] = paths.splice(cap, 1);
      paths.splice(idx, 0, capPath);
    }
  }

  return paths;
}
