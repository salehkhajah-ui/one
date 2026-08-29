"use client";

import type { ReactNode } from "react";
import { NetworkProvider } from "../components/network/NetworkProvider";

export default function NetworkLayout({ children }: { children: ReactNode }) {
  return <NetworkProvider>{children}</NetworkProvider>;
}
