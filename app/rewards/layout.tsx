"use client";

import type { ReactNode } from "react";
import { ConsumerNav } from "../components/network/net-ui";

export default function RewardsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ConsumerNav />
    </>
  );
}
