/**
 * Seeded demo network — merchants, one demo exchange, live campaigns and a
 * 14-day activity baseline so every dashboard is alive on first open.
 *
 * ALL merchants and the institution are demonstration data (`demo: true`);
 * the UI labels them so nothing implies a real partnership. Names follow the
 * master spec's demo cast (Tropicfeel-style fashion, coffee, grocery, telecom,
 * travel, entertainment) plus a destination-market grocer for recipient
 * rewards. No real integration is claimed anywhere.
 */
import { fromMajor } from "../money";
import type {
  Baseline,
  Campaign,
  ConsumerProfile,
  Institution,
  Merchant,
  MerchantDailyBaseline,
  NetworkState,
} from "./types";

export const DEMO_INSTITUTION_ID = "inst_onex";

const MERCHANTS: Merchant[] = [
  { id: "m_tropicfeel", name: "Tropicfeel", category: "fashion", markets: ["KW"], approved: true, demo: true, online: true, locations: [] },
  { id: "m_orbit", name: "Orbit Coffee", category: "coffee", markets: ["KW"], approved: true, demo: true, online: false, locations: ["The Avenues", "Salmiya"] },
  { id: "m_shore", name: "Shore Kitchen", category: "food", markets: ["KW"], approved: true, demo: true, online: false, locations: ["Kuwait City"] },
  { id: "m_diwan", name: "Diwan Market", category: "grocery", markets: ["KW"], approved: true, demo: true, online: true, locations: ["Hawally", "Farwaniya"] },
  { id: "m_halo", name: "Halo Telecom", category: "telecom", markets: ["KW", "PH"], approved: true, demo: true, online: true, locations: [] },
  { id: "m_nomad", name: "Nomad Travel", category: "travel", markets: ["KW"], approved: true, demo: true, online: true, locations: [] },
  { id: "m_marquee", name: "Marquee Cinema", category: "entertainment", markets: ["KW"], approved: true, demo: true, online: true, locations: ["360 Mall"] },
  { id: "m_sarisari", name: "SariSari Mart", category: "grocery", markets: ["PH"], approved: true, demo: true, online: false, locations: ["Manila", "Cebu"] },
];

const INSTITUTION: Institution = {
  id: DEMO_INSTITUTION_ID,
  name: "ONE Exchange",
  kind: "exchange",
  approved: true,
  demo: true,
  enabledEvents: ["remittance_completed", "salary_received", "bill_paid", "wallet_topup_completed"],
  rewardMode: "choice",
  recipientRewardsAllowed: true,
  blockedCategories: [],
  whiteLabel: true,
};

const ALL_EVENTS: Campaign["targeting"]["eventTypes"] = [
  "remittance_completed",
  "salary_received",
  "bill_paid",
  "wallet_topup_completed",
];

function campaign(c: Omit<Campaign, "createdISO" | "status"> & Partial<Pick<Campaign, "status">>): Campaign {
  return { status: "active", createdISO: "2026-08-01T08:00:00.000Z", ...c };
}

const CAMPAIGNS: Campaign[] = [
  campaign({
    id: "c_tropic20",
    merchantId: "m_tropicfeel",
    name: "20% off first purchase",
    objective: "new_customers",
    reward: { kind: "percent", valueBps: 2_000, currency: "KWD" },
    targeting: { audience: "new", eventTypes: ALL_EVENTS, market: "sender" },
    pricing: { model: "cpr", feeMinor: fromMajor(1.5) },
    budget: { totalMinor: fromMajor(500), spentMinor: fromMajor(187.5), perCustomerCap: 2 },
    expiryHours: 48,
  }),
  campaign({
    id: "c_orbit_free",
    merchantId: "m_orbit",
    name: "Free drink after your transfer",
    objective: "more_sales",
    reward: { kind: "free_item", itemKey: "coffee", currency: "KWD" },
    targeting: { audience: "everyone", eventTypes: ALL_EVENTS, market: "sender" },
    pricing: { model: "cpa", feeMinor: fromMajor(1) },
    budget: { totalMinor: fromMajor(300), spentMinor: fromMajor(96), perCustomerCap: 4 },
    expiryHours: 72,
  }),
  campaign({
    id: "c_shore_bogo",
    merchantId: "m_shore",
    name: "Buy one get one — slow days",
    objective: "slow_days",
    reward: { kind: "bogo", itemKey: "meal", currency: "KWD" },
    targeting: { audience: "everyone", eventTypes: ALL_EVENTS, market: "sender", daysOfWeek: [0, 1, 2, 3] },
    pricing: { model: "cps", shareBps: 800 },
    budget: { totalMinor: fromMajor(250), spentMinor: fromMajor(41.2), perCustomerCap: 3 },
    expiryHours: 24,
  }),
  campaign({
    id: "c_diwan_voucher",
    merchantId: "m_diwan",
    name: "3 KD grocery voucher",
    objective: "repeat_customers",
    reward: { kind: "fixed", amountMinor: fromMajor(3), currency: "KWD" },
    targeting: { audience: "everyone", eventTypes: ALL_EVENTS, market: "sender" },
    pricing: { model: "cps", shareBps: 1_000 },
    budget: { totalMinor: fromMajor(400), spentMinor: fromMajor(158.9), perCustomerCap: 4 },
    expiryHours: 96,
  }),
  campaign({
    id: "c_nomad15",
    merchantId: "m_nomad",
    name: "15% off flights — premium transfers",
    objective: "premium",
    reward: { kind: "percent", valueBps: 1_500, currency: "KWD" },
    targeting: { audience: "everyone", eventTypes: ALL_EVENTS, amountBands: ["250_500", "gt500"], market: "sender" },
    pricing: { model: "cpa", feeMinor: fromMajor(4) },
    budget: { totalMinor: fromMajor(600), spentMinor: fromMajor(92), perCustomerCap: 2 },
    expiryHours: 120,
  }),
  campaign({
    id: "c_marquee_bogo",
    merchantId: "m_marquee",
    name: "2-for-1 tickets",
    objective: "more_sales",
    reward: { kind: "bogo", itemKey: "ticket", currency: "KWD" },
    targeting: { audience: "everyone", eventTypes: ALL_EVENTS, market: "sender" },
    pricing: { model: "cpr", feeMinor: fromMajor(0.8) },
    budget: { totalMinor: fromMajor(200), spentMinor: fromMajor(63.2), perCustomerCap: 3 },
    expiryHours: 72,
  }),
  // Recipient reward: the beneficiary in the destination market gets it.
  campaign({
    id: "c_sari_recipient",
    merchantId: "m_sarisari",
    name: "Grocery credit for your family",
    objective: "new_customers",
    reward: { kind: "credit", amountMinor: fromMajor(2.5), currency: "KWD" },
    targeting: {
      audience: "everyone",
      eventTypes: ["remittance_completed"],
      market: "recipient",
      destinationCountries: ["PH"],
    },
    pricing: { model: "cpr", feeMinor: fromMajor(0.9) },
    budget: { totalMinor: fromMajor(350), spentMinor: fromMajor(88.2), perCustomerCap: 4 },
    expiryHours: 168,
  }),
  // BOTH WIN: sender gets coffee in Kuwait, recipient gets groceries in PH.
  campaign({
    id: "c_bothwin",
    merchantId: "m_orbit",
    recipientMerchantId: "m_sarisari",
    name: "Both Win — coffee here, groceries there",
    objective: "new_customers",
    reward: { kind: "free_item", itemKey: "coffee", currency: "KWD" },
    recipientReward: { kind: "fixed", amountMinor: fromMajor(2), currency: "KWD" },
    targeting: {
      audience: "everyone",
      eventTypes: ["remittance_completed"],
      market: "both_win",
      destinationCountries: ["PH"],
    },
    pricing: { model: "cpr", feeMinor: fromMajor(1.8) },
    budget: { totalMinor: fromMajor(450), spentMinor: fromMajor(120.6), perCustomerCap: 3 },
    expiryHours: 72,
  }),
  campaign({
    id: "c_halo_data",
    merchantId: "m_halo",
    name: "Bonus data credit",
    objective: "repeat_customers",
    reward: { kind: "credit", amountMinor: fromMajor(1.5), currency: "KWD" },
    targeting: { audience: "everyone", eventTypes: ALL_EVENTS, market: "sender" },
    pricing: { model: "cpa", feeMinor: fromMajor(0.6) },
    budget: { totalMinor: fromMajor(150), spentMinor: fromMajor(52.8), perCustomerCap: 5 },
    expiryHours: 48,
  }),
];

const CONSUMER: ConsumerProfile = {
  customerRef: "cst_9f3a7c1e",
  tier: "one",
  momentCount: 0,
  prefs: { food: 83, coffee: 78, grocery: 80, fashion: 72, travel: 91, telecom: 34, entertainment: 68 },
  followedMerchantIds: ["m_orbit"],
  referrals: 0,
};

/**
 * Deterministic 14-day baseline per merchant. Small integer waves (no RNG)
 * keep dashboards stable across reloads and honest about being demo data.
 */
function merchantBaseline(dailyRedeemed: number, avgTicketMinor: number, feeMinor: number): MerchantDailyBaseline[] {
  const days: MerchantDailyBaseline[] = [];
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const wave = ((dayOffset * 7) % 5) - 2; // -2..2
    const redeemed = Math.max(1, dailyRedeemed + wave);
    const selected = redeemed * 2 + (dayOffset % 3);
    const served = selected * 2 + 4;
    // Today (offset 0) is a partial day: scale down so live actions matter.
    const scale = dayOffset === 0 ? 0.5 : 1;
    const r = Math.max(1, Math.round(redeemed * scale));
    const s = Math.max(2, Math.round(selected * scale));
    days.push({
      dayOffset,
      served: Math.max(4, Math.round(served * scale)),
      selected: s,
      redeemed: r,
      revenueMinor: r * avgTicketMinor,
      spendMinor: r * feeMinor,
      newCustomers: Math.max(1, Math.round(r * 0.6)),
    });
  }
  return days;
}

const BASELINE: Baseline = {
  merchants: {
    m_tropicfeel: merchantBaseline(5, fromMajor(28), fromMajor(1.5)),
    m_orbit: merchantBaseline(9, fromMajor(4.2), fromMajor(1)),
    m_shore: merchantBaseline(4, fromMajor(11), fromMajor(0.9)),
    m_diwan: merchantBaseline(7, fromMajor(9.5), fromMajor(0.95)),
    m_nomad: merchantBaseline(2, fromMajor(120), fromMajor(4)),
    m_marquee: merchantBaseline(5, fromMajor(6), fromMajor(0.8)),
    m_sarisari: merchantBaseline(6, fromMajor(7), fromMajor(0.9)),
    m_halo: merchantBaseline(6, fromMajor(3), fromMajor(0.6)),
  },
  institution: {
    events: 12_840,
    revealed: 9_630,
    selected: 7_120,
    redeemed: 4_310,
    rewardValueMinor: fromMajor(27_500),
    costMinor: fromMajor(2_400),
    repeatLiftBps: 1_800,
  },
};

/** Fresh demo state. `seq` starts high so live ids never collide with seeds. */
export function seedNetworkState(): NetworkState {
  return {
    version: 1,
    institutions: [INSTITUTION],
    merchants: MERCHANTS,
    campaigns: CAMPAIGNS,
    events: [],
    moments: [],
    rewards: [],
    redemptions: [],
    consumer: CONSUMER,
    fraudSignals: [],
    ledger: [],
    notifications: [],
    baseline: BASELINE,
    seq: 1_000,
  };
}
