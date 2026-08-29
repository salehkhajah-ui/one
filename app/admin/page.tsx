"use client";

/**
 * ONE admin — platform health at a glance: revenue, network size, fraud
 * signals, merchant approvals, and the raw analytics ledger.
 */
import { money, t } from "../../lib/i18n";
import { platformMetrics } from "../../lib/network/metrics";
import { useNetwork } from "../components/network/NetworkProvider";
import { MerchantMark, StatCard } from "../components/network/net-ui";

export default function AdminPage() {
  const { state, approveMerchant } = useNetwork();
  const metrics = platformMetrics(state);
  const ledger = [...state.ledger].reverse().slice(0, 10);
  const signals = [...state.fraudSignals].reverse().slice(0, 6);

  return (
    <main className="screen">
      <h1 className="text-[22px] font-bold tracking-tight">{t("net.admin.title")}</h1>
      <p className="subtle mt-1">{t("net.admin.subtitle")}</p>

      <h2 className="section-title mb-3 mt-6">{t("net.admin.platform")}</h2>
      <div className="stat-grid">
        <StatCard label={t("net.admin.revenue")} value={money(metrics.revenueMinor)} tone="positive" sub={t("net.admin.revenueSub")} />
        <StatCard label={t("net.inst.events")} value={metrics.events.toLocaleString("en")} />
        <StatCard label={t("net.admin.redemptions")} value={metrics.redemptions.toLocaleString("en")} />
        <StatCard
          label={t("net.admin.network")}
          value={`${metrics.merchants} · ${metrics.institutions}`}
          sub={t("net.admin.networkSub", { campaigns: metrics.activeCampaigns })}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="section-title mb-3">{t("net.admin.fraud")}</h2>
          <div className="card">
            {signals.length === 0 ? (
              <p className="subtle">{t("net.admin.noFraud")}</p>
            ) : (
              signals.map((s) => (
                <div key={s.id} className="mt-3 first:mt-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold" style={{ color: s.severity === "high" ? "var(--caution)" : "var(--text)" }}>
                      {t(`net.fraud.${s.kind}`)}
                    </span>
                    <span className="micro">{t(`net.severity.${s.severity}`)}</span>
                  </div>
                  <p className="micro money mt-0.5" style={{ direction: "ltr", textAlign: "start" }}>
                    {s.detail}
                  </p>
                </div>
              ))
            )}
          </div>

          <h2 className="section-title mb-3 mt-6">{t("net.admin.merchants")}</h2>
          <div className="card">
            {state.merchants.map((m) => (
              <div key={m.id} className="mt-3 flex items-center gap-3 first:mt-0">
                <MerchantMark merchant={m} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="micro block">{m.markets.join(" · ")}</span>
                </span>
                <button
                  className="chip"
                  aria-pressed={m.approved}
                  style={m.approved ? { borderColor: "var(--positive)", color: "var(--text)" } : { borderColor: "var(--caution)" }}
                  onClick={() => approveMerchant(m.id, !m.approved)}
                >
                  {m.approved ? t("net.admin.approved") : t("net.admin.suspended")}
                </button>
              </div>
            ))}
            <p className="micro mt-3">{t("net.admin.approveHint")}</p>
          </div>
        </div>

        <div>
          <h2 className="section-title mb-3">{t("net.admin.ledger")}</h2>
          <div className="card">
            {ledger.length === 0 ? (
              <p className="subtle">{t("net.admin.noLedger")}</p>
            ) : (
              ledger.map((l) => (
                <div key={l.id} className="mt-2 flex items-center justify-between gap-2 first:mt-0">
                  <span className="subtle">{t(`net.ledger.${l.type}`)}</span>
                  <span className="micro money">{l.amountMinor !== undefined ? money(l.amountMinor) : new Date(l.atISO).toISOString().slice(11, 19)}</span>
                </div>
              ))
            )}
            <p className="micro mt-3">{t("net.admin.ledgerHint")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
