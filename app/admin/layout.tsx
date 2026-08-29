"use client";

import type { ReactNode } from "react";
import { PortalHeader } from "../components/network/net-ui";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PortalHeader tagKey="net.admin.tag" />
      {children}
    </>
  );
}
