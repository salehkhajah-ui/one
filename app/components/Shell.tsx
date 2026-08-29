"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isWidePath } from "../../lib/network/paths";

/** Phone-shaped column for the consumer app, wide dashboard column elsewhere. */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className={isWidePath(pathname) ? "shell shell-wide" : "shell"}>{children}</div>;
}
