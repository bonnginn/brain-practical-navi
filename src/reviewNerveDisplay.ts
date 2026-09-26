const FOREBRAIN_TARGETS = new Set(["cn1", "cn2", "opticChiasm"]);

// Keep each review view focused on nerves that can be located against the
// opaque anatomy shown there. IX–XI remain available in observation, but
// their schematic proximal courses are not assessed in review exercises.
const HIDDEN_FOR_FOREBRAIN = Object.freeze(Array.from({length: 20}, (_, index) => index + 26));
const HIDDEN_FOR_BRAINSTEM = Object.freeze([21, 22, 23, 24, 25, 38, 39, 40, 41, 42, 43]);

export function reviewNerveDisplay(target: string) {
  const forebrain = FOREBRAIN_TARGETS.has(target);
  return {
    showCerebralHemispheres: forebrain,
    hiddenNerveIds: forebrain ? HIDDEN_FOR_FOREBRAIN : HIDDEN_FOR_BRAINSTEM,
  };
}
