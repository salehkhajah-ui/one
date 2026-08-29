/**
 * ONE Financial Moment Network — critical-flow tests (master spec §71):
 * consumer event→reward→select→redeem, merchant attribution, institution
 * ingestion, fraud (duplicate event + code reuse), refunds, recipient
 * rewards and BOTH WIN, expiry, budget exhaustion, preference learning.
 */
import { describe, expect, it } from "vitest";
import { fromMajor } from "../../money";
import { checkEligibility, matchCampaigns, rewardSpecFor, rewardValueMinor } from "../../network/engine";
import {
  ingestEvent,
  redeemByCode,
  refundRedemption,
  reverseEvent,
  revealMoment,
  selectReward,
  expireSweep,
  tierFor,
  addReferral,
  launchCampaign,
  referralBoostBps,
  registerMerchant,
  upgradeWon,
  type EventInput,
} from "../../network/lifecycle";
import { institutionMetrics, merchantBilling, merchantMetrics, platformMetrics } from "../../network/metrics";
import { DEMO_INSTITUTION_ID, seedNetworkState } from "../../network/seed";
import type { NetworkState } from "../../network/types";

const NOW = new Date("2026-08-29T10:00:00.000Z"); // Saturday

function remit(overrides: Partial<EventInput> = {}): EventInput {
  return {
    type: "remittance_completed",
    institutionId: DEMO_INSTITUTION_ID,
    transactionId: `TX-${Math.random().toString(36).slice(2, 10)}`,
    amountBand: "100_250",
    country: "KW",
    destinationCountry: "PH",
    ...overrides,
  };
}

/**
 * Full happy path helper: ingest → reveal → select. The auction only surfaces
 * the top 3 candidates, so when a test targets a specific campaign we widen
 * the moment's candidate list as test setup (selection mechanics, not ranking,
 * are under test here — ranking has its own suite).
 */
function throughSelection(state0: NetworkState, campaignId?: string) {
  const { state: s1, moment } = ingestEvent(state0, remit(), NOW);
  expect(moment).toBeDefined();
  let s2 = revealMoment(s1, moment!.id, NOW);
  const chosen = campaignId ?? moment!.candidateCampaignIds[0];
  if (!moment!.candidateCampaignIds.includes(chosen)) {
    s2 = {
      ...s2,
      moments: s2.moments.map((m) =>
        m.id === moment!.id ? { ...m, candidateCampaignIds: [...m.candidateCampaignIds, chosen] } : m,
      ),
    };
  }
  const { state: s3, rewards } = selectReward(s2, moment!.id, chosen, NOW);
  expect(rewards.length).toBeGreaterThan(0);
  return { state: s3, moment: moment!, rewards };
}

describe("institution → event ingestion", () => {
  it("accepts an approved event and opens a moment with ranked candidates", () => {
    const { state, event, moment } = ingestEvent(seedNetworkState(), remit(), NOW);
    expect(event.status).toBe("accepted");
    expect(moment).toBeDefined();
    expect(moment!.mode).toBe("choice");
    expect(moment!.candidateCampaignIds).toHaveLength(3);
    expect(state.ledger.some((l) => l.type === "financial_event_received")).toBe(true);
    expect(state.ledger.some((l) => l.type === "reward_served")).toBe(true);
  });

  it("rejects events from unknown or disabled integrations", () => {
    const { event } = ingestEvent(seedNetworkState(), remit({ institutionId: "inst_nope" }), NOW);
    expect(event.status).toBe("rejected");
    expect(event.rejectionReason).toBe("unknown_institution");
  });

  it("rejects duplicate transaction ids and raises a fraud signal", () => {
    const first = ingestEvent(seedNetworkState(), remit({ transactionId: "TX-DUP" }), NOW);
    const second = ingestEvent(first.state, remit({ transactionId: "TX-DUP" }), NOW);
    expect(second.event.status).toBe("rejected");
    expect(second.event.rejectionReason).toBe("duplicate_transaction");
    expect(second.state.fraudSignals.some((f) => f.kind === "duplicate_transaction")).toBe(true);
  });

  it("applies a velocity limit within 60 seconds", () => {
    let state = seedNetworkState();
    for (let i = 0; i < 4; i++) state = ingestEvent(state, remit(), NOW).state;
    const fifth = ingestEvent(state, remit(), NOW);
    expect(fifth.event.rejectionReason).toBe("velocity_limit");
    expect(fifth.state.fraudSignals.some((f) => f.kind === "event_velocity")).toBe(true);
  });
});

describe("matching engine", () => {
  it("gates premium campaigns by amount band", () => {
    const state = seedNetworkState();
    const inst = state.institutions[0];
    const small = ingestEvent(state, remit({ amountBand: "lt50" }), NOW);
    const nomad = state.campaigns.find((c) => c.id === "c_nomad15")!;
    const smallEvent = small.state.events[small.state.events.length - 1];
    expect(checkEligibility(small.state, nomad, smallEvent, inst, NOW).reason).toBe("amount_band");
  });

  it("ranks by ecosystem score, not raw bid", () => {
    const state = seedNetworkState();
    const { state: s1 } = ingestEvent(state, remit(), NOW);
    const event = s1.events[0];
    const ranked = matchCampaigns(s1, event, s1.institutions[0], NOW, 99);
    expect(ranked.length).toBeGreaterThanOrEqual(5);
    // Nomad pays the highest fee (4 KD) but low telecom-style relevance keeps
    // it from automatically winning; scores must be strictly ordered.
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
  });

  it("respects institution category blocks", () => {
    const base = seedNetworkState();
    const { state: s1 } = ingestEvent(base, remit(), NOW);
    const event = s1.events[0];
    const allowed = matchCampaigns(s1, event, s1.institutions[0], NOW, 99);
    expect(allowed.some((c) => c.campaignId === "c_tropic20")).toBe(true);
    const blockedInst = { ...s1.institutions[0], blockedCategories: ["fashion" as const] };
    const blocked = matchCampaigns(s1, event, blockedInst, NOW, 99);
    expect(blocked.some((c) => c.campaignId === "c_tropic20")).toBe(false);
  });
});

describe("consumer: reveal → select → redeem", () => {
  it("issues an available reward with a single-use code and learns preferences", () => {
    const before = seedNetworkState();
    const { state, rewards } = throughSelection(before);
    const reward = rewards[0];
    expect(reward.status).toBe("available");
    expect(reward.code).toMatch(/^[A-Z2-9]{6}$/);
    const merchant = state.merchants.find((m) => m.id === reward.merchantId)!;
    expect(state.consumer.prefs[merchant.category]).toBeGreaterThan(before.consumer.prefs[merchant.category] ?? 50);
  });

  it("redeems a valid code once, bills the merchant, and rejects reuse", () => {
    const { state, rewards } = throughSelection(seedNetworkState(), "c_orbit_free");
    const purchase = fromMajor(6.5);
    const first = redeemByCode(state, rewards[0].code, purchase, NOW);
    expect(first.ok).toBe(true);
    expect(first.redemption!.billedMinor).toBe(fromMajor(1)); // Orbit CPA 1 KD
    const again = redeemByCode(first.state, rewards[0].code, purchase, NOW);
    expect(again.ok).toBe(false);
    expect(again.failure).toBe("already_used");
    expect(again.state.fraudSignals.some((f) => f.kind === "code_reuse")).toBe(true);
  });

  it("expires rewards past their window", () => {
    const { state, rewards } = throughSelection(seedNetworkState(), "c_orbit_free");
    const later = new Date(NOW.getTime() + 100 * 3_600_000); // beyond 72h expiry
    const attempt = redeemByCode(state, rewards[0].code, fromMajor(5), later);
    expect(attempt.ok).toBe(false);
    expect(attempt.failure).toBe("expired");
    const swept = expireSweep(state, later);
    expect(swept.rewards.find((r) => r.id === rewards[0].id)!.status).toBe("expired");
  });

  it("charges CPS campaigns a share of the verified sale", () => {
    const { state, rewards } = throughSelection(seedNetworkState(), "c_diwan_voucher");
    const res = redeemByCode(state, rewards[0].code, fromMajor(12), NOW);
    expect(res.ok).toBe(true);
    expect(res.redemption!.billedMinor).toBe(fromMajor(1.2)); // 10% of 12 KD
  });
});

describe("recipient rewards + BOTH WIN", () => {
  it("issues the reward in the destination market when sent to the recipient", () => {
    const { rewards } = throughSelection(seedNetworkState(), "c_sari_recipient");
    expect(rewards).toHaveLength(1);
    expect(rewards[0].holder).toBe("recipient");
    expect(rewards[0].market).toBe("PH");
    expect(rewards[0].merchantId).toBe("m_sarisari");
  });

  it("BOTH WIN issues sender + recipient rewards from one selection", () => {
    const { state, rewards } = throughSelection(seedNetworkState(), "c_bothwin");
    expect(rewards).toHaveLength(2);
    const sender = rewards.find((r) => r.holder === "self")!;
    const recipient = rewards.find((r) => r.holder === "recipient")!;
    expect(sender.market).toBe("KW");
    expect(sender.merchantId).toBe("m_orbit");
    expect(recipient.market).toBe("PH");
    expect(recipient.merchantId).toBe("m_sarisari");
    expect(state.ledger.some((l) => l.type === "reward_sent_to_recipient")).toBe(true);
  });

  it("hides recipient campaigns when the institution disallows them", () => {
    const { state: s1 } = ingestEvent(seedNetworkState(), remit(), NOW);
    const event = s1.events[0];
    const allowed = matchCampaigns(s1, event, s1.institutions[0], NOW, 99);
    expect(allowed.some((c) => c.campaignId === "c_sari_recipient")).toBe(true);
    expect(allowed.some((c) => c.campaignId === "c_bothwin")).toBe(true);
    const noRecipients = { ...s1.institutions[0], recipientRewardsAllowed: false };
    const restricted = matchCampaigns(s1, event, noRecipients, NOW, 99);
    expect(restricted.some((c) => c.campaignId === "c_sari_recipient")).toBe(false);
    expect(restricted.some((c) => c.campaignId === "c_bothwin")).toBe(false);
  });
});

describe("refunds and reversals", () => {
  it("refunding a purchase unwinds billing and attribution", () => {
    const { state, rewards } = throughSelection(seedNetworkState(), "c_orbit_free");
    const res = redeemByCode(state, rewards[0].code, fromMajor(6), NOW);
    const spentAfter = res.state.campaigns.find((c) => c.id === "c_orbit_free")!.budget.spentMinor;
    const refunded = refundRedemption(res.state, res.redemption!.id, NOW);
    expect(refunded.campaigns.find((c) => c.id === "c_orbit_free")!.budget.spentMinor).toBe(spentAfter - fromMajor(1));
    expect(refunded.redemptions[refunded.redemptions.length - 1].refunded).toBe(true);
    const m = merchantMetrics(refunded, "m_orbit", NOW);
    const mBefore = merchantMetrics(res.state, "m_orbit", NOW);
    expect(m.totalRevenueMinor).toBe(mBefore.totalRevenueMinor - fromMajor(6));
  });

  it("reversing the financial transaction cancels unredeemed rewards", () => {
    const s0 = seedNetworkState();
    const input = remit({ transactionId: "TX-REV" });
    const { state: s1, moment } = ingestEvent(s0, input, NOW);
    const { state: s2, rewards } = selectReward(s1, moment!.id, moment!.candidateCampaignIds[0], NOW);
    const s3 = reverseEvent(s2, "TX-REV", NOW);
    expect(s3.events.find((e) => e.transactionId === "TX-REV")!.status).toBe("reversed");
    expect(s3.rewards.find((r) => r.id === rewards[0].id)!.status).toBe("cancelled");
    const attempt = redeemByCode(s3, rewards[0].code, fromMajor(5), NOW);
    expect(attempt.failure).toBe("cancelled");
  });
});

describe("merchant attribution + budgets", () => {
  it("a live redemption moves the merchant's revenue, spend and CPA", () => {
    const { state, rewards } = throughSelection(seedNetworkState(), "c_tropic20");
    const before = merchantMetrics(state, "m_tropicfeel", NOW);
    const res = redeemByCode(state, rewards[0].code, fromMajor(40), NOW);
    const after = merchantMetrics(res.state, "m_tropicfeel", NOW);
    expect(after.todayRevenueMinor).toBe(before.todayRevenueMinor + fromMajor(40));
    expect(after.todaySpendMinor).toBe(before.todaySpendMinor + fromMajor(1.5));
    expect(after.redeemed).toBe(before.redeemed + 1);
  });

  it("exhausts a campaign when budget is spent and stops matching it", () => {
    let state = seedNetworkState();
    state = {
      ...state,
      campaigns: state.campaigns.map((c) =>
        c.id === "c_orbit_free" ? { ...c, budget: { ...c.budget, totalMinor: c.budget.spentMinor + fromMajor(1) } } : c,
      ),
    };
    const { state: s1, rewards } = throughSelection(state, "c_orbit_free");
    const res = redeemByCode(s1, rewards[0].code, fromMajor(4), NOW);
    expect(res.state.campaigns.find((c) => c.id === "c_orbit_free")!.status).toBe("exhausted");
    const next = ingestEvent(res.state, remit(), NOW);
    expect(next.moment!.candidateCampaignIds).not.toContain("c_orbit_free");
  });
});

describe("metrics + tiers", () => {
  it("institution metrics track live events and reward value on top of baseline", () => {
    const s0 = seedNetworkState();
    const before = institutionMetrics(s0, DEMO_INSTITUTION_ID);
    const { state, rewards } = throughSelection(s0, "c_diwan_voucher");
    const res = redeemByCode(state, rewards[0].code, fromMajor(10), NOW);
    const after = institutionMetrics(res.state, DEMO_INSTITUTION_ID);
    expect(after.events).toBe(before.events + 1);
    expect(after.liveEvents).toBe(1);
    expect(after.rewardValueMinor).toBe(before.rewardValueMinor + fromMajor(3));
  });

  it("platform revenue = merchant billing (baseline + live)", () => {
    const s0 = seedNetworkState();
    const before = platformMetrics(s0);
    const { state, rewards } = throughSelection(s0, "c_orbit_free");
    const res = redeemByCode(state, rewards[0].code, fromMajor(5), NOW);
    expect(platformMetrics(res.state).revenueMinor).toBe(before.revenueMinor + fromMajor(1));
  });

  it("tiers progress with engagement, never transfer size", () => {
    expect(tierFor(0)).toBe("one");
    expect(tierFor(3)).toBe("silver");
    expect(tierFor(8)).toBe("gold");
    expect(tierFor(20)).toBe("black");
  });

  it("reward value estimates are integer minor units", () => {
    expect(rewardValueMinor({ kind: "percent", valueBps: 2_000, currency: "KWD" })).toBe(fromMajor(2));
    expect(rewardValueMinor({ kind: "fixed", amountMinor: fromMajor(3), currency: "KWD" })).toBe(fromMajor(3));
  });
});

describe("referral boost", () => {
  it("widens percent rewards at issuance, capped at +10pp", () => {
    let state = seedNetworkState();
    state = addReferral(addReferral(addReferral(state, NOW), NOW), NOW); // 3 referrals
    expect(referralBoostBps(state.consumer.referrals)).toBe(1_000); // capped at 2×500
    const { state: s1, rewards } = throughSelection(state, "c_tropic20");
    expect(rewards[0].boostBps).toBe(1_000);
    const campaign = s1.campaigns.find((c) => c.id === "c_tropic20")!;
    const spec = rewardSpecFor(campaign, rewards[0]);
    expect(spec.kind).toBe("percent");
    expect(spec.valueBps).toBe(3_000); // 20% + 10pp boost
  });

  it("never boosts non-percent or recipient-held rewards", () => {
    let state = seedNetworkState();
    state = addReferral(state, NOW);
    const fixed = throughSelection(state, "c_diwan_voucher");
    expect(fixed.rewards[0].boostBps).toBeUndefined();
    const recipient = throughSelection(state, "c_sari_recipient");
    expect(recipient.rewards[0].boostBps).toBeUndefined();
  });
});

describe("mode D — boosted upgrade draw", () => {
  function boostedState(): NetworkState {
    const state = seedNetworkState();
    return {
      ...state,
      institutions: state.institutions.map((i) => ({ ...i, rewardMode: "boosted" as const })),
    };
  }

  it("serves one base reward plus a strictly-more-valuable upgrade target", () => {
    const { state, moment } = ingestEvent(boostedState(), remit(), NOW);
    expect(moment!.mode).toBe("boosted");
    expect(moment!.candidateCampaignIds).toHaveLength(1);
    expect(moment!.upgradeCampaignId).toBeDefined();
    const valueOf = (id: string) => rewardValueMinor(state.campaigns.find((c) => c.id === id)!.reward);
    expect(valueOf(moment!.upgradeCampaignId!)).toBeGreaterThan(valueOf(moment!.candidateCampaignIds[0]));
  });

  it("the upgrade campaign is selectable and the draw is deterministic", () => {
    const { state: s1, moment } = ingestEvent(boostedState(), remit(), NOW);
    expect(upgradeWon(moment!.id)).toBe(upgradeWon(moment!.id)); // stable
    const target = upgradeWon(moment!.id) ? moment!.upgradeCampaignId! : moment!.candidateCampaignIds[0];
    const { rewards } = selectReward(s1, moment!.id, target, NOW);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].campaignId).toBe(target);
  });
});

describe("merchant onboarding + billing", () => {
  it("a registered merchant's campaign competes in the auction", () => {
    const reg = registerMerchant(seedNetworkState(), { name: "Bayt Burger", category: "food", online: false, location: "Salmiya" });
    expect(reg.merchant.approved).toBe(true);
    expect(reg.merchant.demo).toBe(true);
    const { state: s1 } = launchCampaign(
      reg.state,
      {
        merchantId: reg.merchant.id,
        name: "15% off",
        objective: "new_customers",
        reward: { kind: "percent", valueBps: 1_500, currency: "KWD" },
        targeting: { audience: "everyone", eventTypes: ["remittance_completed"], market: "sender" },
        pricing: { model: "cpr", feeMinor: fromMajor(1) },
        budgetTotalMinor: fromMajor(100),
        perCustomerCap: 3,
        expiryHours: 48,
      },
      NOW,
    );
    const { state: s2 } = ingestEvent(s1, remit(), NOW);
    const ranked = matchCampaigns(s2, s2.events[0], s2.institutions[0], NOW, 99);
    expect(ranked.some((c) => s2.campaigns.find((x) => x.id === c.campaignId)?.merchantId === reg.merchant.id)).toBe(true);
  });

  it("billing reflects live redemptions in the upcoming invoice and statement", () => {
    const s0 = seedNetworkState();
    const before = merchantBilling(s0, "m_orbit", NOW);
    const { state, rewards } = throughSelection(s0, "c_orbit_free");
    const res = redeemByCode(state, rewards[0].code, fromMajor(5), NOW);
    const after = merchantBilling(res.state, "m_orbit", NOW);
    expect(after.upcomingInvoiceMinor).toBe(before.upcomingInvoiceMinor + fromMajor(1));
    const today = NOW.toISOString().slice(0, 10);
    const beforeToday = before.days.find((d) => d.dateISO === today)!;
    const afterToday = after.days.find((d) => d.dateISO === today)!;
    expect(afterToday.billedMinor).toBe(beforeToday.billedMinor + fromMajor(1));
    expect(afterToday.outcomes).toBe(beforeToday.outcomes + 1);
    expect(after.budgetRemainingMinor).toBe(before.budgetRemainingMinor - fromMajor(1));
  });
});
