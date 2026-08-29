"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isWideNetworkPath } from "../../lib/network/paths";

/**
 * Layout shell: the allocation app and network consumer surface get the
 * phone-shaped column; network portals (merchant/institution/admin/investor)
 * widen to a desktop dashboard column.
 */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className={isWideNetworkPath(pathname) ? "shell shell-wide" : "shell"}>{children}</div>;
}
