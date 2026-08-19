/** Pure date helpers for the engine. Dates are ISO strings (yyyy-mm-dd) in local terms. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

/** Next occurrence of a payday day-of-month strictly after `todayISO` (same day counts as payday today). */
export function nextPayday(todayISO: string, paydayDayOfMonth: number): string {
  const today = parseISODate(todayISO);
  const candidate = new Date(today.getFullYear(), today.getMonth(), paydayDayOfMonth);
  if (candidate.getTime() <= today.getTime()) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return toISODate(candidate);
}

export function daysUntilNextPayday(todayISO: string, paydayDayOfMonth: number): number {
  return daysBetween(todayISO, nextPayday(todayISO, paydayDayOfMonth));
}

export function monthsBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}
