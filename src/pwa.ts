let updateAvailable = false;
const updateListeners = new Set<() => void>();
export const getPwaUpdateAvailable = () => updateAvailable;
export function subscribePwaUpdates(listener: () => void): () => void {
  updateListeners.add(listener);
  return () => { updateListeners.delete(listener); };
}
function publishUpdate(available: boolean): void {
  if (available === updateAvailable) return;
  updateAvailable = available;
  updateListeners.forEach(listener => listener());
}

export function registerPwaServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const baseUrl = import.meta.env.BASE_URL;
  const register = () => {
    navigator.serviceWorker.register(`${baseUrl}service-worker.js`, { scope: baseUrl }).then(registration => {
      const refresh = () => publishUpdate(!!registration.waiting && !!navigator.serviceWorker.controller);
      const watchInstalling = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", refresh);
      };
      refresh();
      watchInstalling();
      registration.addEventListener("updatefound", watchInstalling);
      navigator.serviceWorker.addEventListener("controllerchange", refresh);
    }).catch(() => {
      // Offline support is progressive enhancement; registration failure must not break the app.
    });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
