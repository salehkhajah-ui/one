"use client";

import { useEffect } from "react";

/** Registers the minimal service worker that makes ONE installable (and share-target capable on Android). */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* non-fatal: the app works fine without it */
      });
    }
  }, []);
  return null;
}
