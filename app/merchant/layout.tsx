"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "../../lib/i18n";
import { PortalHeader } from "../components/network/net-ui";

export default function MerchantLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PortalHeader
        tagKey="net.merchant.tag"
        extra={
          <>
            <Link href="/merchant/scan" className="chip">
              {t("net.merchant.scanner")}
            </Link>
            <Link href="/merchant/new" className="chip" style={{ borderColor: "var(--accent)" }}>
              {t("net.merchant.newCampaign")}
            </Link>
          </>
        }
      />
      {children}
    </>
  );
}
