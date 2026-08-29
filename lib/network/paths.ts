/**
 * Route shape: the consumer app (/rewards…) keeps the phone-shaped shell;
 * everything else (landing, portals, investor, pitch) gets the wide shell.
 */
export function isWidePath(pathname: string): boolean {
  return !(pathname === "/rewards" || pathname.startsWith("/rewards/"));
}
