/**
 * Static learner-facing display -> provenance mappings.
 *
 * This module deliberately does not import the React page or mutate the
 * provenance registry.  A mapping may be composite when one learner-facing
 * control combines several provenance rows.  An empty entryKeys array is an
 * explicit unresolved item; it is never silently guessed from a nearby name.
 */

export const LEARNER_DISPLAY_FAMILIES = Object.freeze([
  "sections",
  "surface",
  "free",
  "neurovascular",
  "blocks",
]);

export const LEARNER_BADGE_REPRESENTATIONS = Object.freeze([
  "manual-same-grid",
  "atlas-provisional",
  "image-guided-provisional",
  "image-guided-reviewed",
  "atlas-surface",
  "schematic-3d",
  "position-guide",
  "text-only",
  "not-recorded",
]);

/**
 * `free` is the surface workspace's multi-select mode.  The provenance
 * registry intentionally has no separate `free` learner surface, so free
 * observations must resolve through the registry's `surface` surface.
 */
export const LEARNER_SURFACE_BY_FAMILY = Object.freeze({
  sections: Object.freeze(["sections"]),
  surface: Object.freeze(["surface"]),
  free: Object.freeze(["surface"]),
  neurovascular: Object.freeze(["surface"]),
  blocks: Object.freeze(["blocks"]),
});

const BADGE_BY_REPRESENTATION = Object.freeze({
  "not-recorded": Object.freeze({label: "未収録", className: "provisional", rank: 0}),
  "schematic-3d": Object.freeze({label: "模式3D", className: "provisional", rank: 1}),
  "position-guide": Object.freeze({label: "位置目安", className: "provisional", rank: 1}),
  "image-guided-provisional": Object.freeze({label: "画像誘導・試作", className: "provisional", rank: 2}),
  "atlas-provisional": Object.freeze({label: "アトラス照合・試作", className: "provisional", rank: 2}),
  "image-guided-reviewed": Object.freeze({label: "画像誘導・プロジェクト採用", className: "source", rank: 3}),
  "manual-same-grid": Object.freeze({label: "同一格子・手動", className: "source", rank: 3}),
  "atlas-surface": Object.freeze({label: "脳表アトラス", className: "provisional", rank: 2}),
  "text-only": Object.freeze({label: "文章のみ", className: "provisional", rank: 1}),
});

function freezeMapping(target, family, entryKeys, options = {}) {
  // A composite can reuse rows whose learner surfaces differ (for example a
  // free pathway's surface overlay plus its block-projected radiation).  The
  // required surface list is therefore an allowed compatibility set: every
  // referenced row must intersect it, and the family's primary surface must
  // be present in the set.
  return Object.freeze({
    target,
    family,
    entryKeys: Object.freeze([...entryKeys]),
    composite: options.composite === true,
    requiredSurfaces: Object.freeze([...(options.requiredSurfaces ?? [])]),
    unresolvedTargetKeys: Object.freeze([...(options.unresolvedTargetKeys ?? [])]),
    unresolvedReason: options.unresolvedReason ?? null,
  });
}

function direct(target, family, entryKey, options = {}) {
  return freezeMapping(target, family, entryKey ? [entryKey] : [], options);
}

function unresolved(target, family, reason) {
  return freezeMapping(target, family, [], {
    requiredSurfaces: LEARNER_SURFACE_BY_FAMILY[family] ?? [],
    unresolvedReason: reason,
  });
}

const SECTION_COMPOSITE_ENTRY_KEYS = new Set([
  "section-ventricular-system",
  "section-caudate-putamen-accumbens",
  "section-pallidum-external-internal",
  "section-red-nucleus-substantia-nigra",
  "section-hippocampus-amygdala",
]);

const SURFACE_REGION_COMPOSITE_ENTRY_KEYS = new Set([
  "surface-precentral-postcentral",
  "surface-frontal-gyri",
  "surface-parieto-occipital-calcarine-sulci",
]);

const SURFACE_LANDMARK_COMPOSITE_ENTRY_KEYS = new Set([
  "surface-central-sulci",
  "surface-longitudinal-superior-frontal-sulci",
  "surface-parieto-occipital-calcarine-sulci",
]);

const BASAL_COMPOSITE_ENTRY_KEYS = new Set([
  "surface-pons-medulla",
  "surface-pyramids-olives",
  "section-colliculi",
]);

const BLOCK_COMPOSITE_ENTRY_KEYS = new Set([
  "section-ventricular-system",
  "section-caudate-putamen-accumbens",
  "section-hippocampus-amygdala",
  "section-radiations",
  "section-colliculi",
  "section-geniculate-bodies",
  "hindbrain-cerebellar-peduncles",
  "hindbrain-facial-colliculus-vestibular-area",
  "hindbrain-hypoglossal-vagal-trigones",
  "surface-pyramids-olives",
]);

const sectionEntryByKey = Object.freeze({
  ventricle: "section-ventricular-system",
  thirdVentricle: "section-ventricular-system",
  fourthVentricle: "section-ventricular-system",
  corpusCallosum: "section-corpus-callosum",
  internalCapsule: "section-internal-capsule",
  caudate: "section-caudate-putamen-accumbens",
  putamen: "section-caudate-putamen-accumbens",
  pallidumExternal: "section-pallidum-external-internal",
  pallidumInternal: "section-pallidum-external-internal",
  pallidum: "app-quiz-pallidum-combined",
  thalamus: "section-thalamus",
  hippocampus: "section-hippocampus-amygdala",
  amygdala: "section-hippocampus-amygdala",
  accumbens: "section-caudate-putamen-accumbens",
  redNucleus: "section-red-nucleus-substantia-nigra",
  substantiaNigra: "section-red-nucleus-substantia-nigra",
  subthalamic: "section-subthalamic-nucleus",
  brainstem: "surface-pons-medulla",
  cerebellum: "surface-cerebellar-hemispheres",
  mammillaryBody: "section-mammillary-bodies",
  insula: "section-insula",
});

const sectionMappings = Object.entries(sectionEntryByKey).map(([key, entryKey]) =>
  direct(`sections:structure:${key}`, "sections", entryKey, {
    composite: SECTION_COMPOSITE_ENTRY_KEYS.has(entryKey),
    requiredSurfaces: ["sections"],
  }),
);

const surfaceRegionEntryByKey = Object.freeze({
  precentral: "surface-precentral-postcentral",
  postcentral: "surface-precentral-postcentral",
  superiorFrontal: "surface-frontal-gyri",
  rostralMiddleFrontal: "app-surface-rostral-middle-frontal",
  caudalMiddleFrontal: "app-surface-caudal-middle-frontal",
  inferiorFrontal: "surface-frontal-gyri",
  parsOrbitalis: "app-surface-pars-orbitalis",
  superiorTemporal: "surface-superior-middle-temporal",
  middleTemporal: "app-surface-middle-temporal",
  inferiorTemporal: "app-surface-inferior-temporal",
  transverseTemporal: "app-surface-transverse-temporal",
  supramarginal: "app-surface-supramarginal",
  superiorParietal: "app-surface-superior-parietal",
  inferiorParietal: "app-surface-inferior-parietal",
  paracentral: "app-surface-paracentral",
  precuneus: "surface-parieto-occipital-calcarine-sulci",
  cuneus: "surface-parieto-occipital-calcarine-sulci",
  pericalcarine: "app-surface-pericalcarine",
  lingual: "app-surface-lingual",
  cingulate: "surface-cingulate",
  insula: "section-insula",
  parahippocampal: "app-surface-parahippocampal",
  entorhinal: "app-surface-entorhinal",
  fusiform: "app-quiz-fusiform",
  orbitofrontal: "app-surface-orbitofrontal",
  lateralOccipital: "app-surface-lateral-occipital",
});

export const LEARNER_SURFACE_REGION_KEYS = Object.freeze([
  "precentral", "postcentral", "superiorFrontal", "rostralMiddleFrontal",
  "caudalMiddleFrontal", "inferiorFrontal", "parsOrbitalis", "superiorTemporal",
  "middleTemporal", "inferiorTemporal", "transverseTemporal", "supramarginal",
  "superiorParietal", "inferiorParietal", "paracentral", "precuneus", "cuneus",
  "pericalcarine", "lingual", "fusiform", "parahippocampal", "entorhinal",
  "insula", "orbitofrontal", "lateralOccipital", "cingulate",
]);

const surfaceRegionMappings = LEARNER_SURFACE_REGION_KEYS.map(key => surfaceRegionEntryByKey[key]
  ? direct(`surface:region:${key}`, "surface", surfaceRegionEntryByKey[key], {
    composite: SURFACE_REGION_COMPOSITE_ENTRY_KEYS.has(surfaceRegionEntryByKey[key]),
    requiredSurfaces: ["surface"],
  })
  : unresolved(`surface:region:${key}`, "surface", "surface region is learner-visible but has no unique existing provenance row"));

const surfaceLandmarkEntryByKey = Object.freeze({
  "central-sulcus": "surface-central-sulci",
  "precentral-sulcus": "surface-central-sulci",
  "lateral-sulcus": "surface-lateral-sulcus",
  "superior-frontal-sulcus": "surface-longitudinal-superior-frontal-sulci",
  "parieto-occipital-sulcus": "surface-parieto-occipital-calcarine-sulci",
  "calcarine-sulcus": "surface-parieto-occipital-calcarine-sulci",
  "olfactory-sulcus": "surface-olfactory-sulcus",
  "longitudinal-fissure": "surface-longitudinal-superior-frontal-sulci",
});
export const LEARNER_SURFACE_LANDMARK_KEYS = Object.freeze(Object.keys(surfaceLandmarkEntryByKey));
const surfaceLandmarkMappings = LEARNER_SURFACE_LANDMARK_KEYS.map(key =>
  direct(`surface:landmark:${key}`, "surface", surfaceLandmarkEntryByKey[key], {
    composite: SURFACE_LANDMARK_COMPOSITE_ENTRY_KEYS.has(surfaceLandmarkEntryByKey[key]),
    requiredSurfaces: ["surface"],
  }),
);

const deepEntryByKey = Object.freeze({
  "corpus-callosum": "surface-deep-corpus-callosum",
  "septum-pellucidum": "section-septum-pellucidum",
  fornix: "surface-deep-fornix",
  thalami: "surface-deep-thalamus",
  hypothalamus: "surface-deep-hypothalamus",
});
export const LEARNER_SURFACE_DEEP_KEYS = Object.freeze(Object.keys(deepEntryByKey));
const deepMappings = LEARNER_SURFACE_DEEP_KEYS.map(key =>
  direct(`surface:deep:${key}`, "surface", deepEntryByKey[key], {requiredSurfaces: ["surface"]}),
);

const basalEntryByKey = Object.freeze({
  hypothalamus: "surface-deep-hypothalamus",
  infundibulum: "surface-infundibulum",
  perforated: "surface-anterior-perforated-substance",
  peduncles: "surface-cerebral-peduncle",
  "superior-colliculi": "section-colliculi",
  "inferior-colliculi": "section-colliculi",
  pons: "surface-pons-medulla",
  medulla: "surface-pons-medulla",
  pyramids: "surface-pyramids-olives",
  olives: "surface-pyramids-olives",
});
export const LEARNER_SURFACE_BASAL_KEYS = Object.freeze([
  "olfactory", "optic", "hypothalamus", "infundibulum", "perforated", "peduncles",
  "midbrain", "superior-colliculi", "inferior-colliculi", "pons", "medulla", "pyramids", "olives",
]);
const basalMappings = LEARNER_SURFACE_BASAL_KEYS.map(key => {
  if (key === "olfactory") {
    return freezeMapping("surface:basal:olfactory", "surface", [
      "surface-olfactory-bulb", "surface-olfactory-tract", "surface-olfactory-sulcus",
    ], {composite: true, requiredSurfaces: ["surface"]});
  }
  if (key === "optic") {
    return freezeMapping("surface:basal:optic", "surface", ["app-schematic-optic-nerve", "app-schematic-optic-chiasm"], {
      composite: true,
      requiredSurfaces: ["surface"],
    });
  }
  if (key === "midbrain") {
    return freezeMapping("surface:basal:midbrain", "surface", [
      "surface-cerebral-peduncle", "section-colliculi", "section-interpeduncular-fossa",
    ], {composite: true, requiredSurfaces: ["surface"]});
  }
  return direct(`surface:basal:${key}`, "surface", basalEntryByKey[key], {
    composite: BASAL_COMPOSITE_ENTRY_KEYS.has(basalEntryByKey[key]),
    requiredSurfaces: ["surface"],
  });
});

const neurovascularEntryByKey = Object.freeze({
  ica: "vascular-major-anterior-posterior-arteries",
  aca: "vascular-major-anterior-posterior-arteries",
  mca: "vascular-major-anterior-posterior-arteries",
  pca: "vascular-major-anterior-posterior-arteries",
  acomm: "vascular-communicating-arteries",
  pcomm: "vascular-communicating-arteries",
  vertebral: "vascular-vertebrobasilar-arteries",
  basilar: "vascular-vertebrobasilar-arteries",
  cerebellarArteries: "vascular-cerebellar-arteries",
  cn1: "cranial-nerves-one-to-twelve",
  cn3: "cranial-nerves-one-to-twelve",
  cn4: "cranial-nerves-one-to-twelve",
  cn5: "cranial-nerves-one-to-twelve",
  cn6: "cranial-nerves-one-to-twelve",
  cn7: "cranial-nerves-one-to-twelve",
  cn8: "cranial-nerves-one-to-twelve",
  cn9: "cranial-nerves-one-to-twelve",
  cn10: "cranial-nerves-one-to-twelve",
  cn11: "cranial-nerves-one-to-twelve",
  cn12: "cranial-nerves-one-to-twelve",
  cn2: "app-schematic-optic-nerve",
  opticChiasm: "app-schematic-optic-chiasm",
});
const NEUROVASCULAR_COMPOSITE_KEYS = new Set([
  "vascular-major-anterior-posterior-arteries",
  "vascular-communicating-arteries",
  "vascular-vertebrobasilar-arteries",
  "vascular-cerebellar-arteries",
  "cranial-nerves-one-to-twelve",
]);
export const LEARNER_NEUROVASCULAR_KEYS = Object.freeze([
  "ica", "aca", "acomm", "mca", "pcomm", "vertebral", "basilar", "pca", "cerebellarArteries",
  "cn1", "cn2", "opticChiasm", "cn3", "cn4", "cn5", "cn6", "cn7", "cn8", "cn9", "cn10", "cn11", "cn12",
]);
const neurovascularMappings = LEARNER_NEUROVASCULAR_KEYS.flatMap(key => {
  const composite = NEUROVASCULAR_COMPOSITE_KEYS.has(neurovascularEntryByKey[key]);
  return [
    direct(`neurovascular:${key}`, "neurovascular", neurovascularEntryByKey[key], {composite, requiredSurfaces: ["surface"]}),
    direct(`free:neuro:${key}`, "free", neurovascularEntryByKey[key], {composite, requiredSurfaces: ["surface"]}),
  ];
});

const freeRegionMappings = LEARNER_SURFACE_REGION_KEYS.map(key => {
  const entryKey = surfaceRegionEntryByKey[key];
  return entryKey
    ? direct(`free:region:${key}`, "free", entryKey, {
      composite: SURFACE_REGION_COMPOSITE_ENTRY_KEYS.has(entryKey),
      requiredSurfaces: ["surface"],
    })
    : unresolved(`free:region:${key}`, "free", "free observation exposes this surface region but no unique existing provenance row exists");
});
const freeLandmarkMappings = LEARNER_SURFACE_LANDMARK_KEYS.map(key =>
  direct(`free:landmark:${key}`, "free", surfaceLandmarkEntryByKey[key], {
    composite: SURFACE_LANDMARK_COMPOSITE_ENTRY_KEYS.has(surfaceLandmarkEntryByKey[key]),
    requiredSurfaces: ["surface"],
  }),
);
const freeDeepMappings = LEARNER_SURFACE_DEEP_KEYS.map(key =>
  direct(`free:deep:${key}`, "free", deepEntryByKey[key], {requiredSurfaces: ["surface"]}),
);
const freeBasalMappings = LEARNER_SURFACE_BASAL_KEYS.filter(key => key !== "olfactory" && key !== "optic").map(key => {
  const mapping = basalMappings.find(item => item.target === `surface:basal:${key}`);
  return freezeMapping(`free:basal:${key}`, "free", mapping.entryKeys, {
    composite: mapping.composite,
    requiredSurfaces: ["surface"],
    unresolvedTargetKeys: mapping.unresolvedTargetKeys,
    unresolvedReason: mapping.unresolvedReason,
  });
});

export const LEARNER_BLOCK_SPECIMEN_KEYS = Object.freeze([
  "lateral-ventricle", "diencephalon", "radiations", "commissural-system",
  "choroid-plexus", "medial-temporal", "midbrain-section", "hindbrain",
]);
export const LEARNER_BLOCK_LAYERS_BY_SPECIMEN = Object.freeze({
  "lateral-ventricle": ["ventricular-cavity", "caudate", "thalamus", "hippocampus"],
  diencephalon: ["thalami", "third-ventricle", "hypothalamus", "subthalamic-nuclei"],
  radiations: ["putamen", "pallidum-external", "pallidum-internal", "internal-capsule", "corona-radiata", "optic-radiation", "auditory-radiation"],
  "commissural-system": ["corpus-callosum", "lateral-ventricles", "fornix", "septum-pellucidum"],
  "choroid-plexus": ["ventricular-cavity", "choroid-plexus", "hippocampus"],
  "medial-temporal": ["hippocampus", "amygdala", "inferior-horn"],
  "midbrain-section": ["red-nuclei", "substantia-nigra", "aqueduct", "cerebral-peduncles", "superior-colliculi", "inferior-colliculi", "lateral-geniculate-bodies", "medial-geniculate-bodies", "interpeduncular-fossa"],
  hindbrain: ["fourth-ventricle", "superior-cerebellar-peduncles", "middle-cerebellar-peduncles", "inferior-cerebellar-peduncles", "facial-colliculi", "vestibular-areas", "hypoglossal-trigones", "vagal-trigones", "pyramids", "olives"],
});

const blockLayerEntryByKey = Object.freeze({
  "ventricular-cavity": "section-ventricular-system",
  caudate: "section-caudate-putamen-accumbens",
  thalamus: "section-thalamus",
  hippocampus: "section-hippocampus-amygdala",
  "choroid-plexus": "app-block-choroid-plexus",
  thalami: "section-thalamus",
  "third-ventricle": "section-ventricular-system",
  hypothalamus: "section-hypothalamus",
  "subthalamic-nuclei": "section-subthalamic-nucleus",
  putamen: "section-caudate-putamen-accumbens",
  "pallidum-external": "section-pallidum-external-internal",
  "pallidum-internal": "section-pallidum-external-internal",
  "internal-capsule": "section-internal-capsule",
  "corona-radiata": "section-radiations",
  "optic-radiation": "section-radiations",
  "auditory-radiation": "section-radiations",
  "corpus-callosum": "section-corpus-callosum",
  "lateral-ventricles": "section-ventricular-system",
  fornix: "section-fornix",
  "septum-pellucidum": "section-septum-pellucidum",
  amygdala: "section-hippocampus-amygdala",
  "inferior-horn": "section-ventricular-system",
  "red-nuclei": "section-red-nucleus-substantia-nigra",
  "substantia-nigra": "section-red-nucleus-substantia-nigra",
  aqueduct: "section-cerebral-aqueduct",
  "cerebral-peduncles": "surface-cerebral-peduncle",
  "superior-colliculi": "section-colliculi",
  "inferior-colliculi": "section-colliculi",
  "lateral-geniculate-bodies": "section-geniculate-bodies",
  "medial-geniculate-bodies": "section-geniculate-bodies",
  "interpeduncular-fossa": "section-interpeduncular-fossa",
  "fourth-ventricle": "section-ventricular-system",
  "superior-cerebellar-peduncles": "hindbrain-cerebellar-peduncles",
  "middle-cerebellar-peduncles": "hindbrain-cerebellar-peduncles",
  "inferior-cerebellar-peduncles": "hindbrain-cerebellar-peduncles",
  "facial-colliculi": "hindbrain-facial-colliculus-vestibular-area",
  "vestibular-areas": "hindbrain-facial-colliculus-vestibular-area",
  "hypoglossal-trigones": "hindbrain-hypoglossal-vagal-trigones",
  "vagal-trigones": "hindbrain-hypoglossal-vagal-trigones",
  pyramids: "surface-pyramids-olives",
  olives: "surface-pyramids-olives",
});

const blockLayerMappings = LEARNER_BLOCK_SPECIMEN_KEYS.flatMap(specimen => LEARNER_BLOCK_LAYERS_BY_SPECIMEN[specimen].map(layer => {
  const target = `blocks:layer:${specimen}:${layer}`;
  if (blockLayerEntryByKey[layer]) {
    const entryKey = blockLayerEntryByKey[layer];
    return direct(target, "blocks", entryKey, {
      composite: BLOCK_COMPOSITE_ENTRY_KEYS.has(entryKey),
      requiredSurfaces: ["blocks"],
    });
  }
  return unresolved(target, "blocks", "block layer is rendered but has no unique existing provenance row");
}));

const blockSpecimenMappings = LEARNER_BLOCK_SPECIMEN_KEYS.map(specimen => {
  const layerMappings = blockLayerMappings.filter(item => item.target.startsWith(`blocks:layer:${specimen}:`));
  const entryKeys = [...new Set(layerMappings.flatMap(item => item.entryKeys))];
  const unresolvedTargetKeys = layerMappings.filter(item => item.entryKeys.length === 0).map(item => item.target);
  return freezeMapping(`blocks:specimen:${specimen}`, "blocks", entryKeys, {
    composite: true,
    requiredSurfaces: ["blocks"],
    unresolvedTargetKeys,
    unresolvedReason: unresolvedTargetKeys.length ? "specimen contains one or more learner-visible layers without a provenance row" : null,
  });
});

const pathwayMappings = [
  freezeMapping("free:pathway:visual", "free", [
    "app-schematic-optic-nerve", "app-schematic-optic-chiasm", "surface-deep-thalamus", "section-thalamus", "section-radiations", "surface-parieto-occipital-calcarine-sulci", "app-surface-pericalcarine", "app-surface-lingual",
  ], {
    composite: true,
    requiredSurfaces: ["surface", "sections", "blocks"],
  }),
  freezeMapping("free:pathway:papez", "free", [
    "surface-deep-fornix", "surface-deep-thalamus", "section-hippocampus-amygdala", "section-mammillary-bodies", "section-thalamus", "surface-cingulate", "app-surface-parahippocampal", "app-surface-entorhinal",
  ], {
    composite: true,
    requiredSurfaces: ["surface", "sections"],
  }),
  freezeMapping("free:pathway:basal-ganglia", "free", [
    "surface-deep-thalamus", "section-thalamus", "section-caudate-putamen-accumbens", "section-pallidum-external-internal", "section-subthalamic-nucleus", "section-red-nucleus-substantia-nigra",
  ], {
    composite: true,
    requiredSurfaces: ["surface", "sections", "blocks"],
  }),
];

export const LEARNER_PROVENANCE_MAPPINGS = Object.freeze([
  ...sectionMappings,
  ...surfaceRegionMappings,
  ...surfaceLandmarkMappings,
  ...deepMappings,
  ...basalMappings,
  ...neurovascularMappings,
  ...freeRegionMappings,
  ...freeLandmarkMappings,
  ...freeDeepMappings,
  ...freeBasalMappings,
  ...blockLayerMappings,
  ...blockSpecimenMappings,
  ...pathwayMappings,
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function shortBadgeForEntry(entry) {
  if (!isRecord(entry) || !Array.isArray(entry.representations)) {
    return Object.freeze({label: "未対応", className: "provisional", representation: null, rank: 0});
  }
  const candidates = entry.representations
    .map(representation => BADGE_BY_REPRESENTATION[representation])
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
  const selected = candidates[0] ?? BADGE_BY_REPRESENTATION["not-recorded"];
  return Object.freeze({
    label: selected.label,
    className: selected.className,
    representation: entry.representations.find(value => BADGE_BY_REPRESENTATION[value]?.label === selected.label) ?? null,
    rank: selected.rank,
  });
}

export function shortBadgeForEntries(entries) {
  const badges = (Array.isArray(entries) ? entries : []).map(shortBadgeForEntry);
  return badges.sort((left, right) => left.rank - right.rank)[0] ?? shortBadgeForEntry(null);
}

/**
 * Resolve the static mapping against the supplied registry without changing
 * either the mapping or registry. Unresolved mappings are returned as such so
 * audits can report them instead of manufacturing a provenance claim.
 */
export function deriveLearnerProvenanceDisplay(registry, mappings = LEARNER_PROVENANCE_MAPPINGS) {
  if (!isRecord(registry) || !Array.isArray(registry.entries)) {
    throw new Error("learner provenance display requires a registry with entries");
  }
  const entriesByKey = new Map(registry.entries.filter(isRecord).map(entry => [entry.key, entry]));
  return mappings.map(mapping => {
    const entries = mapping.entryKeys.map(key => entriesByKey.get(key)).filter(Boolean);
    const missingEntryKeys = mapping.entryKeys.filter(key => !entriesByKey.has(key));
    const unresolved = mapping.entryKeys.length === 0 || missingEntryKeys.length > 0 || mapping.unresolvedTargetKeys.length > 0;
    return Object.freeze({
      ...mapping,
      entries: Object.freeze(entries),
      missingEntryKeys: Object.freeze(missingEntryKeys),
      unresolved,
      badge: shortBadgeForEntries(entries),
    });
  });
}

export function mappingTargetSet(mappings = LEARNER_PROVENANCE_MAPPINGS) {
  return new Set(mappings.map(mapping => mapping.target));
}
