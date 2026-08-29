"use client";

import type { ReactNode } from "react";
import { PortalHeader } from "../components/network/net-ui";

export default function InstitutionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PortalHeader tagKey="net.institution.tag" />
      {children}
    </>
  );
}
