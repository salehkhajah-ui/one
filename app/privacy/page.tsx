"use client";

import Link from "next/link";
import { t } from "../../lib/i18n";

/** Plain-language privacy policy. Draft for MVP — requires legal review before commercial launch. */
export default function PrivacyPage() {
  return (
    <main className="screen" style={{ paddingBottom: 40 }}>
      <header className="pt-2">
        <div className="eyebrow" style={{ color: "var(--brand)" }}>
          ONE
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">{t("pv.title")}</h1>
        <p className="micro mt-1">{t("pv.updated")}</p>
      </header>

      <div className="mt-5 flex flex-col gap-4 subtle" style={{ fontSize: 14.5 }}>
        <p>{t("pv.intro")}</p>

        <h2 className="section-title mt-2">{t("pv.storeTitle")}</h2>
        <p>{t("pv.store")}</p>

        <h2 className="section-title mt-2">{t("pv.bankTitle")}</h2>
        <p>{t("pv.bank")}</p>

        <h2 className="section-title mt-2">{t("pv.neverTitle")}</h2>
        <p>{t("pv.never")}</p>

        <h2 className="section-title mt-2">{t("pv.controlsTitle")}</h2>
        <p>
          {t("pv.controls.a")}
          <Link href="/account" style={{ color: "var(--accent)" }}>
            {t("pv.controls.link")}
          </Link>
          {t("pv.controls.b")}
        </p>

        <h2 className="section-title mt-2">{t("pv.signinTitle")}</h2>
        <p>{t("pv.signin")}</p>

        <h2 className="section-title mt-2">{t("pv.contactTitle")}</h2>
        <p>
          {t("pv.contact")}
          <a href="mailto:saleh.khajah@gmail.com" style={{ color: "var(--accent)" }} dir="ltr">
            saleh.khajah@gmail.com
          </a>
          .
        </p>

        <p className="micro">{t("pv.draft")}</p>
      </div>
    </main>
  );
}
