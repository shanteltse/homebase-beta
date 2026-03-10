/**
 * Registers the service worker for PWA / offline support.
 * Only registers in production to avoid caching issues during development.
 */
export function registerServiceWorker(): void {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    process.env.NODE_ENV !== "production"
  ) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Registered with scope:", registration.scope);

        // Check for updates periodically
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        ); // every hour
      })
      .catch((error) => {
        console.error("[SW] Registration failed:", error);
      });
  });
}
