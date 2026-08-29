/**
 * Financial-moment lifecycle — pure reducers over NetworkState.
 * Every transition appends to the analytics ledger so the whole funnel
 * (event → served → revealed → selected → redeemed → purchase) is measurable,
 * and every rejection leaves an auditable fraud signal.
 */
import { percentOf } from "../money";
import { matchCampaigns, rewardValueMinor } from "./engine";
import type {
  AmountBand,
  Campaign,
  CountryCode,
  FinancialEvent,
  FinancialEventType,
  FraudKind,
  LedgerEventType,
  MembershipTier,
  Moment,
  NetworkState,
  Redemption,
  RewardInstance,
} from "./types";

// ------------------------------------------------------------- id helpers ----

function nextSeq(state: NetworkState): [NetworkState, number] {
  const seq = state.seq + 1;
  return [{ ...state, seq }, seq];
}

function makeId(prefix: string, seq: number): string {
  return `${prefix}_${seq.toString(36).padStart(4, "0")}`;
}

/** Unambiguous charset (no 0/O/1/I) for human-entered redemption codes. */
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Single-use dynamic code, deterministic from seq (testable, collision-free). */
export function makeCode(seq: number): string {
  let x = (seq * 2654435761) % 2 ** 31; // Knuth multiplicative hash
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_CHARS[x % CODE_CHARS.length];
    x = Math.floor(x / CODE_CHARS.length) ^ (seq << (i + 1));
    x = Math.abs(x);
  }
  return out;
}

function ledger(
  state: NetworkState,
  type: LedgerEventType,
  atISO: string,
  refs: Partial<Pick<import("./types").LedgerEntry, "eventId" | "rewardId" | "campaignId" | "merchantId" | "amountMinor">> = {},
): NetworkState {
  const [s, seq] = nextSeq(state);
  return { ...s, ledger: [...s.ledger, { id: makeId("led", seq), type, atISO, ...refs }] };
}

function signal(state: NetworkState, kind: FraudKind, detail: string, atISO: string, severity: "low" | "medium" | "high"): NetworkState {
  const [s, seq] = nextSeq(state);
  return { ...s, fraudSignals: [...s.fraudSignals, { id: makeId("fs", seq), kind, detail, atISO, severity }] };
}

function notify(
  state: NetworkState,
  audience: "consumer" | "merchant" | "institution",
  messageKey: string,
  atISO: string,
  params?: Record<string, string | number>,
): NetworkState {
  const [s, seq] = nextSeq(state);
  return {
    ...s,
    notifications: [{ id: makeId("ntf", seq), audience, messageKey, params, atISO, read: false }, ...s.notifications],
  };
}

export function tierFor(momentCount: number): MembershipTier {
  if (momentCount >= 20) return "black";
  if (momentCount >= 8) return "gold";
  if (momentCount >= 3) return "silver";
  return "one";
}

// -------------------------------------------------------------- ingestion ----

export interface EventInput {
  type: FinancialEventType;
  institutionId: string;
  transactionId: string;
  amountBand: AmountBand;
  country: CountryCode;
  destinationCountry?: CountryCode;
}

export interface IngestResult {
  state: NetworkState;
  event: FinancialEvent;
  moment?: Moment;
}

/**
 * Institution → ONE: validate, dedupe, velocity-check, then run the reward
 * auction and open a consumer moment. Rejections are recorded, never silent.
 */
export function ingestEvent(state0: NetworkState, input: EventInput, now: Date): IngestResult {
  const atISO = now.toISOString();
  let [state, seq] = nextSeq(state0);
  const eventId = makeId("evt", seq);

  const reject = (reason: NonNullable<FinancialEvent["rejectionReason"]>): IngestResult => {
    const event: FinancialEvent = {
      id: eventId,
      ...input,
      customerRef: state.consumer.customerRef,
      atISO,
      status: "rejected",
      rejectionReason: reason,
    };
    let s = { ...state, events: [...state.events, event] };
    s = ledger(s, "financial_event_rejected", atISO, { eventId });
    if (reason === "duplicate_transaction")
      s = signal(s, "duplicate_transaction", `transaction ${input.transactionId} already ingested`, atISO, "high");
    if (reason === "velocity_limit")
      s = signal(s, "event_velocity", `>3 events for ${state.consumer.customerRef} within 60s`, atISO, "medium");
    return { state: s, event };
  };

  const institution = state.institutions.find((i) => i.id === input.institutionId);
  if (!institution || !institution.approved || !institution.enabledEvents.includes(input.type))
    return reject("unknown_institution");
  if (state.events.some((e) => e.transactionId === input.transactionId && e.status !== "rejected"))
    return reject("duplicate_transaction");
  const recentAccepted = state.events.filter(
    (e) => e.status === "accepted" && now.getTime() - new Date(e.atISO).getTime() < 60_000,
  );
  if (recentAccepted.length >= 4) return reject("velocity_limit");

  const event: FinancialEvent = {
    id: eventId,
    ...input,
    customerRef: state.consumer.customerRef,
    atISO,
    status: "accepted",
  };
  state = { ...state, events: [...state.events, event] };
  state = ledger(state, "financial_event_received", atISO, { eventId });

  // Auction: mode comes from the institution's configuration (modes A–D).
  // Boosted (mode D) also pulls runners-up so the upgrade draw has a target.
  const mode = institution.rewardMode;
  const limit = mode === "choice" || mode === "boosted" ? 3 : 1;
  const candidates = matchCampaigns(state, event, institution, now, limit);

  const momentCount = state.consumer.momentCount + 1;
  state = { ...state, consumer: { ...state.consumer, momentCount, tier: tierFor(momentCount) } };

  if (candidates.length === 0) return { state, event };

  // Mode D: base = best-scored campaign; the upgrade target is the runner-up
  // with the highest customer value ABOVE the base (a real upgrade, or none).
  let candidateCampaignIds = candidates.map((c) => c.campaignId);
  let upgradeCampaignId: string | undefined;
  if (mode === "boosted") {
    const valueOf = (campaignId: string) => {
      const c = state.campaigns.find((x) => x.id === campaignId);
      return c ? rewardValueMinor(c.reward) : 0;
    };
    const base = candidates[0].campaignId;
    const upgrade = candidates
      .slice(1)
      .map((c) => c.campaignId)
      .filter((id) => valueOf(id) > valueOf(base))
      .sort((a, b) => valueOf(b) - valueOf(a))[0];
    candidateCampaignIds = [base];
    upgradeCampaignId = upgrade;
  }

  [state, seq] = nextSeq(state);
  const moment: Moment = {
    id: makeId("mom", seq),
    eventId,
    mode,
    candidateCampaignIds,
    upgradeCampaignId,
    revealed: false,
    resolvedRewardIds: [],
    sentToRecipient: false,
    atISO,
  };
  state = { ...state, moments: [...state.moments, moment] };
  state = ledger(state, "reward_served", atISO, { eventId, campaignId: candidates[0].campaignId });
  state = notify(state, "consumer", "net.notif.unlocked", atISO);
  return { state, event, moment };
}

// ------------------------------------------------------- reveal + select ----

export function revealMoment(state: NetworkState, momentId: string, now: Date): NetworkState {
  const moment = state.moments.find((m) => m.id === momentId);
  if (!moment || moment.revealed) return state;
  const next = { ...state, moments: state.moments.map((m) => (m.id === momentId ? { ...m, revealed: true } : m)) };
  return ledger(next, "reward_revealed", now.toISOString(), { eventId: moment.eventId });
}

export interface SelectOptions {
  /** Sender gifts the reward to the remittance recipient (destination market). */
  sendToRecipient?: boolean;
}

/**
 * Customer picks a campaign from the moment's candidates. Issues the reward
 * instance(s): BOTH WIN issues sender + recipient rewards in one selection.
 * Also feeds the preference vector — chosen categories drift up.
 */
export function selectReward(
  state0: NetworkState,
  momentId: string,
  campaignId: string,
  now: Date,
  opts: SelectOptions = {},
): { state: NetworkState; rewards: RewardInstance[] } {
  const atISO = now.toISOString();
  const moment = state0.moments.find((m) => m.id === momentId);
  const campaign = state0.campaigns.find((c) => c.id === campaignId);
  const selectable = moment && [...moment.candidateCampaignIds, moment.upgradeCampaignId].includes(campaignId);
  if (!moment || !campaign || moment.resolvedRewardIds.length > 0 || !selectable)
    return { state: state0, rewards: [] };
  const event = state0.events.find((e) => e.id === moment.eventId);
  if (!event) return { state: state0, rewards: [] };

  let state = state0;
  const rewards: RewardInstance[] = [];
  const expiresISO = new Date(now.getTime() + campaign.expiryHours * 3_600_000).toISOString();

  const boostBps = referralBoostBps(state0.consumer.referrals);
  const issue = (holder: "self" | "recipient", market: CountryCode, ofCampaign: Campaign, merchantId: string) => {
    let seq: number;
    [state, seq] = nextSeq(state);
    const reward: RewardInstance = {
      id: makeId("rwd", seq),
      campaignId: ofCampaign.id,
      merchantId,
      eventId: event.id,
      holder,
      market,
      status: "available",
      // Referral boost only widens the sender's own percent rewards.
      boostBps: holder === "self" && ofCampaign.reward.kind === "percent" && boostBps > 0 ? boostBps : undefined,
      code: makeCode(seq),
      issuedISO: atISO,
      expiresISO,
    };
    rewards.push(reward);
    state = { ...state, rewards: [...state.rewards, reward] };
  };

  const market = campaign.targeting.market;
  if (market === "both_win" && event.destinationCountry) {
    issue("self", event.country, campaign, campaign.merchantId);
    issue("recipient", event.destinationCountry, campaign, campaign.recipientMerchantId ?? campaign.merchantId);
  } else if ((market === "recipient" || opts.sendToRecipient) && event.destinationCountry) {
    issue("recipient", event.destinationCountry, campaign, campaign.merchantId);
  } else {
    issue("self", event.country, campaign, campaign.merchantId);
  }

  state = {
    ...state,
    moments: state.moments.map((m) =>
      m.id === momentId
        ? { ...m, revealed: true, resolvedRewardIds: rewards.map((r) => r.id), sentToRecipient: rewards.some((r) => r.holder === "recipient") }
        : m,
    ),
  };

  // Preference learning: chosen category drifts up (bounded integers, no floats).
  const merchant = state.merchants.find((m) => m.id === campaign.merchantId);
  if (merchant) {
    const prefs = { ...state.consumer.prefs };
    prefs[merchant.category] = Math.min(100, (prefs[merchant.category] ?? 50) + 8);
    state = { ...state, consumer: { ...state.consumer, prefs, intent: undefined } };
  }

  state = ledger(state, "reward_selected", atISO, { eventId: event.id, campaignId, merchantId: campaign.merchantId });
  for (const r of rewards.filter((r) => r.holder === "recipient")) {
    state = ledger(state, "reward_sent_to_recipient", atISO, { rewardId: r.id, campaignId });
    state = notify(state, "consumer", "net.notif.recipientRewarded", atISO);
  }
  return { state, rewards };
}

// -------------------------------------------------------------- redemption ----

export type RedeemFailure = "not_found" | "already_used" | "expired" | "cancelled";

export interface RedeemResult {
  state: NetworkState;
  ok: boolean;
  failure?: RedeemFailure;
  reward?: RewardInstance;
  redemption?: Redemption;
}

/** Fee ONE bills the merchant for one verified outcome under the campaign's model. */
export function billingFor(campaign: Campaign, purchaseValueMinor: number): number {
  if (campaign.pricing.model === "cps") return percentOf(purchaseValueMinor, campaign.pricing.shareBps ?? 0);
  return campaign.pricing.feeMinor ?? 0;
}

/**
 * Merchant-side validation of a single-use code (scanner or POS). Reused and
 * expired codes are rejected and logged — screenshot reuse dies here.
 */
export function redeemByCode(
  state0: NetworkState,
  rawCode: string,
  purchaseValueMinor: number,
  now: Date,
): RedeemResult {
  const atISO = now.toISOString();
  const code = rawCode.trim().toUpperCase();
  const reward = state0.rewards.find((r) => r.code === code);
  if (!reward) return { state: state0, ok: false, failure: "not_found" };
  if (reward.status === "redeemed") {
    const state = signal(state0, "code_reuse", `code ${code} presented again after redemption`, atISO, "high");
    return { state, ok: false, failure: "already_used", reward };
  }
  if (reward.status === "cancelled") return { state: state0, ok: false, failure: "cancelled", reward };
  if (reward.status === "expired" || new Date(reward.expiresISO).getTime() < now.getTime()) {
    const state = ledger(
      { ...state0, rewards: state0.rewards.map((r) => (r.id === reward.id ? { ...r, status: "expired" as const } : r)) },
      "reward_expired",
      atISO,
      { rewardId: reward.id },
    );
    return { state, ok: false, failure: "expired", reward };
  }

  const campaign = state0.campaigns.find((c) => c.id === reward.campaignId);
  if (!campaign) return { state: state0, ok: false, failure: "not_found" };
  const billedMinor = billingFor(campaign, purchaseValueMinor);

  const [state1, seq] = nextSeq(state0);
  let state = state1;
  const redemption: Redemption = {
    id: makeId("red", seq),
    rewardId: reward.id,
    campaignId: campaign.id,
    merchantId: reward.merchantId,
    atISO,
    purchaseValueMinor,
    billedMinor,
    refunded: false,
  };

  const spentMinor = campaign.budget.spentMinor + billedMinor;
  state = {
    ...state,
    rewards: state.rewards.map((r) => (r.id === reward.id ? { ...r, status: "redeemed" as const, redeemedISO: atISO } : r)),
    redemptions: [...state.redemptions, redemption],
    campaigns: state.campaigns.map((c) =>
      c.id === campaign.id
        ? {
            ...c,
            budget: { ...c.budget, spentMinor },
            status: spentMinor >= c.budget.totalMinor ? ("exhausted" as const) : c.status,
          }
        : c,
    ),
  };
  state = ledger(state, "reward_redeemed", atISO, {
    rewardId: reward.id,
    campaignId: campaign.id,
    merchantId: reward.merchantId,
    amountMinor: purchaseValueMinor,
  });
  state = notify(state, "merchant", "net.notif.merchantSale", atISO, { code });
  return { state, ok: true, reward: { ...reward, status: "redeemed", redeemedISO: atISO }, redemption };
}

// ------------------------------------------------- refunds and reversals ----

/** Merchant refunded the purchase → unwind attribution and billing. */
export function refundRedemption(state0: NetworkState, redemptionId: string, now: Date): NetworkState {
  const redemption = state0.redemptions.find((r) => r.id === redemptionId);
  if (!redemption || redemption.refunded) return state0;
  let state: NetworkState = {
    ...state0,
    redemptions: state0.redemptions.map((r) => (r.id === redemptionId ? { ...r, refunded: true } : r)),
    campaigns: state0.campaigns.map((c) =>
      c.id === redemption.campaignId
        ? { ...c, budget: { ...c.budget, spentMinor: Math.max(0, c.budget.spentMinor - redemption.billedMinor) } }
        : c,
    ),
  };
  state = ledger(state, "purchase_refunded", now.toISOString(), {
    rewardId: redemption.rewardId,
    campaignId: redemption.campaignId,
    merchantId: redemption.merchantId,
    amountMinor: redemption.purchaseValueMinor,
  });
  return state;
}

/**
 * Institution reversed the underlying financial transaction → the event is
 * voided and any unredeemed rewards from its moment are cancelled.
 */
export function reverseEvent(state0: NetworkState, transactionId: string, now: Date): NetworkState {
  const event = state0.events.find((e) => e.transactionId === transactionId && e.status === "accepted");
  if (!event) return state0;
  const atISO = now.toISOString();
  const momentRewardIds = state0.moments.filter((m) => m.eventId === event.id).flatMap((m) => m.resolvedRewardIds);
  let state: NetworkState = {
    ...state0,
    events: state0.events.map((e) => (e.id === event.id ? { ...e, status: "reversed" as const } : e)),
    rewards: state0.rewards.map((r) =>
      momentRewardIds.includes(r.id) && r.status === "available" ? { ...r, status: "cancelled" as const } : r,
    ),
  };
  state = ledger(state, "event_reversed", atISO, { eventId: event.id });
  for (const id of momentRewardIds) {
    const r = state0.rewards.find((x) => x.id === id);
    if (r?.status === "available") state = ledger(state, "reward_cancelled", atISO, { rewardId: id });
  }
  return state;
}

/** Housekeeping: mark rewards whose window closed. Safe to run on every load. */
export function expireSweep(state0: NetworkState, now: Date): NetworkState {
  const stale = state0.rewards.filter((r) => r.status === "available" && new Date(r.expiresISO).getTime() < now.getTime());
  if (stale.length === 0) return state0;
  let state: NetworkState = {
    ...state0,
    rewards: state0.rewards.map((r) => (stale.some((s) => s.id === r.id) ? { ...r, status: "expired" as const } : r)),
  };
  for (const r of stale) state = ledger(state, "reward_expired", now.toISOString(), { rewardId: r.id });
  return state;
}

// -------------------------------------------------- campaign management ----

export type CampaignDraft = Omit<Campaign, "id" | "status" | "createdISO" | "budget"> & {
  budgetTotalMinor: number;
  perCustomerCap: number;
};

/** Merchant launches a campaign — live immediately in the demo network. */
export function launchCampaign(
  state0: NetworkState,
  draft: CampaignDraft,
  now: Date,
): { state: NetworkState; campaign: Campaign } {
  const [state, seq] = nextSeq(state0);
  const { budgetTotalMinor, perCustomerCap, ...rest } = draft;
  const campaign: Campaign = {
    ...rest,
    id: makeId("cmp", seq),
    status: "active",
    createdISO: now.toISOString(),
    budget: { totalMinor: budgetTotalMinor, spentMinor: 0, perCustomerCap },
  };
  return { state: { ...state, campaigns: [...state.campaigns, campaign] }, campaign };
}

export function setCampaignStatus(
  state: NetworkState,
  campaignId: string,
  status: Campaign["status"],
): NetworkState {
  return { ...state, campaigns: state.campaigns.map((c) => (c.id === campaignId ? { ...c, status } : c)) };
}

/** Copilot "apply recommendation": merchant-approved reward change, never automatic. */
export function updateCampaignReward(
  state: NetworkState,
  campaignId: string,
  reward: Campaign["reward"],
): NetworkState {
  return { ...state, campaigns: state.campaigns.map((c) => (c.id === campaignId ? { ...c, reward } : c)) };
}

// ------------------------------------------- referrals + upgrade draw ----

/**
 * Merchant-funded referral boost: +5pp per verified referral on percent
 * rewards, hard-capped at +10pp so referral farming has no unbounded upside.
 */
export function referralBoostBps(referrals: number): number {
  return Math.min(referrals, 2) * 500;
}

/** A verified referral joined through this user's invite. */
export function addReferral(state: NetworkState, now: Date): NetworkState {
  const next = { ...state, consumer: { ...state.consumer, referrals: state.consumer.referrals + 1 } };
  return notify(next, "consumer", "net.notif.referral", now.toISOString());
}

/**
 * Mode D upgrade draw. Deterministic from the moment id (demo build: stable
 * across reloads, testable, no RNG) — roughly half of draws land the upgrade.
 */
export function upgradeWon(momentId: string): boolean {
  let acc = 0;
  for (let i = 0; i < momentId.length; i++) acc = (acc * 31 + momentId.charCodeAt(i)) % 997;
  return acc % 2 === 0;
}

/** Merchant self-onboarding — approved instantly in the demo network. */
export function registerMerchant(
  state0: NetworkState,
  input: { name: string; category: import("./types").MerchantCategory; online: boolean; location?: string },
): { state: NetworkState; merchant: import("./types").Merchant } {
  const [state, seq] = nextSeq(state0);
  const merchant: import("./types").Merchant = {
    id: makeId("mch", seq),
    name: input.name,
    category: input.category,
    markets: ["KW"],
    approved: true,
    demo: true,
    online: input.online,
    locations: input.location ? [input.location] : [],
  };
  return { state: { ...state, merchants: [...state.merchants, merchant] }, merchant };
}

/** Institution configures its integration (reward mode, recipient policy, blocks). */
export function configureInstitution(
  state: NetworkState,
  institutionId: string,
  patch: Partial<Pick<import("./types").Institution, "rewardMode" | "recipientRewardsAllowed" | "blockedCategories">>,
): NetworkState {
  return {
    ...state,
    institutions: state.institutions.map((i) => (i.id === institutionId ? { ...i, ...patch } : i)),
  };
}

/** ONE admin approves / suspends a merchant (unapproved merchants never match). */
export function setMerchantApproved(state: NetworkState, merchantId: string, approved: boolean): NetworkState {
  return { ...state, merchants: state.merchants.map((m) => (m.id === merchantId ? { ...m, approved } : m)) };
}

/** Consumer sets the optional "what would make you happy today?" intent. */
export function setIntent(state: NetworkState, intent: NetworkState["consumer"]["intent"]): NetworkState {
  return { ...state, consumer: { ...state.consumer, intent } };
}

export function toggleFollow(state: NetworkState, merchantId: string): NetworkState {
  const list = state.consumer.followedMerchantIds;
  const followedMerchantIds = list.includes(merchantId) ? list.filter((id) => id !== merchantId) : [...list, merchantId];
  return { ...state, consumer: { ...state.consumer, followedMerchantIds } };
}
