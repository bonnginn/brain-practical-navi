export function registerPwaServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const baseUrl = import.meta.env.BASE_URL;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${baseUrl}service-worker.js`, { scope: baseUrl }).catch(() => {
      // Offline support is progressive enhancement; registration failure must not break the app.
    });
  }, { once: true });
}
