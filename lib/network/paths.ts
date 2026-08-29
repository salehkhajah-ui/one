/**
 * Route ownership: which paths belong to the Financial Moment Network
 * surfaces vs the original allocation app. Used by the app chrome (shell
 * width, first-run gate, bottom nav) so the two products coexist cleanly.
 */

const NETWORK_PREFIXES = ["/network", "/rewards", "/merchant", "/institution", "/admin", "/investor", "/pitch"];

/** Wide, desktop-friendly surfaces (portals, landing, pitch, investor). */
const WIDE_PREFIXES = ["/network", "/merchant", "/institution", "/admin", "/investor", "/pitch"];

export function isNetworkPath(pathname: string): boolean {
  return NETWORK_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Consumer surface keeps the phone shell; portals get a wide shell. */
export function isWideNetworkPath(pathname: string): boolean {
  return WIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
