"use client";

/**
 * ONE Merchant Scanner — redemption with zero POS integration: staff enters
 * the customer's single-use code, sees the reward, confirms the sale.
 * Reused / expired / reversed codes are rejected with the reason.
 */
import { useState } from "react";
import { money, t } from "../../../lib/i18n";
import { fromMajor } from "../../../lib/money";
import type { RedeemResult } from "../../../lib/network/lifecycle";
import { useNetwork } from "../../components/network/NetworkProvider";
import { MerchantMark, rewardLabel } from "../../components/network/net-ui";

export default function ScannerPage() {
  const { state, redeem } = useNetwork();
  const [code, setCode] = useState("");
  const [amountKD, setAmountKD] = useState(10);
  const [result, setResult] = useState<RedeemResult | null>(null);

  const pending = state.rewards.find(
    (r) => r.code === code.trim().toUpperCase() && r.status === "available",
  );

  const onRedeem = () => {
    setResult(redeem(code, fromMajor(amountKD)));
  };

  const reset = () => {
    setResult(null);
    setCode("");
  };

  if (result) {
    const merchant = state.merchants.find((m) => m.id === result.reward?.merchantId);
    return (
      <main className="screen mx-auto max-w-[480px]">
        <div className="card-elevated reveal-card mt-10 text-center">
          {result.ok ? (
            <>
              <p className="stat-value" style={{ color: "var(--positive)" }}>
                ✓
              </p>
              <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("net.scan.approved")}</h1>
              <p className="subtle mt-2">
                {merchant?.name} · {money(result.redemption?.purchaseValueMinor ?? 0)}
              </p>
              <p className="micro mt-2">{t("net.scan.billed", { fee: money(result.redemption?.billedMinor ?? 0) })}</p>
            </>
          ) : (
            <>
              <p className="stat-value" style={{ color: "var(--caution)" }}>
                ✕
              </p>
              <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("net.scan.declined")}</h1>
              <p className="subtle mt-2">{t(`net.scan.reason.${result.failure ?? "not_found"}`)}</p>
            </>
          )}
          <button className="btn btn-primary mt-5 w-full" onClick={reset}>
            {t("net.scan.next")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen mx-auto max-w-[480px]">
      <h1 className="mt-2 text-[22px] font-bold tracking-tight">{t("net.scan.title")}</h1>
      <p className="subtle mt-1">{t("net.scan.sub")}</p>

      <label className="mt-5 block">
        <span className="micro">{t("net.scan.codeLabel")}</span>
        <input
          className="input code-display mt-2"
          style={{ fontSize: 24 }}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="A1B2C3"
        />
      </label>

      {pending ? (
        <div className="card mt-4 flex items-center gap-3">
          {(() => {
            const merchant = state.merchants.find((m) => m.id === pending.merchantId);
            const campaign = state.campaigns.find((c) => c.id === pending.campaignId);
            const spec =
              pending.holder === "recipient" && campaign?.recipientReward ? campaign.recipientReward : campaign?.reward;
            if (!merchant || !spec) return null;
            return (
              <>
                <MerchantMark merchant={merchant} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{rewardLabel(spec)}</span>
                  <span className="micro block">
                    {merchant.name} · {t("net.scan.valid")}
                  </span>
                </span>
              </>
            );
          })()}
        </div>
      ) : null}

      <label className="mt-4 block">
        <span className="micro">{t("net.scan.amountLabel")}</span>
        <input
          type="number"
          min={0.5}
          step={0.5}
          className="input mt-2"
          value={amountKD}
          onChange={(e) => setAmountKD(Math.max(0, Number(e.target.value)))}
        />
      </label>

      <button className="btn btn-primary mt-5 w-full" disabled={code.trim().length !== 6} onClick={onRedeem}>
        {t("net.scan.redeem")}
      </button>
      <p className="micro mt-3">{t("net.scan.hint")}</p>
    </main>
  );
}
