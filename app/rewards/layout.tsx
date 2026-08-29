"use client";

import type { ReactNode } from "react";
import { NetworkProvider } from "../components/network/NetworkProvider";
import { ConsumerNav } from "../components/network/net-ui";

export default function RewardsLayout({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider>
      {children}
      <ConsumerNav />
    </NetworkProvider>
  );
}
