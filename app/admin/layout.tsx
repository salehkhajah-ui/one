"use client";

import type { ReactNode } from "react";
import { NetworkProvider } from "../components/network/NetworkProvider";
import { PortalHeader } from "../components/network/net-ui";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider>
      <PortalHeader tagKey="net.admin.tag" />
      {children}
    </NetworkProvider>
  );
}
