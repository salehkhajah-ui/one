"use client";

import type { ReactNode } from "react";
import { PortalHeader } from "../components/network/net-ui";

export default function PitchLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PortalHeader tagKey="net.pitch.tag" />
      {children}
    </>
  );
}
