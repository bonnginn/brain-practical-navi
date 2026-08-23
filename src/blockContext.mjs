export const BLOCK_CONTEXT_SPECIMENS = Object.freeze([
  "lateral-ventricle", "diencephalon", "radiations", "commissural-system",
  "choroid-plexus", "medial-temporal", "midbrain-section", "hindbrain",
]);
const supportedSpecimens = new Set(BLOCK_CONTEXT_SPECIMENS);
export function isBlockContextSpecimen(specimen) { return supportedSpecimens.has(specimen); }

export const BLOCK_CONTEXT_INITIAL_STATE = Object.freeze({
  enabled: false,
  view: "whole",
});

function normalizedState(state) {
  const current = state && typeof state === "object" ? state : {};
  return {
    ...current,
    enabled: current.enabled === true,
    view: current.view === "section" ? "section" : "whole",
  };
}

/**
 * Create the isolated context state. Extra fields are intentionally retained
 * so tests and callers can prove that context actions do not mutate specimen
 * rotation, layer, or tissue state.
 */
export function createBlockContextState(overrides = {}) {
  return normalizedState({...BLOCK_CONTEXT_INITIAL_STATE, ...overrides});
}

/**
 * Pure state transitions for the configured block-specimen contexts.
 * Route/specimen entry always starts OFF; the context is opt-in only.
 */
export function transitionBlockContext(state, event = {}) {
  const current = normalizedState(state);
  switch (event?.type) {
    case "toggle":
      return {
        ...current,
        enabled: isBlockContextSpecimen(event.specimen) ? !current.enabled : false,
      };
    case "set-enabled":
      return {
        ...current,
        enabled: event.enabled === true && isBlockContextSpecimen(event.specimen),
      };
    case "set-view":
      return {...current, view: event.view === "section" ? "section" : "whole"};
    case "close":
    case "leave-workspace":
    case "restore-route":
    case "enter-workspace":
    case "select-specimen":
      return {...current, enabled: false, view: "whole"};
    default:
      return current;
  }
}

export function shouldRenderBlockContext({workspace, specimen, state, enabled} = {}) {
  const contextEnabled = state && typeof state === "object" ? state.enabled === true : enabled === true;
  return workspace === "blocks" && isBlockContextSpecimen(specimen) && contextEnabled;
}
