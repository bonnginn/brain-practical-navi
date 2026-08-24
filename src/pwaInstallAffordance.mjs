const DEFAULT_MEDIA_QUERY = "(display-mode: standalone)";

function defaultWindowLike() {
  return typeof globalThis !== "undefined" && globalThis.window ? globalThis.window : null;
}

function callSafely(callback, fallback = undefined) {
  try {
    return callback();
  } catch {
    return fallback;
  }
}

/**
 * Detect an already-installed/display-mode-standalone application without
 * touching storage or making any network call.
 */
export function isPwaStandalone(windowLike = defaultWindowLike()) {
  if (!windowLike) return false;
  const mediaStandalone = Boolean(callSafely(
    () => windowLike.matchMedia?.(DEFAULT_MEDIA_QUERY)?.matches,
    false,
  ));
  const iosStandalone = windowLike.navigator?.standalone === true;
  return mediaStandalone || iosStandalone;
}

function copyState(state) {
  return Object.freeze({ ...state });
}

/**
 * A small, browser-boundary adapter for the install prompt. The browser
 * event is captured but never prompted until requestInstall() is called.
 * The window-like dependency is injectable so SSR and deterministic tests do
 * not need a DOM.
 */
export function createPwaInstallAffordance(options = {}) {
  const windowLike = options.windowLike === undefined ? defaultWindowLike() : options.windowLike;
  const onChange = typeof options.onChange === "function" ? options.onChange : null;
  const supported = Boolean(windowLike?.addEventListener && windowLike?.removeEventListener);
  let mounted = false;
  let installed = isPwaStandalone(windowLike);
  let deferredEvent = null;
  let activeRequest = null;

  const state = () => copyState({
    supported,
    mounted,
    installed,
    eventPending: Boolean(deferredEvent),
    canInstall: !installed && Boolean(deferredEvent),
    promptInFlight: Boolean(activeRequest),
  });

  const publish = () => {
    if (!onChange) return;
    try {
      onChange(state());
    } catch {
      // Observers must not be able to break install-state handling.
    }
  };

  const handleBeforeInstallPrompt = event => {
    // Always cancel the browser's automatic prompt. The explicit UI action
    // below is the only place that calls event.prompt().
    callSafely(() => event?.preventDefault?.());
    if (installed || deferredEvent || activeRequest || !event) return;
    deferredEvent = event;
    publish();
  };

  const handleAppInstalled = () => {
    installed = true;
    deferredEvent = null;
    publish();
  };

  function mount() {
    if (mounted || !supported) return state();
    windowLike.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    windowLike.addEventListener("appinstalled", handleAppInstalled);
    mounted = true;
    publish();
    return state();
  }

  function cleanup() {
    if (!mounted) return;
    windowLike.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    windowLike.removeEventListener("appinstalled", handleAppInstalled);
    mounted = false;
    // Do not retain a browser event across an unmount. A later mount can
    // capture a fresh event and will never register duplicate listeners.
    deferredEvent = null;
  }

  function requestInstall() {
    if (activeRequest) return activeRequest;
    if (installed) return Promise.resolve(Object.freeze({ status: "already-installed" }));
    if (!deferredEvent) return Promise.resolve(Object.freeze({ status: "unavailable" }));

    const event = deferredEvent;
    deferredEvent = null;
    activeRequest = (async () => {
      try {
        await event.prompt();
        const choice = await event.userChoice;
        const outcome = choice?.outcome === "accepted" ? "accepted" : "dismissed";
        return Object.freeze({ status: outcome, outcome: choice?.outcome ?? outcome });
      } catch (error) {
        return Object.freeze({ status: "error", error });
      } finally {
        // A BeforeInstallPromptEvent is single-use even when prompt() fails.
        activeRequest = null;
        publish();
      }
    })();
    publish();
    return activeRequest;
  }

  return Object.freeze({
    mount,
    cleanup,
    destroy: cleanup,
    requestInstall,
    getState: state,
  });
}
