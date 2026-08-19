/* Minimal service worker: enables installability + the Android share target.
   Deliberately no caching yet — financial data must never look fresher than it is. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  /* network passthrough */
});
