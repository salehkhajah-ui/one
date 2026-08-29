"use client";

import type { ReactNode } from "react";
import { PortalHeader } from "../components/network/net-ui";

export default function InvestorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PortalHeader tagKey="net.investor.tag" />
      {children}
    </>
  );
}
