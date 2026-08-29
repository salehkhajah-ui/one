"use client";

/**
 * Financial-institution portal — the 60-second story: merchant-funded reward
 * value delivered to your customers vs what the integration costs you.
 * Includes the live event simulator (the sandbox "send event" experience),
 * reward-mode controls and the developer integration card.
 */
import Link from "next/link";
import { useState } from "react";
import { money, t } from "../../lib/i18n";
import { institutionMetrics } from "../../lib/network/metrics";
import { DEMO_INSTITUTION_ID } from "../../lib/network/seed";
import type { AmountBand, FinancialEventType, RewardMode } from "../../lib/network/types";
import { useNetwork } from "../components/network/NetworkProvider";
import { formatPctBps, StatCard } from "../components/network/net-ui";

const EVENT_TYPES: FinancialEventType[] = ["remittance_completed", "salary_received", "bill_paid", "wallet_topup_completed"];
const BANDS: AmountBand[] = ["lt50", "50_100", "100_250", "250_500", "gt500"];
const MODES: RewardMode[] = ["single", "choice", "surprise", "boosted"];

export default function InstitutionPage() {
  const { state, ingest, reverse, configure } = useNetwork();
  const institution = state.institutions.find((i) => i.id === DEMO_INSTITUTION_ID)!;
  const metrics = institutionMetrics(state, institution.id);

  const [eventType, setEventType] = useState<FinancialEventType>("remittance_completed");
  const [band, setBand] = useState<AmountBand>("100_250");
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const send = (transactionId?: string) => {
    const tx = transactionId ?? `TX-${Date.now().toString(36).toUpperCase()}`;
    const { event, moment } = ingest({
      type: eventType,
      institutionId: institution.id,
      transactionId: tx,
      amountBand: band,
      country: "KW",
      destinationCountry: eventType === "remittance_completed" ? "PH" : undefined,
    });
    if (event.status === "accepted") setLastTx(tx);
    setLog((l) =>
      [
        event.status === "accepted"
          ? t("net.inst.logAccepted", { tx, candidates: moment?.candidateCampaignIds.length ?? 0 })
          : t("net.inst.logRejected", { tx, reason: t(`net.inst.reason.${event.rejectionReason ?? "unknown_institution"}`) }),
        ...l,
      ].slice(0, 6),
    );
  };

  return (
    <main className="screen">
      <h1 className="text-[22px] font-bold tracking-tight">
        {institution.name} <span className="micro">· {t("net.inst.poweredBy")}</span>
      </h1>
      <p className="subtle mt-1">{t("net.inst.subtitle")}</p>

      <div className="card-elevated mt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">{t("net.inst.valueDelivered")}</span>
            <div className="stat-value money mt-1" style={{ color: "var(--positive)", fontSize: 34 }}>
              {money(metrics.rewardValueMinor)}
            </div>
          </div>
          <div className="text-end">
            <span className="eyebrow">{t("net.inst.yourCost")}</span>
            <div className="stat-value money mt-1" style={{ fontSize: 34 }}>
              {money(metrics.costMinor)}
            </div>
          </div>
        </div>
        <p className="micro mt-3">{t("net.inst.leverageNote")}</p>
      </div>

      <h2 className="section-title mb-3 mt-6">{t("net.inst.thisMonth")}</h2>
      <div className="stat-grid">
        <StatCard label={t("net.inst.events")} value={metrics.events.toLocaleString("en")} sub={t("net.inst.liveNow", { count: metrics.liveEvents })} />
        <StatCard label={t("net.inst.revealRate")} value={formatPctBps(metrics.revealRateBps)} />
        <StatCard label={t("net.inst.redemptionRate")} value={formatPctBps(metrics.redemptionRateBps)} />
        <StatCard label={t("net.inst.repeatLift")} value={`+${formatPctBps(metrics.repeatLiftBps)}`} sub={t("net.inst.repeatLiftSub")} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <span className="eyebrow">{t("net.inst.simulator")}</span>
          <p className="micro mt-1">{t("net.inst.simulatorHint")}</p>
          <label className="mt-3 block">
            <span className="micro">{t("net.inst.eventType")}</span>
            <select className="input mt-1" value={eventType} onChange={(e) => setEventType(e.target.value as FinancialEventType)}>
              {EVENT_TYPES.map((et) => (
                <option key={et} value={et}>
                  {t(`net.event.${et}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block">
            <span className="micro">{t("net.inst.band")}</span>
            <select className="input mt-1" value={band} onChange={(e) => setBand(e.target.value as AmountBand)}>
              {BANDS.map((b) => (
                <option key={b} value={b}>
                  {t(`net.band.${b}`)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary mt-4 w-full" onClick={() => send()}>
            {t("net.inst.sendEvent")}
          </button>
          <div className="mt-2 flex gap-2">
            <button className="btn btn-ghost flex-1" disabled={!lastTx} onClick={() => lastTx && send(lastTx)}>
              {t("net.inst.sendDuplicate")}
            </button>
            <button
              className="btn btn-ghost flex-1"
              disabled={!lastTx}
              onClick={() => {
                if (lastTx) {
                  reverse(lastTx);
                  setLog((l) => [t("net.inst.logReversed", { tx: lastTx }), ...l].slice(0, 6));
                }
              }}
            >
              {t("net.inst.reverse")}
            </button>
          </div>
          {log.length > 0 ? (
            <div className="mt-3">
              {log.map((line, i) => (
                <p key={i} className="micro money mt-1 first:mt-0" style={{ direction: "ltr", textAlign: "start" }}>
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          <Link href="/rewards" className="micro mt-3 block font-semibold" style={{ color: "var(--accent)" }}>
            {t("net.inst.openConsumer")}
          </Link>
        </div>

        <div className="card">
          <span className="eyebrow">{t("net.inst.controls")}</span>
          <p className="micro mt-1">{t("net.inst.controlsHint")}</p>
          <div className="mt-3">
            <span className="micro">{t("net.inst.rewardMode")}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  className="chip"
                  aria-pressed={institution.rewardMode === m}
                  style={institution.rewardMode === m ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
                  onClick={() => configure(institution.id, { rewardMode: m })}
                >
                  {t(`net.mode.${m}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="subtle">{t("net.inst.recipientAllowed")}</span>
            <button
              className="chip"
              aria-pressed={institution.recipientRewardsAllowed}
              style={institution.recipientRewardsAllowed ? { borderColor: "var(--positive)", color: "var(--text)" } : undefined}
              onClick={() => configure(institution.id, { recipientRewardsAllowed: !institution.recipientRewardsAllowed })}
            >
              {institution.recipientRewardsAllowed ? t("net.common.on") : t("net.common.off")}
            </button>
          </div>
          <p className="micro mt-2">{t("net.inst.recipientHint")}</p>

          <div className="ticket-divider" />
          <span className="eyebrow">{t("net.inst.developers")}</span>
          <p className="micro mt-1">{t("net.inst.developersHint")}</p>
          <pre
            className="input mt-2 overflow-x-auto text-[11px] leading-relaxed"
            style={{ direction: "ltr", textAlign: "left" }}
          >{`POST /api/financial-events
{
  "event_type": "remittance_completed",
  "institution_id": "${institution.id}",
  "customer_ref": "cst_9f3a7c1e",
  "transaction_id": "TX123456",
  "amount_band": "100_250",
  "country": "KW",
  "destination_country": "PH"
}`}</pre>
          <p className="micro mt-2">{t("net.inst.privacyNote")}</p>
        </div>
      </div>
    </main>
  );
}
