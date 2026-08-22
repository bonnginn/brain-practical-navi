import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  LEARNER_PROVENANCE_MAPPINGS,
  LEARNER_BLOCK_LAYERS_BY_SPECIMEN,
  LEARNER_BLOCK_SPECIMEN_KEYS,
  LEARNER_DISPLAY_FAMILIES,
  deriveLearnerProvenanceDisplay,
} from "../src/learnerProvenance.mjs";
import { auditLearnerProvenance, validateBadge, validatePathwayPresetMappings } from "../scripts/audit_learner_provenance.mjs";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(await readFile(new URL("public/atlas/structure-provenance.json", root), "utf8"));
const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");

function parsePathwayPresets(source) {
  const block = source.match(/const pathwayPresets:Record<PathwayPresetKey,PathwayPreset>=\{(?<body>[\s\S]*?)\n\};/);
  assert.ok(block, "pathwayPresets source block must exist");
  const quoteList = value => [...value.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  return [...block.groups.body.matchAll(/(?:^|,)\s*(?:"(?<quoted>[^"]+)"|(?<bare>[A-Za-z][A-Za-z0-9-]*)):\{[\s\S]*?freeKeys:\[(?<free>[^\]]*)\],sectionKeys:\[(?<sections>[^\]]*)\]/g)]
    .map(match => ({
      key: match.groups.quoted ?? match.groups.bare,
      freeKeys: quoteList(match.groups.free),
      sectionKeys: quoteList(match.groups.sections),
    }));
}

function cloneRegistry() {
  return structuredClone(registry);
}

test("learner provenance audit resolves visible target inventories and reports only explicit gaps", () => {
  const report = auditLearnerProvenance({registry});
  assert.equal(report.ok, true, report.errors.join("; "));
  assert.equal(report.summary.entryCount, 75);
  assert.equal(report.summary.mappingCount, 222);
  assert.equal(report.summary.displayCount, 222);
  assert.equal(report.summary.resolvedCount, 222);
  assert.equal(report.summary.resolvedDisplayCount, 222);
  assert.equal(report.summary.unresolvedCount, 0);
  assert.equal(report.summary.unresolvedDisplayCount, 0);
  assert.equal(report.summary.leafGapCount, 0);
  assert.equal(report.summary.unresolvedLeafGapCount, 0);
  assert.equal(report.summary.aggregateUnresolvedCount, 0);
  assert.deepEqual(report.summary.unresolvedTargets, []);
  assert.equal(report.summary.blockSpecimenCount, 8);
  assert.equal(report.summary.blockLayerCount, Object.values(LEARNER_BLOCK_LAYERS_BY_SPECIMEN).flat().length);
  assert.deepEqual(Object.keys(report.summary.familyCounts).sort(), [...LEARNER_DISPLAY_FAMILIES].sort());
  assert.equal(new Set(LEARNER_PROVENANCE_MAPPINGS.map(mapping => mapping.target)).size, LEARNER_PROVENANCE_MAPPINGS.length);
});

test("P1 learner surfaces resolve to the app-only registry rows", () => {
  const displays = new Map(deriveLearnerProvenanceDisplay(registry).map(display => [display.target, display]));
  const appSurfaceEntries = {
    rostralMiddleFrontal: "app-surface-rostral-middle-frontal",
    caudalMiddleFrontal: "app-surface-caudal-middle-frontal",
    parsOrbitalis: "app-surface-pars-orbitalis",
    middleTemporal: "app-surface-middle-temporal",
    inferiorTemporal: "app-surface-inferior-temporal",
    transverseTemporal: "app-surface-transverse-temporal",
    supramarginal: "app-surface-supramarginal",
    superiorParietal: "app-surface-superior-parietal",
    inferiorParietal: "app-surface-inferior-parietal",
    paracentral: "app-surface-paracentral",
    pericalcarine: "app-surface-pericalcarine",
    lingual: "app-surface-lingual",
    parahippocampal: "app-surface-parahippocampal",
    entorhinal: "app-surface-entorhinal",
    orbitofrontal: "app-surface-orbitofrontal",
    lateralOccipital: "app-surface-lateral-occipital",
  };
  for (const [key, entryKey] of Object.entries(appSurfaceEntries)) {
    for (const family of ["surface", "free"]) {
      const display = displays.get(`${family}:region:${key}`);
      assert.ok(display, `${family}:region:${key}`);
      assert.deepEqual(display.entryKeys, [entryKey]);
      assert.deepEqual(display.entries.map(entry => entry.key), [entryKey]);
    }
  }
});

test("P1 block and pathway mappings avoid the legacy or combined fallback rows", () => {
  const displays = new Map(deriveLearnerProvenanceDisplay(registry).map(display => [display.target, display]));
  assert.deepEqual(displays.get("blocks:layer:choroid-plexus:choroid-plexus").entryKeys, ["app-block-choroid-plexus"]);
  assert.deepEqual(displays.get("blocks:layer:medial-temporal:inferior-horn").entryKeys, ["section-ventricular-system"]);
  assert.deepEqual(displays.get("surface:basal:optic").entryKeys, ["app-schematic-optic-nerve", "app-schematic-optic-chiasm"]);
  assert.equal(displays.get("surface:basal:optic").entryKeys.includes("visual-pathway-legacy-optic-label"), false);

  for (const target of ["neurovascular:opticChiasm", "free:neuro:opticChiasm"]) {
    const display = displays.get(target);
    assert.deepEqual(display.entryKeys, ["app-schematic-optic-chiasm"]);
    assert.equal(display.entryKeys.includes("visual-pathway-legacy-optic-label"), false);
  }
  for (const target of ["neurovascular:cn2", "free:neuro:cn2"]) {
    const display = displays.get(target);
    assert.deepEqual(display.entryKeys, ["app-schematic-optic-nerve"]);
    assert.equal(display.entryKeys.includes("visual-pathway-legacy-optic-label"), false);
  }

  const papez = displays.get("free:pathway:papez");
  assert.ok(papez.entryKeys.includes("section-hippocampus-amygdala"));
  const basalGanglia = displays.get("free:pathway:basal-ganglia");
  assert.ok(basalGanglia.entryKeys.includes("section-pallidum-external-internal"));
  assert.equal(basalGanglia.entryKeys.includes("app-quiz-pallidum-combined"), false);
});

test("every pathway preset freeKeys and sectionKeys resolve through learner provenance leaf mappings", () => {
  const mappings = new Map(LEARNER_PROVENANCE_MAPPINGS.map(mapping => [mapping.target, mapping]));
  for (const pathway of parsePathwayPresets(pageSource)) {
    const aggregate = mappings.get(`free:pathway:${pathway.key}`);
    assert.ok(aggregate, `missing pathway mapping: ${pathway.key}`);
    const leafTargets = [
      ...pathway.freeKeys.map(key => `free:${key}`),
      ...pathway.sectionKeys.map(key => `sections:structure:${key}`),
    ];
    for (const leafTarget of leafTargets) {
      const leaf = mappings.get(leafTarget);
      assert.ok(leaf, `${pathway.key}: missing leaf mapping ${leafTarget}`);
      assert.ok(leaf.entryKeys.length > 0, `${pathway.key}: unresolved leaf mapping ${leafTarget}`);
      assert.deepEqual(leaf.unresolvedTargetKeys, [], `${pathway.key}: aggregate leaf gap ${leafTarget}`);
      for (const entryKey of leaf.entryKeys) {
        assert.ok(aggregate.entryKeys.includes(entryKey), `${pathway.key}: aggregate missing ${entryKey} from ${leafTarget}`);
      }
    }
  }
});

test("aggregate unresolved displays do not inflate the distinct leaf-gap count", () => {
  const mappings = structuredClone(LEARNER_PROVENANCE_MAPPINGS);
  const leafTarget = "blocks:layer:choroid-plexus:choroid-plexus";
  const aggregateTarget = "blocks:specimen:choroid-plexus";
  const leaf = mappings.find(mapping => mapping.target === leafTarget);
  const aggregate = mappings.find(mapping => mapping.target === aggregateTarget);
  leaf.entryKeys = [];
  leaf.unresolvedReason = "synthetic regression gap";
  aggregate.unresolvedTargetKeys = [leafTarget];
  aggregate.unresolvedReason = "synthetic aggregate gap";

  const report = auditLearnerProvenance({registry, mappings});
  assert.equal(report.ok, true, report.errors.join("; "));
  assert.equal(report.summary.unresolvedCount, 2);
  assert.equal(report.summary.resolvedCount, 220);
  assert.equal(report.summary.leafGapCount, 1);
  assert.equal(report.summary.unresolvedLeafGapCount, 1);
  assert.equal(report.summary.aggregateUnresolvedCount, 1);
  assert.deepEqual(report.summary.unresolvedTargets.sort(), [aggregateTarget, leafTarget].sort());
});

test("every mapping is stable, namespaced, surface-compatible, and immutable", () => {
  const displays = deriveLearnerProvenanceDisplay(registry);
  assert.equal(displays.length, LEARNER_PROVENANCE_MAPPINGS.length);
  for (const mapping of displays) {
    assert.match(mapping.target, /^(sections|surface|free|neurovascular|blocks):[^:]+/);
    const primarySurface = ["free", "neurovascular"].includes(mapping.family) ? "surface" : mapping.family;
    assert.ok(mapping.requiredSurfaces.includes(primarySurface));
    if (mapping.entryKeys.length > 1) assert.equal(mapping.composite, true, mapping.target);
    for (const entry of mapping.entries) {
      assert.ok(entry.learnerSurfaces.some(surface => mapping.requiredSurfaces.includes(surface)), mapping.target);
      assert.equal(entry.expertReview, registry.entries.find(candidate => candidate.key === entry.key).expertReview);
    }
    if (mapping.unresolved) assert.ok(mapping.unresolvedReason, mapping.target);
  }
});

test("anomaly audit rejects duplicate targets and missing provenance entries", () => {
  const duplicate = [...LEARNER_PROVENANCE_MAPPINGS, LEARNER_PROVENANCE_MAPPINGS[0]];
  const duplicateReport = auditLearnerProvenance({registry, mappings: duplicate});
  assert.equal(duplicateReport.ok, false);
  assert.match(duplicateReport.errors.join("\n"), /duplicate learner target/);

  const missing = structuredClone(LEARNER_PROVENANCE_MAPPINGS);
  missing[0].entryKeys = ["does-not-exist"];
  missing[0].composite = false;
  const missingReport = auditLearnerProvenance({registry, mappings: missing});
  assert.equal(missingReport.ok, false);
  assert.match(missingReport.errors.join("\n"), /provenance entry does not exist/);
});

test("anomaly audit rejects incompatible learner surfaces, implicit composites, and drawn not-recorded entries", () => {
  const incompatible = structuredClone(LEARNER_PROVENANCE_MAPPINGS);
  incompatible[0].requiredSurfaces = ["blocks"];
  const incompatibleReport = auditLearnerProvenance({registry, mappings: incompatible});
  assert.equal(incompatibleReport.ok, false);
  assert.match(incompatibleReport.errors.join("\n"), /requiredSurfaces must include/);

  const implicitComposite = structuredClone(LEARNER_PROVENANCE_MAPPINGS);
  implicitComposite[0].entryKeys = ["section-ventricular-system", "section-thalamus"];
  implicitComposite[0].composite = false;
  const implicitReport = auditLearnerProvenance({registry, mappings: implicitComposite});
  assert.equal(implicitReport.ok, false);
  assert.match(implicitReport.errors.join("\n"), /multiple provenance entries require composite/);

  const notRecorded = cloneRegistry();
  notRecorded.entries.push({
    key: "synthetic-not-recorded",
    representations: ["not-recorded"],
    learnerSurfaces: [],
    expertReview: "pending",
  });
  const drawn = structuredClone(LEARNER_PROVENANCE_MAPPINGS);
  drawn.push({
    target: "surface:synthetic-not-recorded",
    family: "surface",
    entryKeys: ["synthetic-not-recorded"],
    composite: false,
    requiredSurfaces: ["surface"],
    unresolvedTargetKeys: [],
    unresolvedReason: null,
  });
  const drawnReport = auditLearnerProvenance({registry: notRecorded, mappings: drawn});
  assert.equal(drawnReport.ok, false);
  assert.match(drawnReport.errors.join("\n"), /no drawn learner representation/);
});

test("ID33 stays surface-only and IDs 39/40 stay expert-pending without hidden block targets", () => {
  const legacy = registry.entries.find(entry => entry.legacyIds?.includes(33));
  assert.ok(legacy);
  assert.equal(legacy.excludedFromSectionAndQuizTargets, true);
  assert.equal(legacy.expertReview, "pending");
  const legacyTargets = LEARNER_PROVENANCE_MAPPINGS.filter(mapping => mapping.entryKeys.includes(legacy.key));
  assert.equal(legacyTargets.length, 0);

  const mammillary = registry.entries.find(entry => entry.labelIds?.join(",") === "39,40");
  assert.ok(mammillary);
  assert.equal(mammillary.expertReview, "pending");
  assert.equal(mammillary.projectReview, "reviewed-by-project");
  const mammillaryTargets = LEARNER_PROVENANCE_MAPPINGS.filter(mapping => mapping.entryKeys.includes(mammillary.key));
  assert.ok(mammillaryTargets.some(mapping => mapping.family === "sections"));
  assert.ok(mammillaryTargets.every(mapping => mapping.family !== "blocks"));

  const invalid = cloneRegistry();
  invalid.entries.find(entry => entry.legacyIds?.includes(33)).learnerSurfaces.push("sections");
  const invalidReport = auditLearnerProvenance({registry: invalid});
  assert.equal(invalidReport.ok, false);
  assert.match(invalidReport.errors.join("\n"), /old ID33 cannot expose section or quiz/);
});

test("app-only optic rows stay separate from legacy and atlas label namespaces", () => {
  for (const key of ["app-schematic-optic-chiasm", "app-schematic-optic-nerve"]) {
    const entry = registry.entries.find(candidate => candidate.key === key);
    assert.ok(entry, `missing app-only row ${key}`);
    assert.equal(entry.expertReview, "pending");
    assert.equal(entry.projectReview, "pending");
    assert.equal(entry.quizEligibility, "none");
    assert.deepEqual(entry.sourceRefs, ["project-authored-teaching-overlays"]);
    assert.equal(Object.hasOwn(entry, "labelIds"), false, `${key} must not carry labelIds`);
    assert.equal(Object.hasOwn(entry, "legacyIds"), false, `${key} must not carry legacyIds`);
  }
});

test("CerebrA surface rows use a distinct label namespace and exact app IDs", () => {
  const appSurfaceEntries = new Map([
    ["rostralMiddleFrontal", [52, 1]], ["caudalMiddleFrontal", [93, 42]], ["parsOrbitalis", [95, 44]],
    ["middleTemporal", [79, 28]], ["inferiorTemporal", [54, 3]], ["transverseTemporal", [65, 14]],
    ["supramarginal", [102, 51]], ["superiorParietal", [60, 9]], ["inferiorParietal", [61, 10]],
    ["paracentral", [67, 16]], ["pericalcarine", [57, 6]], ["lingual", [63, 12]],
    ["parahippocampal", [69, 18]], ["entorhinal", [87, 36]], ["orbitofrontal", [58, 7, 66, 15]],
    ["lateralOccipital", [85, 34]],
  ]);
  for (const [appKey, ids] of appSurfaceEntries) {
    const entry = registry.entries.find(candidate => candidate.appKeys?.includes(appKey));
    assert.ok(entry, `missing CerebrA row for ${appKey}`);
    assert.deepEqual(entry.cerebraLabelIds, ids);
    assert.equal(Object.hasOwn(entry, "labelIds"), false, `${entry.key} must not use BigBrain labelIds`);
  }
  const drifted = cloneRegistry();
  drifted.entries.find(entry => entry.key === "app-surface-lingual").cerebraLabelIds = [999, 12];
  const report = auditLearnerProvenance({registry: drifted});
  assert.equal(report.ok, false);
  assert.match(report.errors.join("\n"), /cerebraLabelIds must exactly match/);
});

test("standalone pathway audit rejects empty parsers and aggregate or leaf drift", () => {
  const errors = [];
  validatePathwayPresetMappings("const pathwayPresets:Record<PathwayPresetKey,PathwayPreset>={\n};", LEARNER_PROVENANCE_MAPPINGS, errors);
  assert.match(errors.join("\n"), /exactly 3 required presets/);
  const missingAggregate = LEARNER_PROVENANCE_MAPPINGS.filter(mapping => mapping.target !== "free:pathway:visual");
  const aggregateErrors = [];
  validatePathwayPresetMappings(pageSource, missingAggregate, aggregateErrors);
  assert.match(aggregateErrors.join("\n"), /missing aggregate learner mapping/);
  const brokenLeaf = structuredClone(LEARNER_PROVENANCE_MAPPINGS);
  brokenLeaf.find(mapping => mapping.target === "free:region:pericalcarine").entryKeys = ["synthetic-missing-entry"];
  const leafErrors = [];
  validatePathwayPresetMappings(pageSource, brokenLeaf, leafErrors);
  assert.match(leafErrors.join("\n"), /aggregate mapping missing synthetic-missing-entry/);
});

test("badge audit requires the exact weakest representation descriptor", () => {
  const errors = [];
  validateBadge({target: "surface:test", badge: {label: "アトラス", className: "provisional", representation: "schematic-3d", rank: 1}}, [{representations: ["atlas-surface"]}], errors);
  assert.match(errors.join("\n"), /badge label must exactly|badge representation must exactly|badge rank must exactly/);
  const weakerErrors = [];
  validateBadge({target: "surface:test", badge: {label: "模式3D", className: "schematic", representation: "schematic-3d", rank: 1}}, [{representations: ["atlas-surface"]}], weakerErrors);
  assert.match(weakerErrors.join("\n"), /badge .* must exactly match the weakest/);
});
