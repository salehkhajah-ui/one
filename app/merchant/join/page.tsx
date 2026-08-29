"use client";

/**
 * Merchant onboarding — the 3-minute promise in three steps: who you are,
 * how customers buy, done. The first campaign continues in the creator with
 * the new merchant preselected.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { t } from "../../../lib/i18n";
import type { Merchant, MerchantCategory } from "../../../lib/network/types";
import { useNetwork } from "../../components/network/NetworkProvider";
import { categoryLabel, MerchantMark } from "../../components/network/net-ui";

const CATEGORIES: MerchantCategory[] = ["food", "coffee", "grocery", "fashion", "travel", "telecom", "entertainment"];
const CHANNELS = ["online", "instore", "pos", "manual"] as const;

export default function JoinPage() {
  const { register } = useNetwork();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MerchantCategory>("food");
  const [location, setLocation] = useState("");
  const [channels, setChannels] = useState<Set<(typeof CHANNELS)[number]>>(new Set(["instore"]));
  const [created, setCreated] = useState<Merchant | null>(null);

  const toggleChannel = (c: (typeof CHANNELS)[number]) =>
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const create = () => {
    const merchant = register({
      name: name.trim(),
      category,
      online: channels.has("online"),
      location: location.trim() || undefined,
    });
    setCreated(merchant);
  };

  const continueToCampaign = () => {
    if (created) {
      try {
        sessionStorage.setItem("one.creator.merchant", created.id);
      } catch {
        /* preselect is a convenience only */
      }
    }
    router.push("/merchant/new");
  };

  if (created) {
    return (
      <main className="screen mx-auto max-w-[560px]">
        <div className="card-elevated reveal-card mt-10 text-center">
          <div className="flex justify-center">
            <MerchantMark merchant={created} size={52} />
          </div>
          <h1 className="mt-4 text-[24px] font-bold tracking-tight">{t("net.join.doneTitle", { name: created.name })}</h1>
          <p className="subtle mt-2">{t("net.join.doneSub")}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button className="btn btn-primary w-full" onClick={continueToCampaign}>
              {t("net.join.firstCampaign")}
            </button>
            <Link href="/merchant" className="btn btn-ghost w-full">
              {t("net.creator.backToDashboard")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="screen mx-auto max-w-[560px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight">{t("net.join.title")}</h1>
        <span className="micro money">{step}/3</span>
      </div>

      {step === 1 ? (
        <>
          <h2 className="section-title mb-3 mt-6">{t("net.join.aboutTitle")}</h2>
          <label className="block">
            <span className="micro">{t("net.join.nameLabel")}</span>
            <input
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("net.join.namePlaceholder")}
            />
          </label>
          <div className="mt-4">
            <span className="micro">{t("net.join.categoryLabel")}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className="chip"
                  aria-pressed={category === c}
                  style={category === c ? { borderColor: "var(--accent)", color: "var(--text)" } : undefined}
                  onClick={() => setCategory(c)}
                >
                  {categoryLabel(c)}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-4 block">
            <span className="micro">{t("net.join.locationLabel")}</span>
            <input className="input mt-1" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("net.join.locationPlaceholder")} />
          </label>
          <button className="btn btn-primary mt-5 w-full" disabled={name.trim().length < 2} onClick={() => setStep(2)}>
            {t("common.next")}
          </button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2 className="section-title mb-3 mt-6">{t("net.join.channelsTitle")}</h2>
          <div className="flex flex-col gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c}
                className="card flex items-center justify-between text-start"
                aria-pressed={channels.has(c)}
                style={channels.has(c) ? { borderColor: "var(--accent)" } : undefined}
                onClick={() => toggleChannel(c)}
              >
                <span className="font-semibold">{t(`net.join.channel.${c}`)}</span>
                <span className="micro">{channels.has(c) ? "✓" : ""}</span>
              </button>
            ))}
          </div>
          <p className="micro mt-2">{t("net.join.channelsHint")}</p>
          <div className="mt-5 flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={() => setStep(1)}>
              {t("net.common.back")}
            </button>
            <button className="btn btn-primary flex-1" disabled={channels.size === 0} onClick={() => setStep(3)}>
              {t("common.next")}
            </button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h2 className="section-title mb-3 mt-6">{t("net.join.reviewTitle")}</h2>
          <div className="card-elevated">
            <p className="text-[20px] font-semibold">{name.trim()}</p>
            <p className="subtle mt-1">
              {categoryLabel(category)}
              {location.trim() ? ` · ${location.trim()}` : ""} ·{" "}
              {[...channels].map((c) => t(`net.join.channel.${c}`)).join(" · ")}
            </p>
            <p className="micro mt-3">{t("net.join.reviewNote")}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={() => setStep(2)}>
              {t("net.common.back")}
            </button>
            <button className="btn btn-primary flex-1" onClick={create}>
              {t("net.join.create")}
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}
