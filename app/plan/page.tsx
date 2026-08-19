"use client";

import { useMemo, useState } from "react";
import { track } from "../../lib/analytics";
import { goalDelayDays } from "../../lib/engine/goals";
import { calculateCompoundProjection, SCENARIOS } from "../../lib/engine/projection";
import type { BucketKey } from "../../lib/engine/types";
import { money } from "../../lib/i18n";
import { fromMajor } from "../../lib/money";
import { useDemo } from "../components/DemoProvider";
import { BUCKET_LABELS, BucketDot, Disclaimer, Money, SectionHeader, StackBar, Why } from "../components/ui";

const FLEX_BUCKETS: BucketKey[] = ["protect", "goals", "grow"];
const BASE = SCENARIOS.find((s) => s.key === "base")!;

export default function PlanPage() {
  const state = useDemo();
  const rec = state.allocationBuckets;
  const total = state.allocation.totalMinor;
  const flexTotal = Math.max(0, total - rec.life - rec.bills);

  const [flex, setFlex] = useState<Record<"protect" | "goals" | "grow", number>>({
    protect: rec.protect,
    goals: rec.goals,
    grow: rec.grow,
  });
  const [accepted, setAccepted] = useState(false);

  const enjoy = Math.max(0, flexTotal - flex.protect - flex.goals - flex.grow);
  const current: Record<BucketKey, number> = {
    life: rec.life,
    bills: rec.bills,
    protect: flex.protect,
    goals: flex.goals,
    grow: flex.grow,
    enjoy,
  };
  const isAdjusted = FLEX_BUCKETS.some((k) => flex[k as keyof typeof flex] !== rec[k]) || enjoy !== rec.enjoy;

  function setBucket(key: keyof typeof flex, value: number) {
    setAccepted(false);
    const others = FLEX_BUCKETS.filter((k) => k !== key).reduce((a, k) => a + flex[k as keyof typeof flex], 0);
    const clamped = Math.max(0, Math.min(value, flexTotal - others));
    setFlex((f) => ({ ...f, [key]: clamped }));
    track("allocation_adjusted", { bucket: key });
  }

  // Consequences of deviating from the recommendation — recomputed live via the engine.
  const consequences = useMemo(() => {
    const out: Array<{ tone: "info" | "caution" | "positive"; text: string }> = [];

    const protectDelta = flex.protect - rec.protect;
    if (protectDelta !== 0 && state.emergency.stageGapMinor > 0) {
      const gap = state.emergency.stageGapMinor;
      const daysAt = (monthly: number) => (monthly > 0 ? Math.ceil(gap / (monthly / 30)) : null);
      const recDays = daysAt(rec.protect);
      const newDays = daysAt(flex.protect);
      if (protectDelta < 0) {
        out.push({
          tone: "caution",
          text:
            newDays === null
              ? `Pausing Protect leaves your “${state.emergency.stageLabel}” milestone on hold.`
              : `Reducing Protect by ${money(-protectDelta)} delays your “${state.emergency.stageLabel}” milestone by about ${newDays - (recDays ?? 0)} days.`,
        });
      } else {
        out.push({
          tone: "positive",
          text: `Adding ${money(protectDelta)} to Protect reaches “${state.emergency.stageLabel}” about ${(recDays ?? 0) - (newDays ?? 0)} days sooner.`,
        });
      }
    }

    const goalsDelta = flex.goals - rec.goals;
    if (goalsDelta < 0 && state.goals.length > 0) {
      const top = state.goals[0];
      out.push({
        tone: "caution",
        text: `Reducing Goals by ${money(-goalsDelta)} delays ${top.name} by roughly ${goalDelayDays(rec.goals, -goalsDelta)} days.`,
      });
    } else if (goalsDelta > 0) {
      out.push({ tone: "positive", text: `Extra ${money(goalsDelta)} toward Goals brings your targets closer.` });
    }

    const growDelta = flex.grow - rec.grow;
    if (growDelta !== 0) {
      const years = 10;
      const diff =
        calculateCompoundProjection(0, Math.max(0, flex.grow), years, BASE).futureValueMinor -
        calculateCompoundProjection(0, rec.grow, years, BASE).futureValueMinor;
      out.push({
        tone: growDelta > 0 ? "positive" : "info",
        text: `${growDelta > 0 ? "+" : "−"}${money(Math.abs(growDelta))}/month to Grow ≈ ${diff >= 0 ? "+" : "−"}${money(Math.abs(diff))} after ${years} years (hypothetical, base scenario).`,
      });
    }

    const enjoyDelta = enjoy - rec.enjoy;
    if (enjoyDelta > fromMajor(20)) {
      out.push({
        tone: "info",
        text: `Enjoy grows by ${money(enjoyDelta)} — a fine choice; your bills and essentials stay protected either way.`,
      });
    }
    return out;
  }, [flex, enjoy, rec, state]);

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          Plan
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">Payday plan</h1>
        <p className="subtle mt-1">
          Salary <Money minor={total} /> · every dinar gets a job on the {state.profile.paydayDayOfMonth}th
        </p>
      </header>

      <section className="card-elevated mt-5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{isAdjusted ? "Your plan" : "Recommended by ONE"}</span>
          {isAdjusted && (
            <button
              className="micro font-semibold"
              style={{ color: "var(--accent)" }}
              onClick={() => {
                setFlex({ protect: rec.protect, goals: rec.goals, grow: rec.grow });
                setAccepted(false);
              }}
            >
              Reset to ONE&apos;s plan
            </button>
          )}
        </div>
        <div className="mt-3">
          <StackBar
            parts={(Object.keys(current) as BucketKey[]).map((k) => ({ key: k, amountMinor: current[k] }))}
          />
        </div>

        <ul className="mt-5 flex flex-col gap-4">
          {(Object.keys(current) as BucketKey[]).map((key) => {
            const item = state.allocation.items.find((i) => i.bucket === key);
            const adjustable = (FLEX_BUCKETS as string[]).includes(key);
            const value = current[key];
            return (
              <li key={key}>
                <div className="flex items-center gap-3">
                  <BucketDot bucket={key} />
                  <span className="flex-1 text-[14.5px] font-semibold">{BUCKET_LABELS[key]}</span>
                  {value !== rec[key] && (
                    <span className="micro line-through opacity-70">
                      <Money minor={rec[key]} />
                    </span>
                  )}
                  <Money minor={value} className="text-[14.5px] font-bold" />
                </div>
                {adjustable && (
                  <input
                    type="range"
                    min={0}
                    max={flexTotal}
                    step={500}
                    value={value}
                    aria-label={`${BUCKET_LABELS[key]} amount`}
                    onChange={(e) => setBucket(key as keyof typeof flex, Number(e.target.value))}
                  />
                )}
                {key === "enjoy" && <p className="micro mt-1">Auto-balances — whatever the other buckets don&apos;t take.</p>}
                {(key === "life" || key === "bills") && (
                  <p className="micro mt-1">Held steady — essentials and known bills come first.</p>
                )}
                {item && <Why>{item.reason}</Why>}
              </li>
            );
          })}
        </ul>
      </section>

      {consequences.length > 0 && (
        <>
          <SectionHeader title="What changes" />
          <section className="card flex flex-col gap-3">
            {consequences.map((c, i) => (
              <p key={i} className="subtle flex gap-2">
                <span aria-hidden>{c.tone === "caution" ? "⚠️" : c.tone === "positive" ? "✅" : "ℹ️"}</span>
                <span>{c.text}</span>
              </p>
            ))}
          </section>
        </>
      )}

      <button
        className="btn btn-primary mt-6 w-full"
        disabled={accepted}
        onClick={() => {
          setAccepted(true);
          track("allocation_accepted", { adjusted: isAdjusted });
        }}
      >
        {accepted ? "Plan accepted ✓" : isAdjusted ? "Accept your plan" : "Accept ONE's plan"}
      </button>
      {accepted && (
        <p className="subtle mt-3 text-center" style={{ color: "var(--positive)" }}>
          Your dinars have their jobs for this cycle.
        </p>
      )}
      <Disclaimer>
        Accepting updates ONE&apos;s virtual allocation only — it does not move money between real accounts. Grow amounts
        are educational recommendations; ONE does not execute investments.
      </Disclaimer>
    </main>
  );
}
