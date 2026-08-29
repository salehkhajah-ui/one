"use client";

/**
 * Client store for the Financial Moment Network demo. All transitions run
 * through the pure lifecycle reducers (lib/network/) and persist to this
 * device; the provider only wires React to the engine.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  addReferral,
  configureInstitution,
  expireSweep,
  ingestEvent,
  launchCampaign,
  registerMerchant,
  setMerchantApproved,
  redeemByCode,
  refundRedemption,
  revealMoment,
  reverseEvent,
  selectReward,
  setCampaignStatus,
  setIntent,
  toggleFollow,
  updateCampaignReward,
  type CampaignDraft,
  type EventInput,
  type IngestResult,
  type RedeemResult,
  type SelectOptions,
} from "../../../lib/network/lifecycle";
import { clearNetworkState, loadNetworkState, saveNetworkState } from "../../../lib/network/storage";
import { seedNetworkState, DEMO_INSTITUTION_ID } from "../../../lib/network/seed";
import type {
  AmountBand,
  Campaign,
  CountryCode,
  Institution,
  Merchant,
  MerchantCategory,
  NetworkState,
} from "../../../lib/network/types";
import type { Locale } from "../../../lib/i18n";
import { useLocale } from "../LocaleProvider";

export interface SimulateOptions {
  amountBand?: AmountBand;
  destinationCountry?: CountryCode;
  type?: EventInput["type"];
}

interface NetworkContextValue {
  state: NetworkState;
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Demo trigger: a fresh institution event with a unique transaction id. */
  simulateTransfer: (opts?: SimulateOptions) => IngestResult;
  ingest: (input: EventInput) => IngestResult;
  reveal: (momentId: string) => void;
  select: (momentId: string, campaignId: string, opts?: SelectOptions) => void;
  redeem: (code: string, purchaseValueMinor: number) => RedeemResult;
  refund: (redemptionId: string) => void;
  reverse: (transactionId: string) => void;
  chooseIntent: (intent: MerchantCategory | "surprise" | undefined) => void;
  follow: (merchantId: string) => void;
  launch: (draft: CampaignDraft) => Campaign;
  setStatus: (campaignId: string, status: Campaign["status"]) => void;
  applyReward: (campaignId: string, reward: Campaign["reward"]) => void;
  configure: (
    institutionId: string,
    patch: Partial<Pick<Institution, "rewardMode" | "recipientRewardsAllowed" | "blockedCategories">>,
  ) => void;
  approveMerchant: (merchantId: string, approved: boolean) => void;
  /** Demo: simulate a verified referral joining through the user's invite. */
  referral: () => void;
  /** Merchant self-onboarding. */
  register: (input: { name: string; category: MerchantCategory; online: boolean; location?: string }) => Merchant;
  resetDemo: () => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Seed for SSR, replace with the persisted state after mount.
  const [state, setState] = useState<NetworkState>(() => seedNetworkState());
  const [hydrated, setHydrated] = useState(false);
  const { locale, setLocale } = useLocale();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(expireSweep(loadNetworkState(), new Date()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveNetworkState(state);
  }, [state, hydrated]);

  /** Run a reducer against the freshest state and return its full result. */
  const run = useCallback(<R extends { state: NetworkState }>(fn: (s: NetworkState, now: Date) => R): R => {
    const result = fn(stateRef.current, new Date());
    stateRef.current = result.state;
    setState(result.state);
    return result;
  }, []);

  const ingest = useCallback((input: EventInput) => run((s, now) => ingestEvent(s, input, now)), [run]);

  const simulateTransfer = useCallback(
    (opts: SimulateOptions = {}) =>
      ingest({
        type: opts.type ?? "remittance_completed",
        institutionId: DEMO_INSTITUTION_ID,
        transactionId: `TX-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1e4)}`,
        amountBand: opts.amountBand ?? "100_250",
        country: "KW",
        destinationCountry: opts.destinationCountry ?? "PH",
      }),
    [ingest],
  );

  const value = useMemo<NetworkContextValue>(
    () => ({
      state,
      locale,
      setLocale,
      simulateTransfer,
      ingest,
      reveal: (momentId) => run((s, now) => ({ state: revealMoment(s, momentId, now) })),
      select: (momentId, campaignId, opts) => run((s, now) => selectReward(s, momentId, campaignId, now, opts)),
      redeem: (code, purchaseValueMinor) => run((s, now) => redeemByCode(s, code, purchaseValueMinor, now)),
      refund: (redemptionId) => run((s, now) => ({ state: refundRedemption(s, redemptionId, now) })),
      reverse: (transactionId) => run((s, now) => ({ state: reverseEvent(s, transactionId, now) })),
      chooseIntent: (intent) => run((s) => ({ state: setIntent(s, intent) })),
      follow: (merchantId) => run((s) => ({ state: toggleFollow(s, merchantId) })),
      launch: (draft) => run((s, now) => launchCampaign(s, draft, now)).campaign,
      setStatus: (campaignId, status) => run((s) => ({ state: setCampaignStatus(s, campaignId, status) })),
      applyReward: (campaignId, reward) => run((s) => ({ state: updateCampaignReward(s, campaignId, reward) })),
      configure: (institutionId, patch) => run((s) => ({ state: configureInstitution(s, institutionId, patch) })),
      approveMerchant: (merchantId, approved) => run((s) => ({ state: setMerchantApproved(s, merchantId, approved) })),
      referral: () => run((s, now) => ({ state: addReferral(s, now) })),
      register: (input) => run((s) => registerMerchant(s, input)).merchant,
      resetDemo: () => {
        clearNetworkState();
        const fresh = seedNetworkState();
        stateRef.current = fresh;
        setState(fresh);
      },
    }),
    [state, locale, setLocale, simulateTransfer, ingest, run],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used inside NetworkProvider");
  return ctx;
}
