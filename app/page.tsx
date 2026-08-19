"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { track } from "../lib/analytics";
import { formatDateShort, money } from "../lib/i18n";
import type { Transaction } from "../lib/engine/types";
import { useApp, useAppControls } from "./components/AppProvider";
import { BUCKET_COLORS, BucketDot, Disclaimer, HeroMoney, Money, ProgressBar, SectionHeader, StackBar, Why } from "./components/ui";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
            {greeting()}, {state.profile.displayName}
          </h1>
        </div>
        {state.mode === "demo" && (
          <span
            className="chip cursor-default"
            title="Sample data — no bank connected. ONE never claims a live connection that doesn't exist."
          >
            Demo
          </span>
        )}
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
            <div className="text-[15px] font-bold">It&apos;s payday</div>
            <div className="micro">Your dinars are ready to get to work — see your plan.</div>
          </div>
          <span className="text-[18px]" style={{ color: "var(--text-3)" }} aria-hidden>
            ›
          </span>
        </Link>
      )}

      {/* Hero: Safe to Spend */}
      <section className="card-elevated mt-5">
        <div className="eyebrow">Safe to spend today</div>
        <div className="mt-2">
          <HeroMoney minor={sts.dailyMinor} />
        </div>
        <p className="subtle mt-2">
          {sts.isConstrained ? (
            <>Commitments are ahead of cash right now — your bills and essentials stay protected.</>
          ) : (
            <>
              <Money minor={sts.discretionaryMinor} /> available until payday · {state.daysToPayday}{" "}
              {state.daysToPayday === 1 ? "day" : "days"} left
            </>
          )}
        </p>
        <Why summary="How is this calculated?">
          From {money(sts.breakdown.availableCashMinor)} in checking, ONE sets aside{" "}
          {money(sts.breakdown.reservedBillsMinor)} for bills due before payday,{" "}
          {money(sts.breakdown.essentialsRemainingMinor)} for essentials, {money(sts.breakdown.safetyBufferMinor)} cash
          buffer, {money(sts.breakdown.goalCommitmentsMinor)} goal pace and {money(sts.breakdown.plannedGrowthMinor)} for
          Grow. What remains is spread across {sts.daysRemaining} days.
        </Why>
      </section>

      {/* Your money */}
      <SectionHeader
        title="Your money"
        action={
          <Link href="/plan" className="micro font-semibold" style={{ color: "var(--accent)" }}>
            Plan →
          </Link>
        }
      />
      <section className="card">
        <div className="flex items-baseline justify-between">
          <span className="subtle">Across {state.accounts.length} accounts</span>
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
                <div className="text-[14.5px] font-semibold">{b.label}</div>
                <div className="micro truncate">{b.hint}</div>
              </div>
              <Money minor={b.amountMinor} className="text-[14.5px] font-semibold" />
            </li>
          ))}
        </ul>
        <p className="micro mt-4">Every dinar has a job.</p>
      </section>

      {/* ONE recommends */}
      {insight && (
        <>
          <SectionHeader title="ONE recommends" />
          <section className="card" style={{ borderColor: "color-mix(in oklab, var(--brand) 35%, transparent)" }}>
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden>
                ✨
              </span>
              <div className="flex-1">
                <div className="text-[15px] font-bold">{insight.title}</div>
                <p className="subtle mt-1">{insight.description}</p>
                {showJobs && (
                  <>
                    <p className="micro mt-3 font-semibold">Give it a job?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {state.insightJobs.map((j) => (
                        <span key={j.bucket + j.label} className="chip cursor-default">
                          <span
                            className="bucket-dot"
                            style={{ background: j.bucket === "goal" ? BUCKET_COLORS.goals : BUCKET_COLORS[j.bucket] }}
                          />
                          {j.label} <Money minor={j.amountMinor} hideDecimals />
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
                      Put this money to work
                    </button>
                  </>
                )}
                {state.insight && insightDone && (
                  <p className="subtle mt-3" style={{ color: "var(--positive)" }}>
                    Done — your dinars are on the job. (Demo Mode updates virtual allocations only.)
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ONE Score */}
      <SectionHeader title="ONE Score" />
      <section className="card">
        <div className="flex items-center gap-5">
          <ScoreRing score={state.score.score} />
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {state.score.components.map((c) => (
                <div key={c.key}>
                  <div className="micro">{c.label}</div>
                  <div className="text-[15px] font-bold money">{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="divider my-4" />
        <p className="subtle">
          <span className="font-semibold" style={{ color: "var(--text)" }}>
            Best next move:
          </span>{" "}
          {state.score.bestNextMove.action}
        </p>
        <Why summary="How is the score built?">
          Resilience, not a credit score — weights: Emergency 30 · Cash Flow 25 · Growth 20 · Goals 25.{" "}
          {state.score.components.map((c) => (
            <span key={c.key}>
              <strong>{c.label}:</strong> {c.formula}{" "}
            </span>
          ))}
        </Why>
      </section>

      {/* Worth It shortcut */}
      <Link href="/worth-it" className="card mt-6 flex items-center gap-3">
        <span className="text-xl" aria-hidden>
          🤔
        </span>
        <div className="flex-1">
          <div className="text-[15px] font-bold">Worth it?</div>
          <div className="micro">Thinking about a purchase? See its real impact first.</div>
        </div>
        <span className="text-[18px]" style={{ color: "var(--text-3)" }} aria-hidden>
          ›
        </span>
      </Link>

      {/* Goals */}
      <SectionHeader
        title="Goals"
        action={
          <Link href="/goals" className="micro font-semibold" style={{ color: "var(--accent)" }}>
            All goals →
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
      <SectionHeader title="Recent activity" />
      {recent.length === 0 ? (
        <section className="card">
          <p className="subtle">No transactions yet — nothing needs your attention.</p>
          <p className="micro mt-1">Account connections and imports arrive in the next milestone.</p>
        </section>
      ) : (
      <section className="card" style={{ padding: "6px 18px" }}>
        <ul>
          {recent.map((t, i) => (
            <li
              key={t.id}
              className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t" : ""}`}
              style={{ borderColor: "var(--hairline)" }}
            >
              <span className="text-lg w-7 text-center" aria-hidden>
                {CATEGORY_ICONS[t.category] ?? "💳"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold truncate">{t.merchant}</div>
                <div className="micro">
                  {t.category} · {formatDateShort(t.transactionDate)}
                </div>
              </div>
              <span
                className="money text-[14.5px] font-semibold"
                style={{ color: t.direction === "credit" ? "var(--positive)" : "var(--text)" }}
              >
                {t.direction === "credit" ? "+" : "−"}
                {money(t.amountMinor)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      )}
      <Disclaimer>
        {state.mode === "demo"
          ? "Demo Mode shows generated sample data. ONE provides educational guidance and does not move real money."
          : "Your numbers stay on this device. ONE provides educational guidance and does not move real money."}
      </Disclaimer>
      <button
        className="micro mt-3 w-full text-center font-semibold"
        style={{ color: "var(--text-3)" }}
        onClick={() => {
          if (window.confirm("Start over? This clears your ONE setup on this device.")) resetAll();
        }}
      >
        Start over{state.mode === "demo" ? " / set up my own numbers" : ""}
      </button>
    </main>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
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
        <div className="text-[26px] font-bold money leading-none">{score}</div>
        <div className="micro">/ 100</div>
      </div>
    </div>
  );
}
