"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "../../lib/analytics";
import { t } from "../../lib/i18n";
import type { BucketKey } from "../../lib/engine/types";
import { useApp, useAppControls } from "../components/AppProvider";
import { bucketLabel, BucketDot, HeroMoney, Money } from "../components/ui";

const BUCKET_ORDER: BucketKey[] = ["protect", "grow", "goals", "life", "bills", "enjoy"];

/**
 * The Payday experience — income arrives, dinars get to work.
 * Accepting stores a virtual allocation for this pay cycle; no real money moves.
 */
export default function PaydayPage() {
  const state = useApp();
  const { acceptPlan } = useAppControls();
  const router = useRouter();
  const [phase, setPhase] = useState<"amount" | "working" | "plan">("amount");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    track("payday_plan_viewed");
    const t1 = setTimeout(() => setPhase("working"), 1400);
    const t2 = setTimeout(() => setPhase("plan"), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const income = state.allocation.totalMinor;
  const rec = state.allocationBuckets;

  return (
    <main className="screen flex min-h-[100dvh] flex-col">
      <div className="flex items-center justify-between pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          {t("payday.eyebrow")}
        </div>
        <Link href="/" className="micro font-semibold" style={{ color: "var(--text-3)" }}>
          {t("payday.close")}
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-center pb-10">
        <div className="text-center">
          <p className="subtle">{phase === "amount" ? t("payday.received") : t("payday.eyebrow")}</p>
          <div className="mt-2 flex justify-center" style={{ color: "var(--positive)" }}>
            <HeroMoney minor={income} />
          </div>
          {phase !== "amount" && (
            <p className="subtle mt-3" style={{ animation: "screen-in 400ms ease" }}>
              {phase === "working" ? t("payday.working") : t("brand.everyDinarJob")}
            </p>
          )}
        </div>

        {phase === "plan" && (
          <section className="card-elevated mt-8">
            <ul className="flex flex-col gap-3.5">
              {BUCKET_ORDER.map((k, i) => (
                <li
                  key={k}
                  className="flex items-center gap-3"
                  style={{ animation: `screen-in 360ms cubic-bezier(0.2,0.7,0.3,1) ${i * 90}ms backwards` }}
                >
                  <BucketDot bucket={k} />
                  <span className="flex-1 text-[14.5px] font-semibold">{bucketLabel(k)}</span>
                  <Money minor={rec[k]} className="text-[14.5px] font-bold" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {phase === "plan" && (
        <div className="pb-6">
          {accepted ? (
            <p className="subtle text-center" style={{ color: "var(--positive)" }}>
              {t("payday.acceptedNote")}
            </p>
          ) : (
            <>
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  acceptPlan({ protectMinor: rec.protect, goalsMinor: rec.goals, growMinor: rec.grow });
                  setAccepted(true);
                  setTimeout(() => router.push("/"), 1100);
                }}
              >
                {t("payday.acceptPlan")}
              </button>
              <Link href="/plan" className="btn btn-ghost mt-3 w-full">
                {t("payday.adjustFirst")}
              </Link>
              <p className="micro mt-3 text-center">
                {t("payday.disclaimer")}
              </p>
            </>
          )}
        </div>
      )}
    </main>
  );
}
