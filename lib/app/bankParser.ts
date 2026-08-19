/**
 * Deterministic bank SMS / notification parser (Kuwait-first).
 * Extracts direction, amount, merchant and a category guess from the message
 * text a user pastes or shares into ONE. Pure TS, heavily unit-tested.
 *
 * This is the ingestion core a future native Android notification listener
 * will call; the web app feeds it via paste and the Android share sheet.
 * Nothing is committed without user confirmation in the UI.
 */
import type { Category, Confidence } from "../engine/types";

export interface ParsedBankMessage {
  direction: "credit" | "debit";
  amountMinor: number;
  merchant: string | null;
  category: Category;
  /** balance mentioned in the message, if any (for future reconciliation) */
  balanceMinor: number | null;
  confidence: Confidence;
  /** which signal decided the direction (for explainability/debugging) */
  signal: string;
}

const DEBIT_SIGNALS: Array<[RegExp, string]> = [
  [/\b(purchase|pos|point of sale)\b/i, "purchase"],
  [/\bdebit(?:ed)?\b/i, "debited"],
  [/\bwithdraw(?:al|n)?\b/i, "withdrawal"],
  [/\bpaid|payment\b/i, "payment"],
  [/\bcharge[ds]?\b/i, "charged"],
  [/\btransfer(?:red)? to\b/i, "transfer out"],
  [/خصم/, "خصم"],
  [/سحب/, "سحب"],
  [/شراء/, "شراء"],
  [/دفع/, "دفع"],
];

const CREDIT_SIGNALS: Array<[RegExp, string]> = [
  [/\bcredit(?:ed)?\b/i, "credited"],
  [/\bdeposit(?:ed)?\b/i, "deposit"],
  [/\bsalary\b/i, "salary"],
  [/\breceived\b/i, "received"],
  [/\brefund(?:ed)?\b/i, "refund"],
  [/\btransfer(?:red)? from\b/i, "transfer in"],
  [/إيداع/, "إيداع"],
  [/راتب/, "راتب"],
  [/حوالة واردة/, "حوالة واردة"],
  [/استرداد/, "استرداد"],
];

/** Deterministic merchant → category rules (spec §25: rules before AI). */
const MERCHANT_CATEGORY_RULES: Array<[RegExp, Category]> = [
  [/starbucks|caribou|arabica|costa|coffee|cafe|caffe/i, "Dining"],
  [/restaurant|burger|pizza|shake shack|kfc|mcdonald|talabat|deliveroo|zaatar|slider/i, "Dining"],
  [/sultan|lulu|carrefour|saveco|city centre|hypermarket|market|grocer/i, "Groceries"],
  [/knpc|oula|petrol|fuel|station|careem|uber|taxi/i, "Transport"],
  [/zain|ooredoo|stc|viva|telecom|fiber|internet/i, "Utilities"],
  [/netflix|spotify|shahid|osn|apple\.com|icloud|playstation|xbox|youtube/i, "Subscriptions"],
  [/pharmacy|clinic|hospital|gym|fitness/i, "Health"],
  [/airline|airways|hotel|booking|agoda|kuwait airways|jazeera/i, "Travel"],
  [/ikea|xcite|h&m|zara|avenues|360 mall|amazon|noon/i, "Shopping"],
  [/atm|cash/i, "Cash"],
  [/fee|commission/i, "Fees"],
];

/** Matches "KD 12.500", "KWD 1,250.750", "12.500 KD", "د.ك 12.500", "12.500 د.ك". */
const AMOUNT_RE =
  /(?:(?:KD|KWD|د\.?\s?ك)\.?\s*([\d,]+(?:\.\d{1,3})?))|(?:([\d,]+(?:\.\d{1,3})?)\s*(?:KD|KWD|د\.?\s?ك))/i;

function parseAmountMinor(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  const minor = Math.round(value * 1000);
  return Number.isSafeInteger(minor) ? minor : null;
}

function extractAmounts(text: string): number[] {
  const out: number[] = [];
  const re = new RegExp(AMOUNT_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const minor = parseAmountMinor(m[1] ?? m[2] ?? "");
    if (minor !== null) out.push(minor);
  }
  return out;
}

function extractMerchant(text: string): string | null {
  // "at STARBUCKS KUWAIT on 19/08" / "at LULU HYPERMARKET using card" / "لدى ستاربكس"
  const patterns = [
    /\bat\s+([A-Z0-9&%.'\- ]{3,40}?)(?:\s+on\s|\s+using\s|\s+via\s|\s*[.,\n]|$)/,
    /\bfrom\s+([A-Z][A-Z0-9&%.'\- ]{2,40}?)(?:\s+on\s|\s*[.,\n]|$)/,
    /لدى\s+([^\n.,]{2,40})/,
    /في\s+([^\n.,]{2,40})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const merchant = m[1].trim().replace(/\s{2,}/g, " ");
      // Reject captures that are clearly not merchant names
      if (!/^(your|the|account|card|bank)\b/i.test(merchant) && merchant.length >= 2) {
        return merchant;
      }
    }
  }
  return null;
}

function guessCategory(merchant: string | null, direction: "credit" | "debit", text: string): Category {
  if (direction === "credit") return "Income";
  const haystack = `${merchant ?? ""} ${text}`;
  for (const [re, category] of MERCHANT_CATEGORY_RULES) {
    if (re.test(haystack)) return category;
  }
  return "Other";
}

/**
 * Parse a bank message. Returns null when no monetary amount is present —
 * ONE never invents a transaction it cannot read.
 */
export function parseBankMessage(text: string): ParsedBankMessage | null {
  const trimmed = text.trim();
  if (trimmed.length < 6) return null;

  const amounts = extractAmounts(trimmed);
  if (amounts.length === 0) return null;

  const debit = DEBIT_SIGNALS.find(([re]) => re.test(trimmed));
  const credit = CREDIT_SIGNALS.find(([re]) => re.test(trimmed));

  let direction: "credit" | "debit";
  let signal: string;
  let confidence: Confidence;
  if (debit && !credit) {
    direction = "debit";
    signal = debit[1];
    confidence = "high";
  } else if (credit && !debit) {
    direction = "credit";
    signal = credit[1];
    confidence = "high";
  } else if (debit && credit) {
    // Both present (e.g. "debited … credited to beneficiary") — first match in text order wins.
    const debitIdx = trimmed.search(debit[0]);
    const creditIdx = trimmed.search(credit[0]);
    direction = debitIdx <= creditIdx ? "debit" : "credit";
    signal = debitIdx <= creditIdx ? debit[1] : credit[1];
    confidence = "medium";
  } else {
    // No directional keyword — most bank alerts are debits; say so honestly.
    direction = "debit";
    signal = "no keyword — assumed spending";
    confidence = "low";
  }

  // Transaction amount is the first amount; a later amount after "balance" is the running balance.
  const amountMinor = amounts[0];
  let balanceMinor: number | null = null;
  const balanceMatch = trimmed.match(
    /(?:balance|avail(?:able)?[^\n]{0,12}|رصيد)[^\d]{0,12}(?:KD|KWD|د\.?\s?ك)?\.?\s*([\d,]+(?:\.\d{1,3})?)/i,
  );
  if (balanceMatch) {
    balanceMinor = parseAmountMinor(balanceMatch[1]);
    // If the "first" amount we grabbed is actually the balance figure, drop to the real one.
    if (balanceMinor === amountMinor && amounts.length > 1) {
      balanceMinor = amounts[amounts.length - 1];
    }
  }

  const merchant = extractMerchant(trimmed);
  const category = guessCategory(merchant, direction, trimmed);

  return { direction, amountMinor, merchant, category, balanceMinor, confidence, signal };
}
