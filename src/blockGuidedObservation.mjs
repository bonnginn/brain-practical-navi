/**
 * A small, learner-facing layer walkthrough for the four beta-focus block
 * specimens. The walkthrough never owns specimen geometry or provenance: all
 * step text and source values are derived from the existing lesson layers.
 */

export const BLOCK_GUIDED_SPECIMEN_KEYS = Object.freeze([
  "lateral-ventricle",
  "radiations",
  "choroid-plexus",
  "medial-temporal",
]);

const EMPTY_GUIDED_STATE = Object.freeze({
  active: false,
  specimenKey: null,
  steps: Object.freeze([]),
  stageIndex: 0,
  savedLayers: Object.freeze([]),
  restoredLayers: Object.freeze([]),
});

function exactArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function normalizeLayers(layers) {
  if (!Array.isArray(layers)) throw new Error("guided observation requires existing specimen layers");
  const normalized = layers.map(layer => ({
    key: layer?.key,
    name: layer?.name,
    note: layer?.note,
    source: layer?.source,
  }));
  if (normalized.some(layer => typeof layer.key !== "string" || layer.key.trim() === "" || typeof layer.name !== "string" || layer.name.trim() === "" || typeof layer.note !== "string" || layer.note.trim() === "" || typeof layer.source !== "string" || layer.source.trim() === "")) {
    throw new Error("guided observation layers must provide existing key, name, note, and source fields");
  }
  if (new Set(normalized.map(layer => layer.key)).size !== normalized.length) throw new Error("guided observation layers must have unique keys");
  if (normalized.length === 0) throw new Error("guided observation requires at least one existing layer");
  return normalized;
}

function finalStep(layers) {
  return {
    key: "all",
    layerKeys: layers.map(layer => layer.key),
    name: layers.map(layer => layer.name).join("・"),
    note: layers.map(layer => layer.note).join(" "),
    source: [...new Set(layers.map(layer => layer.source))].join("・"),
    final: true,
  };
}

/** Derive one single-layer step and one final all-layer step from a lesson. */
export function deriveBlockGuidedSteps(specimenKey, layers) {
  if (!BLOCK_GUIDED_SPECIMEN_KEYS.includes(specimenKey)) throw new Error(`guided observation is limited to beta-focus specimens: ${specimenKey}`);
  const normalized = normalizeLayers(layers);
  const singleSteps = normalized.map(layer => ({
    key: layer.key,
    layerKeys: [layer.key],
    name: layer.name,
    note: layer.note,
    source: layer.source,
    final: false,
  }));
  return Object.freeze([...singleSteps, finalStep(normalized)].map(step => Object.freeze({
    ...step,
    layerKeys: Object.freeze([...step.layerKeys]),
  })));
}

export function createBlockGuidedState() {
  return {
    ...EMPTY_GUIDED_STATE,
    steps: [],
    savedLayers: [],
    restoredLayers: [],
  };
}

/** Save the manual layer selection and start at the first single-layer step. */
export function startBlockGuidedObservation({specimenKey, layers, currentLayers = []} = {}) {
  const steps = deriveBlockGuidedSteps(specimenKey, layers);
  const savedLayers = Array.isArray(currentLayers) ? [...currentLayers] : [];
  return {
    active: true,
    specimenKey,
    steps,
    stageIndex: 0,
    savedLayers,
    restoredLayers: [],
  };
}

export function guidedStepLayers(state) {
  if (!state?.active || !Array.isArray(state.steps) || !state.steps[state.stageIndex]) return [];
  return [...state.steps[state.stageIndex].layerKeys];
}

export function moveBlockGuidedObservation(state, delta) {
  if (!state?.active || !Array.isArray(state.steps) || state.steps.length === 0) return state;
  const last = state.steps.length - 1;
  const next = Math.max(0, Math.min(last, state.stageIndex + (Number(delta) || 0)));
  return {...state, stageIndex: next, restoredLayers: []};
}

export function firstBlockGuidedObservation(state) {
  return moveBlockGuidedObservation(state, -Number.MAX_SAFE_INTEGER);
}

/** Stop the guide and return the manual layer selection captured at start. */
export function finishBlockGuidedObservation(state) {
  if (!state?.active) return {...createBlockGuidedState(), restoredLayers: [...(state?.restoredLayers ?? [])]};
  return {
    ...createBlockGuidedState(),
    restoredLayers: [...(state.savedLayers ?? [])],
  };
}

export const cleanupBlockGuidedObservation = finishBlockGuidedObservation;

/**
 * Validate that every step is derived from the existing layer records and that
 * only the final step displays all layers.
 */
export function validateBlockGuidedSteps({specimenKey, layers, steps} = {}) {
  const errors = [];
  if (!BLOCK_GUIDED_SPECIMEN_KEYS.includes(specimenKey)) errors.push(`specimen ${specimenKey} is outside the beta-focus guide`);
  let normalized = [];
  try { normalized = normalizeLayers(layers); }
  catch (error) { errors.push(error.message); }
  if (!Array.isArray(steps) || steps.length !== normalized.length + 1) errors.push("steps must contain one step per existing layer plus one final all-layer step");
  const actualSteps = Array.isArray(steps) ? steps : [];
  const singles = actualSteps.slice(0, normalized.length);
  singles.forEach((step, index) => {
    const layer = normalized[index];
    if (!layer) return;
    if (!exactArray(step?.layerKeys, [layer.key])) errors.push(`step ${index + 1} must display exactly one existing layer`);
    if (step?.key !== layer.key || step?.name !== layer.name || step?.note !== layer.note || step?.source !== layer.source || step?.final !== false) errors.push(`step ${index + 1} must be derived from existing layer ${layer.key}`);
  });
  const final = actualSteps.at(-1);
  const expectedKeys = normalized.map(layer => layer.key);
  const expectedFinal = normalized.length > 0 ? finalStep(normalized) : null;
  if (!final || final.final !== true || final.key !== "all" || !exactArray(final.layerKeys, expectedKeys)) errors.push("final step must display all existing layers in existing order");
  if (expectedFinal && (final?.name !== expectedFinal.name || final?.note !== expectedFinal.note || final?.source !== expectedFinal.source)) errors.push("final step text must be derived from all existing layers");
  if (actualSteps.some(step => step?.key === "opticChiasm" || step?.key === "33")) errors.push("guided observation cannot introduce optic or legacy targets");
  return {
    ok: errors.length === 0,
    errors,
    summary: {
      specimenKey,
      layerCount: normalized.length,
      stepCount: actualSteps.length,
      singleStepKeys: singles.map(step => step?.key),
      finalLayerKeys: final?.layerKeys ?? [],
    },
  };
}
