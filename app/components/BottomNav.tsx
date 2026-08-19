"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppMaybe } from "./AppProvider";

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  ),
  plan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2.2" fill="var(--page)" />
      <circle cx="15" cy="12" r="2.2" fill="var(--page)" />
      <circle cx="7" cy="18" r="2.2" fill="var(--page)" />
    </svg>
  ),
  grow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  ),
  goals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  ),
  one: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4Z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />
    </svg>
  ),
} as const;

const TABS: Array<{ href: string; label: string; icon: keyof typeof ICONS }> = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/plan", label: "Plan", icon: "plan" },
  { href: "/grow", label: "Grow", icon: "grow" },
  { href: "/goals", label: "Goals", icon: "goals" },
  { href: "/one", label: "ONE", icon: "one" },
];

export function BottomNav() {
  const pathname = usePathname();
  const state = useAppMaybe();
  if (!state || pathname.startsWith("/onboarding") || pathname.startsWith("/payday")) return null;
  return (
    <nav className="bottom-nav" aria-label="Main">
      <div className="bottom-nav-inner">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="nav-item" data-active={active} aria-current={active ? "page" : undefined}>
              {ICONS[tab.icon]}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
