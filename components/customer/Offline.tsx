"use client";
import { useEffect } from "react";

/** Registers the service worker that keeps the gullak, its fonts and its art usable with no network,
 *  then hands it the scripts and fonts this page already loaded so the next offline open has them. */
export function useOfflineShell() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (cancelled) return;
        const urls = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => u.startsWith(location.origin + "/_next/static/"));
        reg.active?.postMessage({ type: "gk-keep", urls: [...new Set(urls)] });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
}
