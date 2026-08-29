"use client";

import type { ReactNode } from "react";
import { NetworkProvider } from "../components/network/NetworkProvider";
import { PortalHeader } from "../components/network/net-ui";

export default function InstitutionLayout({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider>
      <PortalHeader tagKey="net.institution.tag" />
      {children}
    </NetworkProvider>
  );
}
