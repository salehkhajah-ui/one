"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { track } from "../lib/analytics";
import { formatDateShort, money, t } from "../lib/i18n";
import type { Transaction } from "../lib/engine/types";
import type { StringKey } from "../lib/i18n-strings";
import { useApp, useAppControls } from "./components/AppProvider";
import { ForecastCard } from "./components/ForecastCard";
import { BUCKET_COLORS, BucketDot, Disclaimer, HeroMoney, Money, ProgressBar, SectionHeader, StackBar, Why, bucketLabel, useCountUp } from "./components/ui";
import { catLabel, insightDescription, insightTitle, scoreComponentLabel, scoreFormula, scoreMove } from "./components/text";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return t("home.morning");
  if (h < 17) return t("home.afternoon");
  return t("home.evening");
}

const CATEGORY_ICONS: Partial<Record<Transaction["category"], string>> = {
  Income: "💼",
  Groceries: "🛒",
  Dining: "🍽️",
  Transport: "⛽",
  Shopping: "🛍️",
  Entertainment: "🎬",
  Subscriptions: "📺",
  Utilities: "📡",
  Health: "💪",
};

export default function HomePage() {
  const state = useApp();
  const { resetAll } = useAppControls();
  const [insightDone, setInsightDone] = useState(false);

  useEffect(() => {
    track("safe_to_spend_viewed");
  }, []);

  const sts = state.safeToSpend;
  const recent = useMemo(() => state.transactions.slice(0, 5), [state.transactions]);
  const insight = state.insight ?? state.secondaryInsight;
  const showJobs = state.insight !== null && !insightDone;

  return (
    <main className="screen">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <div className="eyebrow" style={{ color: "var(--brand)" }}>
            ONE
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight">
            {greeting()}
            {t("common.comma")}
            {state.profile.displayName}
          </h1>
        </div>
        <span className="flex items-center gap-2">
          {state.mode === "demo" && (
            <span
              className="chip cursor-default"
              title="Sample data — no bank connected. ONE never claims a live connection that doesn't exist."
            >
              {t("common.demo")}
            </span>
          )}
          <Link href="/account" className="chip" aria-label="Account & cloud sync">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="8.5" r="3.5" />
              <path d="M4.5 19.5c1.6-3.2 4.3-4.5 7.5-4.5s5.9 1.3 7.5 4.5" />
            </svg>
          </Link>
        </span>
      </header>

      {/* Payday banner */}
      {state.isPaydayToday && !state.planIsAccepted && (
        <Link
          href="/payday"
          className="card mt-4 flex items-center gap-3"
          style={{ borderColor: "color-mix(in oklab, var(--positive) 45%, transparent)" }}
        >
          <span className="text-xl" aria-hidden>
            🎉
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-bold">{t("home.paydayBanner")}</div>
            <div className="micro">{t("home.paydayBannerHint")}</div>
          </div>
          <span className="text-[18px]" style={{ color: "var(--text-3)" }} aria-hidden>
            ›
          </span>
        </Link>
      )}

      {/* Hero: Safe to Spend */}
      <section className="card-elevated mt-5">
        <div className="eyebrow">{t("home.safeToSpendToday")}</div>
        <div className="mt-2">
          <HeroMoney minor={sts.dailyMinor} />
        </div>
        <p className="subtle mt-2">
          {sts.isConstrained
            ? t("home.constrained")
            : t("home.availableUntilPayday", {
                amount: money(sts.discretionaryMinor),
                days: state.daysToPayday,
                dayWord: state.daysToPayday === 1 ? t("common.day") : t("common.days"),
              })}
        </p>
        <Why summary={t("home.howCalculated")}>
          {t("home.stsWhy", {
            cash: money(sts.breakdown.availableCashMinor),
            bills: money(sts.breakdown.reservedBillsMinor),
            essentials: money(sts.breakdown.essentialsRemainingMinor),
            buffer: money(sts.breakdown.safetyBufferMinor),
            goals: money(sts.breakdown.goalCommitmentsMinor),
            growth: money(sts.breakdown.plannedGrowthMinor),
            days: sts.daysRemaining,
          })}
        </Why>
        <div className="mt-4 flex gap-2">
          <Link href="/add" className="btn btn-quiet flex-1">
            {t("home.recordSpending")}
          </Link>
          <Link href="/worth-it" className="btn btn-quiet flex-1">
            {t("home.worthIt")}
          </Link>
        </div>
      </section>

      {/* Your money */}
      <SectionHeader
        title={t("home.yourMoney")}
        action={
          <Link href="/plan" className="micro font-semibold" style={{ color: "var(--accent)" }}>
            {t("home.planLink")}
          </Link>
        }
      />
      <section className="card">
        <div className="flex items-baseline justify-between">
          <span className="subtle">{t("home.acrossAccounts", { n: state.accounts.length })}</span>
          <Money minor={state.totalCashMinor} className="text-[17px] font-bold" />
        </div>
        <div className="mt-3">
          <StackBar parts={state.buckets.map((b) => ({ key: b.key, amountMinor: b.amountMinor }))} />
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {state.buckets.map((b) => (
            <li key={b.key} className="flex items-center gap-3">
              <BucketDot bucket={b.key} />
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold">{bucketLabel(b.key)}</div>
                <div className="micro truncate">{t(`bucket.${b.key}.hint` as StringKey)}</div>
              </div>
              <Money minor={b.amountMinor} className="text-[14.5px] font-semibold" />
            </li>
          ))}
        </ul>
        <p className="micro mt-4">{t("brand.everyDinarJob")}</p>
      </section>

      {/* 30-day forecast */}
      <SectionHeader title={t("home.next30")} />
      <ForecastCard forecast={state.forecast} basis={t(state.hasHistory ? "forecast.basisHistory" : "forecast.basisPlan")} currency="KWD" />

      {/* ONE recommends */}
      {insight && (
        <>
          <SectionHeader title={t("home.oneRecommends")} />
          <section className="card" style={{ borderColor: "color-mix(in oklab, var(--brand) 35%, transparent)" }}>
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden>
                ✨
              </span>
              <div className="flex-1">
                <div className="text-[15px] font-bold">{insightTitle(insight)}</div>
                <p className="subtle mt-1">{insightDescription(insight)}</p>
                {showJobs && (
                  <>
                    <p className="micro mt-3 font-semibold">{t("home.giveJob")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {state.insightJobs.map((j) => (
                        <span key={j.bucket + j.label} className="chip cursor-default">
                          <span
                            className="bucket-dot"
                            style={{ background: j.bucket === "goal" ? BUCKET_COLORS.goals : BUCKET_COLORS[j.bucket] }}
                          />
                          {j.bucket === "goal" ? j.label : bucketLabel(j.bucket)} <Money minor={j.amountMinor} hideDecimals />
                        </span>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary mt-4 w-full"
                      onClick={() => {
                        setInsightDone(true);
                        track("insight_resolved", { type: insight.type });
                      }}
                    >
                      {t("home.putToWork")}
                    </button>
                  </>
                )}
                {state.insight && insightDone && (
                  <p className="subtle mt-3" style={{ color: "var(--positive)" }}>
                    {t("home.insightDone")}
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ONE Score */}
      <SectionHeader title={t("home.oneScore")} />
      <section className="card">
        <div className="flex items-center gap-5">
          <ScoreRing score={state.score.score} />
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {state.score.components.map((c) => (
                <div key={c.key}>
                  <div className="micro">{scoreComponentLabel(c)}</div>
                  <div className="text-[15px] font-bold money">{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="divider my-4" />
        <p className="subtle">
          <span className="font-semibold" style={{ color: "var(--text)" }}>
            {t("home.bestNextMove")}
          </span>{" "}
          {scoreMove(state.score.bestNextMove)}
        </p>
        <Why summary={t("home.howScoreBuilt")}>
          {t("home.scoreExplain")}{" "}
          {state.score.components.map((c) => (
            <span key={c.key}>
              <strong>{scoreComponentLabel(c)}:</strong> {scoreFormula(c, state.hasHistory)}{" "}
            </span>
          ))}
        </Why>
      </section>

      {/* Goals */}
      <SectionHeader
        title={t("home.goals")}
        action={
          <Link href="/goals" className="micro font-semibold" style={{ color: "var(--accent)" }}>
            {t("home.allGoals")}
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        {state.goals.map((g) => (
          <Link key={g.id} href="/goals" className="card" style={{ padding: 14 }}>
            <div className="text-xl" aria-hidden>
              {g.emoji}
            </div>
            <div className="mt-1.5 text-[14.5px] font-bold truncate">{g.name}</div>
            <div className="micro mt-0.5">
              <Money minor={g.currentMinor} hideDecimals /> / <Money minor={g.targetMinor} hideDecimals />
            </div>
            <div className="mt-2">
              <ProgressBar pct={g.progressPct} color={BUCKET_COLORS.goals} />
            </div>
            <div className="micro mt-1.5">{g.progressPct}%</div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <SectionHeader
        title={t("home.recentActivity")}
        action={
          <span className="flex items-center gap-4">
            <Link href="/add" className="micro font-semibold" style={{ color: "var(--accent)" }}>
              {t("home.add")}
            </Link>
            <Link href="/activity" className="micro font-semibold" style={{ color: "var(--accent)" }}>
              {t("home.all")}
            </Link>
          </span>
        }
      />
      {recent.length === 0 ? (
        <section className="card">
          <p className="subtle">{t("home.noTx")}</p>
          <p className="micro mt-1">{t("home.noTxHint")}</p>
        </section>
      ) : (
      <section className="card" style={{ padding: "6px 18px" }}>
        <ul>
          {recent.map((tx, i) => (
            <li
              key={tx.id}
              className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t" : ""}`}
              style={{ borderColor: "var(--hairline)" }}
            >
              <span className="text-lg w-7 text-center" aria-hidden>
                {CATEGORY_ICONS[tx.category] ?? "💳"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold truncate">{tx.merchant}</div>
                <div className="micro">
                  {catLabel(tx.category)} · {formatDateShort(tx.transactionDate)}
                </div>
              </div>
              <span
                className="money text-[14.5px] font-semibold"
                style={{ color: tx.direction === "credit" ? "var(--positive)" : "var(--text)" }}
              >
                {tx.direction === "credit" ? "+" : "−"}
                {money(tx.amountMinor)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      )}
      <Disclaimer>
        {state.mode === "demo" ? t("home.disclaimerDemo") : t("home.disclaimerManual")}
      </Disclaimer>
      <button
        className="micro mt-3 w-full text-center font-semibold"
        style={{ color: "var(--text-3)" }}
        onClick={() => {
          if (window.confirm(t("common.startOverConfirm"))) resetAll();
        }}
      >
        {state.mode === "demo" ? t("common.startOverDemo") : t("common.startOver")}
      </button>
    </main>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const shown = useCountUp(score, 900);
  const filled = (shown / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: 92, height: 92 }}>
      <svg width="92" height="92" viewBox="0 0 92 92" className="score-ring" aria-hidden>
        <circle cx="46" cy="46" r={r} fill="none" stroke="color-mix(in oklab, var(--text) 10%, transparent)" strokeWidth="8" />
        <circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-[26px] font-bold money leading-none">{shown}</div>
        <div className="micro">/ 100</div>
      </div>
    </div>
  );
}
