"use client";

/**
 * ONE — Financial Moment Network landing. A new visitor must get the idea in
 * five seconds: every financial transaction can unlock something valuable.
 */
import Link from "next/link";
import { t } from "../../lib/i18n";
import { useNetwork } from "../components/network/NetworkProvider";
import { LanguageToggle } from "../components/network/net-ui";

export default function NetworkLanding() {
  useNetwork(); // re-render on locale change
  const steps = ["event", "match", "reveal", "redeem", "measure"] as const;
  return (
    <main className="screen">
      <div className="flex items-center gap-2">
        <span className="portal-brand" style={{ color: "var(--brand)" }}>
          ONE
        </span>
        <span className="portal-tag">{t("net.landing.tag")}</span>
        <span className="ms-auto">
          <LanguageToggle />
        </span>
      </div>

      <div className="mt-12 max-w-[640px]">
        <h1 className="text-[38px] font-bold leading-tight tracking-tight">{t("net.landing.hero")}</h1>
        <p className="subtle mt-4 text-[16px]">{t("net.landing.heroSub")}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/rewards" className="btn btn-primary">
            {t("net.landing.tryDemo")}
          </Link>
          <Link href="/pitch" className="btn btn-ghost">
            {t("net.landing.readPitch")}
          </Link>
        </div>
      </div>

      <div className="card mt-10">
        <div className="flow-row justify-center">
          {steps.map((s, i) => (
            <span key={s} className="flow-row">
              {i > 0 ? (
                <span className="flow-arrow" aria-hidden>
                  →
                </span>
              ) : null}
              <span className="flow-step">{t(`net.landing.flow.${s}`)}</span>
            </span>
          ))}
        </div>
      </div>

      <h2 className="section-title mb-3 mt-10">{t("net.landing.threeSides")}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {(
          [
            ["consumers", "/rewards"],
            ["merchants", "/merchant"],
            ["institutions", "/institution"],
          ] as const
        ).map(([side, href]) => (
          <Link key={side} href={href} className="card-elevated block">
            <span className="eyebrow">{t(`net.landing.${side}.label`)}</span>
            <p className="mt-2 text-[17px] font-semibold leading-snug">{t(`net.landing.${side}.hook`)}</p>
            <p className="subtle mt-2">{t(`net.landing.${side}.sub`)}</p>
            <span className="micro mt-3 block font-semibold" style={{ color: "var(--accent)" }}>
              {t(`net.landing.${side}.cta`)} →
            </span>
          </Link>
        ))}
      </div>

      <h2 className="section-title mb-3 mt-10">{t("net.landing.demoTitle")}</h2>
      <div className="card">
        <ol className="grid gap-3 md:grid-cols-4">
          {(
            [
              ["1", "net.landing.demo1", "/institution"],
              ["2", "net.landing.demo2", "/rewards"],
              ["3", "net.landing.demo3", "/merchant/scan"],
              ["4", "net.landing.demo4", "/merchant"],
            ] as const
          ).map(([n, key, href]) => (
            <li key={n}>
              <Link href={href} className="block">
                <span className="stat-value money" style={{ color: "var(--accent)" }}>
                  {n}
                </span>
                <p className="subtle mt-1">{t(key)}</p>
              </Link>
            </li>
          ))}
        </ol>
        <p className="micro mt-4">{t("net.landing.demoNote")}</p>
      </div>

      <div className="card mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="subtle">{t("net.landing.investorTeaser")}</span>
        <Link href="/investor" className="btn btn-quiet">
          {t("net.landing.investorCta")}
        </Link>
      </div>

      <p className="micro mt-8 text-center">{t("net.landing.disclaimer")}</p>
      <p className="micro mt-2 text-center">
        <Link href="/" style={{ color: "var(--accent)" }}>
          {t("net.landing.allocationApp")}
        </Link>
      </p>
    </main>
  );
}
