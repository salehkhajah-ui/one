/**
 * ONE Financial Moment Network — core entity types.
 * Pure TypeScript: no React/Next/DOM imports (portable to a package / RN).
 *
 * The network turns verified financial events (starting with remittances)
 * into merchant-funded rewards. ONE never holds funds: licensed institutions
 * send approved, privacy-minimized events; ONE matches, issues and attributes
 * rewards. All money values are integer minor units (fils for KWD).
 */
import type { CurrencyCode } from "../money";

// ---------------------------------------------------------------- events ----

/** Universal financial-moment event types (remittance first, the rest wired). */
export type FinancialEventType =
  | "remittance_completed"
  | "salary_received"
  | "bill_paid"
  | "card_payment_completed"
  | "insurance_renewed"
  | "investment_completed"
  | "wallet_topup_completed"
  | "loan_payment_completed";

/** Privacy: institutions send amount BANDS, never exact amounts. */
export type AmountBand = "lt50" | "50_100" | "100_250" | "250_500" | "gt500";

export type CountryCode = "KW" | "PH" | "IN" | "EG" | "BD" | "PK" | "SA" | "AE";

/**
 * The only payload ONE needs from an institution. customerRef is a hashed
 * pseudonymous reference — ONE never sees names, accounts or beneficiaries.
 */
export interface FinancialEvent {
  id: string;
  type: FinancialEventType;
  institutionId: string;
  /** Hashed customer reference supplied by the institution. */
  customerRef: string;
  /** Institution-side transaction id, used for dedupe + reversal reconciliation. */
  transactionId: string;
  amountBand: AmountBand;
  country: CountryCode;
  destinationCountry?: CountryCode;
  atISO: string;
  status: "accepted" | "rejected" | "reversed";
  /** Set when rejected — machine-readable reason for the institution log. */
  rejectionReason?: "duplicate_transaction" | "unknown_institution" | "velocity_limit";
}

// ---------------------------------------------------------- participants ----

export type MerchantCategory =
  | "food"
  | "coffee"
  | "grocery"
  | "fashion"
  | "travel"
  | "telecom"
  | "entertainment";

export interface Merchant {
  id: string;
  name: string;
  category: MerchantCategory;
  /** Markets this merchant can serve (sender and/or destination countries). */
  markets: CountryCode[];
  approved: boolean;
  /** Demo-seeded merchants are labeled so the UI never implies a real partnership. */
  demo: boolean;
  online: boolean;
  locations: string[];
}

/** How the institution wants rewards presented after an event (product modes A–D). */
export type RewardMode = "single" | "choice" | "surprise" | "boosted";

export interface Institution {
  id: string;
  name: string;
  kind: "exchange" | "bank" | "wallet";
  approved: boolean;
  demo: boolean;
  /** Which event types this integration is allowed to send. */
  enabledEvents: FinancialEventType[];
  rewardMode: RewardMode;
  /** Whether the sender may gift the reward to the remittance recipient. */
  recipientRewardsAllowed: boolean;
  /** Merchant categories this institution excludes (compliance controls). */
  blockedCategories: MerchantCategory[];
  whiteLabel: boolean;
}

// -------------------------------------------------------------- campaigns ----

export type CampaignObjective =
  | "new_customers"
  | "more_sales"
  | "repeat_customers"
  | "slow_days"
  | "launch"
  | "premium";

export type RewardKind = "percent" | "fixed" | "free_item" | "bogo" | "credit";

export interface RewardSpec {
  kind: RewardKind;
  /** percent rewards: basis points (2000 = 20%). */
  valueBps?: number;
  /** fixed/credit rewards: integer minor units in `currency`. */
  amountMinor?: number;
  currency: CurrencyCode;
  /** free_item/bogo: i18n-able item key rendered by the UI layer. */
  itemKey?: string;
}

/** How the merchant pays: per redemption, per acquired customer, or % of sale. */
export type PricingModel = "cpr" | "cpa" | "cps";

export interface CampaignPricing {
  model: PricingModel;
  /** cpr/cpa: fee per billable outcome, minor units KWD. */
  feeMinor?: number;
  /** cps: share of attributed sale, basis points. */
  shareBps?: number;
}

export interface CampaignTargeting {
  audience: "everyone" | "new" | "existing";
  eventTypes: FinancialEventType[];
  amountBands?: AmountBand[];
  /** Which side of the corridor the reward is redeemable in. */
  market: "sender" | "recipient" | "both_win";
  destinationCountries?: CountryCode[];
  /** 0=Sun..6=Sat; undefined = every day. */
  daysOfWeek?: number[];
}

export interface CampaignBudget {
  totalMinor: number;
  spentMinor: number;
  /** Max rewards one customer can receive from this campaign. */
  perCustomerCap: number;
  redemptionCap?: number;
}

export interface Campaign {
  id: string;
  merchantId: string;
  name: string;
  objective: CampaignObjective;
  reward: RewardSpec;
  /** BOTH WIN: reward issued to the recipient in the destination market. */
  recipientReward?: RewardSpec;
  /** Merchant of the recipient-side reward (defaults to same merchant). */
  recipientMerchantId?: string;
  targeting: CampaignTargeting;
  pricing: CampaignPricing;
  budget: CampaignBudget;
  expiryHours: number;
  status: "active" | "paused" | "exhausted" | "pending_review";
  createdISO: string;
}

// ---------------------------------------------------------------- rewards ----

export type RewardStatus = "available" | "redeemed" | "expired" | "cancelled";

/** A reward issued to a person. Codes are single-use dynamic tokens. */
export interface RewardInstance {
  id: string;
  campaignId: string;
  merchantId: string;
  eventId: string;
  /** "self" = the transacting customer, "recipient" = remittance beneficiary. */
  holder: "self" | "recipient";
  market: CountryCode;
  status: RewardStatus;
  /** Single-use redemption code (regenerated per instance, dead after use). */
  code: string;
  issuedISO: string;
  expiresISO: string;
  redeemedISO?: string;
}

/**
 * A "moment" is the consumer-facing envelope around one accepted event:
 * the unlock notification, the reveal, and the offered candidates.
 */
export interface Moment {
  id: string;
  eventId: string;
  mode: RewardMode;
  /** Candidate campaign ids in score order (1 for single/surprise, 3 for choice). */
  candidateCampaignIds: string[];
  revealed: boolean;
  /** Chosen reward instance id(s) once resolved. BOTH WIN resolves to two. */
  resolvedRewardIds: string[];
  /** Whether the sender chose to gift the reward to the recipient. */
  sentToRecipient: boolean;
  atISO: string;
}

// ---------------------------------------------------- redemption + money ----

export interface Redemption {
  id: string;
  rewardId: string;
  campaignId: string;
  merchantId: string;
  atISO: string;
  /** Verified purchase value reported at redemption, minor units KWD. */
  purchaseValueMinor: number;
  /** What ONE billed the merchant for this outcome, minor units KWD. */
  billedMinor: number;
  refunded: boolean;
}

// ------------------------------------------------------------ intelligence ----

/** Per-user category affinity, 0..1 stored as 0..100 integers (no floats drift). */
export type PreferenceVector = Record<MerchantCategory, number>;

export type MembershipTier = "one" | "silver" | "gold" | "black";

export interface ConsumerProfile {
  /** Hashed ref matching institution events. */
  customerRef: string;
  tier: MembershipTier;
  /** Count of accepted events (drives tier). */
  momentCount: number;
  prefs: PreferenceVector;
  /** Optional session intent signal ("what would make you happy today?"). */
  intent?: MerchantCategory | "surprise";
  followedMerchantIds: string[];
  referrals: number;
}

// ------------------------------------------------------------------ fraud ----

export type FraudKind =
  | "duplicate_transaction"
  | "code_reuse"
  | "event_velocity"
  | "refund_abuse";

export interface FraudSignal {
  id: string;
  kind: FraudKind;
  detail: string;
  atISO: string;
  severity: "low" | "medium" | "high";
}

// ------------------------------------------------------------- analytics ----

export type LedgerEventType =
  | "financial_event_received"
  | "financial_event_rejected"
  | "reward_served"
  | "reward_revealed"
  | "reward_selected"
  | "reward_saved"
  | "reward_sent_to_recipient"
  | "reward_redeemed"
  | "reward_expired"
  | "reward_cancelled"
  | "purchase_refunded"
  | "event_reversed";

/** Append-only analytics ledger — everything measurable flows through here. */
export interface LedgerEntry {
  id: string;
  type: LedgerEventType;
  atISO: string;
  eventId?: string;
  rewardId?: string;
  campaignId?: string;
  merchantId?: string;
  amountMinor?: number;
}

export interface NetworkNotification {
  id: string;
  audience: "consumer" | "merchant" | "institution";
  /** i18n key resolved by the UI layer; engine stays English/ids (DECISIONS #10). */
  messageKey: string;
  params?: Record<string, string | number>;
  atISO: string;
  read: boolean;
}

// --------------------------------------------------------------- baseline ----

/**
 * Seeded network history (other customers' aggregate activity) kept OUT of the
 * live entity arrays so consumer-scoped logic (audience "new", caps, wallet)
 * only ever sees this device's user. Dashboards add baseline + live.
 */
export interface MerchantDailyBaseline {
  /** 0 = today, 1 = yesterday, ... */
  dayOffset: number;
  served: number;
  selected: number;
  redeemed: number;
  revenueMinor: number;
  spendMinor: number;
  newCustomers: number;
}

export interface InstitutionBaseline {
  events: number;
  revealed: number;
  selected: number;
  redeemed: number;
  /** Merchant-funded reward value delivered to this institution's customers. */
  rewardValueMinor: number;
  /** What the institution pays ONE (SaaS) per month. */
  costMinor: number;
  /** Repeat-transaction lift vs non-rewarded cohort, basis points. */
  repeatLiftBps: number;
}

export interface Baseline {
  merchants: Record<string, MerchantDailyBaseline[]>;
  institution: InstitutionBaseline;
}

// ------------------------------------------------------------------ state ----

/**
 * Whole-network state for the demo build. One store, pure reducers over it —
 * the same shapes map 1:1 onto the future Postgres schema (docs/NETWORK.md).
 */
export interface NetworkState {
  version: 1;
  institutions: Institution[];
  merchants: Merchant[];
  campaigns: Campaign[];
  events: FinancialEvent[];
  moments: Moment[];
  rewards: RewardInstance[];
  redemptions: Redemption[];
  consumer: ConsumerProfile;
  fraudSignals: FraudSignal[];
  ledger: LedgerEntry[];
  notifications: NetworkNotification[];
  baseline: Baseline;
  /** Monotonic counter behind deterministic-ish ids. */
  seq: number;
}
