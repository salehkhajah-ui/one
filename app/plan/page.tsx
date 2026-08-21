"use client";

import { useMemo, useState } from "react";
import { track } from "../../lib/analytics";
import { goalDelayDays } from "../../lib/engine/goals";
import { calculateCompoundProjection, SCENARIOS } from "../../lib/engine/projection";
import type { BucketKey } from "../../lib/engine/types";
import { emergencyStageLabel, formatDateShort, money, t } from "../../lib/i18n";
import { fromMajor } from "../../lib/money";
import Link from "next/link";
import { useApp, useAppControls } from "../components/AppProvider";
import { bucketLabel, BucketDot, Disclaimer, Money, SectionHeader, StackBar, Why } from "../components/ui";
import { allocationReason } from "../components/text";

const FLEX_BUCKETS: BucketKey[] = ["protect", "goals", "grow"];
const BASE = SCENARIOS.find((s) => s.key === "base")!;

export default function PlanPage() {
  const state = useApp();
  const { acceptPlan } = useAppControls();
  const rec = state.allocationBuckets;
  const total = state.allocation.totalMinor;
  const flexTotal = Math.max(0, total - rec.life - rec.bills);

  // Start from the plan in force: the accepted plan when one exists, else the recommendation.
  const [flex, setFlex] = useState<Record<"protect" | "goals" | "grow", number>>({
    protect: state.planBuckets.protect,
    goals: state.planBuckets.goals,
    grow: state.planBuckets.grow,
  });
  const [accepted, setAccepted] = useState(state.planIsAccepted);

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
              ? t("plan.c.protectPause", { stage: emergencyStageLabel(state.emergency.stage, state.profile.emergencyTargetMonths) })
              : t("plan.c.protectReduce", { amount: money(-protectDelta), stage: emergencyStageLabel(state.emergency.stage, state.profile.emergencyTargetMonths), days: newDays - (recDays ?? 0) }),
        });
      } else {
        out.push({
          tone: "positive",
          text: t("plan.c.protectAdd", { amount: money(protectDelta), stage: emergencyStageLabel(state.emergency.stage, state.profile.emergencyTargetMonths), days: (recDays ?? 0) - (newDays ?? 0) }),
        });
      }
    }

    const goalsDelta = flex.goals - rec.goals;
    if (goalsDelta < 0 && state.goals.length > 0) {
      const top = state.goals[0];
      out.push({
        tone: "caution",
        text: t("plan.c.goalsReduce", { amount: money(-goalsDelta), name: top.name, days: goalDelayDays(rec.goals, -goalsDelta) }),
      });
    } else if (goalsDelta > 0) {
      out.push({ tone: "positive", text: t("plan.c.goalsAdd", { amount: money(goalsDelta) }) });
    }

    const growDelta = flex.grow - rec.grow;
    if (growDelta !== 0) {
      const years = 10;
      const diff =
        calculateCompoundProjection(0, Math.max(0, flex.grow), years, BASE).futureValueMinor -
        calculateCompoundProjection(0, rec.grow, years, BASE).futureValueMinor;
      out.push({
        tone: growDelta > 0 ? "positive" : "info",
        text: t("plan.c.grow", { sign: growDelta > 0 ? "+" : "−", amount: money(Math.abs(growDelta)), diffSign: diff >= 0 ? "+" : "−", diff: money(Math.abs(diff)), years }),
      });
    }

    const enjoyDelta = enjoy - rec.enjoy;
    if (enjoyDelta > fromMajor(20)) {
      out.push({
        tone: "info",
        text: t("plan.c.enjoy", { amount: money(enjoyDelta) }),
      });
    }
    return out;
  }, [flex, enjoy, rec, state]);

  return (
    <main className="screen">
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          {t("plan.eyebrow")}
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("plan.title")}</h1>
        <p className="subtle mt-1">
          {t("plan.subtitle", { amount: money(total), day: state.profile.paydayDayOfMonth })}
        </p>
      </header>

      <section className="card-elevated mt-5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{isAdjusted ? t("plan.yourPlan") : t("plan.recommended")}</span>
          {isAdjusted && (
            <button
              className="micro font-semibold"
              style={{ color: "var(--accent)" }}
              onClick={() => {
                setFlex({ protect: rec.protect, goals: rec.goals, grow: rec.grow });
                setAccepted(false);
              }}
            >
              {t("plan.reset")}
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
                  <span className="flex-1 text-[14.5px] font-semibold">{bucketLabel(key)}</span>
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
                    aria-label={`${bucketLabel(key)} amount`}
                    onChange={(e) => setBucket(key as keyof typeof flex, Number(e.target.value))}
                  />
                )}
                {key === "enjoy" && <p className="micro mt-1">{t("plan.autoBalances")}</p>}
                {(key === "life" || key === "bills") && <p className="micro mt-1">{t("plan.heldSteady")}</p>}
                {item && <Why>{allocationReason(item, state)}</Why>}
              </li>
            );
          })}
        </ul>
      </section>

      {consequences.length > 0 && (
        <>
          <SectionHeader title={t("plan.whatChanges")} />
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
          acceptPlan({ protectMinor: flex.protect, goalsMinor: flex.goals, growMinor: flex.grow });
          setAccepted(true);
        }}
      >
        {accepted ? t("plan.accepted") : isAdjusted ? t("plan.acceptYours") : t("plan.accept")}
      </button>
      {accepted && (
        <p className="subtle mt-3 text-center" style={{ color: "var(--positive)" }}>
          {t("plan.acceptedNote", { date: formatDateShort(state.nextPaydayISO) })}
        </p>
      )}
      <Link href="/payday" className="micro mt-4 block text-center font-semibold" style={{ color: "var(--accent)" }}>
        {t("plan.seePayday")}
      </Link>
      <Disclaimer>
        {t("plan.disclaimer")}
      </Disclaimer>
    </main>
  );
}
