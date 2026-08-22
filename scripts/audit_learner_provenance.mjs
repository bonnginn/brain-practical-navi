import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  LEARNER_BADGE_REPRESENTATIONS,
  LEARNER_BLOCK_SPECIMEN_KEYS,
  LEARNER_DISPLAY_FAMILIES,
  LEARNER_PROVENANCE_MAPPINGS,
  LEARNER_SURFACE_BY_FAMILY,
  deriveLearnerProvenanceDisplay,
  shortBadgeForEntries,
} from "../src/learnerProvenance.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const REGISTRY_RELATIVE_PATH = "public/atlas/structure-provenance.json";
export const APP_SOURCE_RELATIVE_PATH = "app/page.tsx";

const LEARNER_SURFACES = Object.freeze(["surface", "sections", "blocks", "quiz"]);

const FAMILY_REPRESENTATIONS = Object.freeze({
  sections: new Set([
    "manual-same-grid",
    "atlas-provisional",
    "image-guided-provisional",
    "image-guided-reviewed",
    "atlas-surface",
  ]),
  surface: new Set(LEARNER_BADGE_REPRESENTATIONS.filter(value => value !== "not-recorded" && value !== "text-only")),
  free: new Set(LEARNER_BADGE_REPRESENTATIONS.filter(value => value !== "not-recorded" && value !== "text-only")),
  neurovascular: new Set(["schematic-3d", "atlas-provisional"]),
  blocks: new Set(LEARNER_BADGE_REPRESENTATIONS.filter(value => value !== "not-recorded" && value !== "text-only")),
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(rootDir, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unquoteKey(value) {
  return value.startsWith("\"") && value.endsWith("\"") ? value.slice(1, -1) : value;
}

function objectBody(source, declarationName) {
  // Keep this tolerant of the two formatting styles used in app/page.tsx:
  // typed objects are written both as `...={...}` and `... = {...}`.
  const match = source.match(new RegExp(`const\\s+${regexEscape(declarationName)}\\s*:[^=]*=\\s*\\{(?<body>[\\s\\S]*?)\\n\\s*\\};`));
  if (!match) throw new Error(`Could not locate ${declarationName} in ${APP_SOURCE_RELATIVE_PATH}`);
  return match.groups.body;
}

function objectKeys(source, declarationName) {
  const body = objectBody(source, declarationName);
  return [...body.matchAll(/^\s*(?<quoted>"[^"]+")|^\s*(?<bare>[A-Za-z][A-Za-z0-9]*)\s*:\s*\{/gm)]
    .map(match => unquoteKey(match.groups.quoted ?? match.groups.bare));
}

function objectEntries(source, declarationName) {
  const body = objectBody(source, declarationName);
  return body.split(/\r?\n/).map(line => line.match(/^\s*(?<key>"[^"]+"|[A-Za-z][A-Za-z0-9-]*)\s*:\s*\{(?<entry>.*)\},?\s*$/)).filter(Boolean)
    .map(match => ({key: unquoteKey(match.groups.key), entry: match.groups.entry}));
}

function objectEntryArrays(source, declarationName, propertyName) {
  return objectEntries(source, declarationName).map(({key, entry}) => {
    const property = entry.match(new RegExp(`${regexEscape(propertyName)}\\s*:\\[(?<values>[^\\]]*)\\]`));
    if (!property) throw new Error(`${declarationName}.${key} is missing ${propertyName}`);
    const values = property.groups.values.split(",").map(value => value.trim()).filter(Boolean);
    if (values.some(value => !/^\d+$/.test(value))) throw new Error(`${declarationName}.${key}.${propertyName} must contain only numeric IDs`);
    return [key, values.map(Number)];
  });
}

function parsePathwayPresets(source) {
  return objectEntries(source, "pathwayPresets").map(({key, entry}) => {
    const parseKeys = propertyName => {
      const property = entry.match(new RegExp(`${propertyName}\\s*:\\[(?<values>[^\\]]*)\\]`));
      if (!property) throw new Error(`pathwayPresets.${key} is missing ${propertyName}`);
      return [...property.groups.values.matchAll(/"([^"]+)"/g)].map(value => value[1]);
    };
    return {key, freeKeys: parseKeys("freeKeys"), sectionKeys: parseKeys("sectionKeys")};
  });
}

function arrayValues(source, declarationName) {
  const match = source.match(new RegExp(`const\\s+${regexEscape(declarationName)}\\s*:[^=]*=\\[(?<body>[\\s\\S]*?)\\];`));
  if (!match) throw new Error(`Could not locate ${declarationName} in ${APP_SOURCE_RELATIVE_PATH}`);
  return [...match.groups.body.matchAll(/"([^"]+)"|\b([A-Za-z][A-Za-z0-9-]*)\b/g)]
    .map(matchItem => matchItem[1] ?? matchItem[2]);
}

function blockLayerKeysBySpecimen(source) {
  const body = objectBody(source, "blockSpecimens");
  const starts = [...body.matchAll(/^\s*(?:"(?<quoted>[^"]+)"|(?<bare>[A-Za-z][A-Za-z0-9-]*))\s*:\s*\{/gm)];
  const result = {};
  for (const [index, start] of starts.entries()) {
    const specimen = start.groups.quoted ?? start.groups.bare;
    const end = starts[index + 1]?.index ?? body.length;
    const segment = body.slice(start.index, end);
    result[specimen] = [...segment.matchAll(/\{key:"([^"]+)"/g)].map(match => match[1]);
  }
  return result;
}

/**
 * Read the learner-visible key inventories from the actual page source. The
 * provenance mappings remain static and auditable, but they must not silently
 * drift when a visible app key is added or removed.
 */
export function extractAppLearnerInventories(source) {
  const blockSpecimenKeys = arrayValues(source, "blockSpecimenKeys");
  const blockLayersBySpecimen = blockLayerKeysBySpecimen(source);
  return {
    surfaceRegionKeys: objectKeys(source, "surfaceRegions"),
    surfaceLandmarkKeys: objectKeys(source, "surfaceLandmarks"),
    surfaceDeepKeys: objectKeys(source, "surfaceDeepLandmarks"),
    basalKeys: objectKeys(source, "basalLandmarks").filter(key => key !== "all" && key !== "mammillary"),
    neurovascularKeys: objectKeys(source, "neurovascularStructures"),
    sectionStructureKeys: objectKeys(source, "structures").filter(key => key !== "opticChiasm"),
    blockSpecimenKeys,
    blockLayersBySpecimen,
    pathwayKeys: objectKeys(source, "pathwayPresets"),
  };
}

function mappingSuffixSet(mappings, prefix) {
  return new Set(mappings
    .filter(mapping => typeof mapping?.target === "string" && mapping.target.startsWith(prefix))
    .map(mapping => mapping.target.slice(prefix.length)));
}

function sortedValues(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function validateInventorySet(label, appValues, mappingValues, errors) {
  const appSet = new Set(appValues);
  const mappingSet = new Set(mappingValues);
  const missing = sortedValues([...appSet].filter(value => !mappingSet.has(value)));
  const stale = sortedValues([...mappingSet].filter(value => !appSet.has(value)));
  if (missing.length || stale.length) {
    errors.push(`app/page.tsx ${label} inventory is not linked to learner provenance mappings (missing mappings: [${missing.join(", ")}]; stale mappings: [${stale.join(", ")}])`);
  }
}

function validateAppInventoryLinkage(source, mappings, errors) {
  let inventories;
  try {
    inventories = extractAppLearnerInventories(source);
  } catch (error) {
    errors.push(`could not read app/page.tsx learner inventories: ${error.message}`);
    return null;
  }

  validateInventorySet("surface region", inventories.surfaceRegionKeys, mappingSuffixSet(mappings, "surface:region:"), errors);
  validateInventorySet("surface landmark", inventories.surfaceLandmarkKeys, mappingSuffixSet(mappings, "surface:landmark:"), errors);
  validateInventorySet("surface deep", inventories.surfaceDeepKeys, mappingSuffixSet(mappings, "surface:deep:"), errors);
  validateInventorySet("surface basal", inventories.basalKeys, mappingSuffixSet(mappings, "surface:basal:"), errors);
  validateInventorySet("free region", inventories.surfaceRegionKeys, mappingSuffixSet(mappings, "free:region:"), errors);
  validateInventorySet("free landmark", inventories.surfaceLandmarkKeys, mappingSuffixSet(mappings, "free:landmark:"), errors);
  validateInventorySet("free deep", inventories.surfaceDeepKeys, mappingSuffixSet(mappings, "free:deep:"), errors);
  validateInventorySet("free basal", inventories.basalKeys.filter(key => !["olfactory", "optic"].includes(key)), mappingSuffixSet(mappings, "free:basal:"), errors);
  validateInventorySet("neurovascular", inventories.neurovascularKeys, mappingSuffixSet(mappings, "neurovascular:"), errors);
  validateInventorySet("free neurovascular", inventories.neurovascularKeys, mappingSuffixSet(mappings, "free:neuro:"), errors);
  validateInventorySet("section structure", inventories.sectionStructureKeys, mappingSuffixSet(mappings, "sections:structure:"), errors);
  validateInventorySet("block specimen", inventories.blockSpecimenKeys, mappingSuffixSet(mappings, "blocks:specimen:"), errors);
  for (const specimen of inventories.blockSpecimenKeys) {
    validateInventorySet(
      `block layer ${specimen}`,
      inventories.blockLayersBySpecimen[specimen] ?? [],
      mappings.filter(mapping => mapping?.target?.startsWith(`blocks:layer:${specimen}:`)).map(mapping => mapping.target.slice(`blocks:layer:${specimen}:`.length)),
      errors,
    );
  }
  validateInventorySet("pathway preset", inventories.pathwayKeys, mappingSuffixSet(mappings, "free:pathway:"), errors);
  return inventories;
}

function validateCerebraSurfaceLabelIds(source, registry, mappings, errors) {
  let surfaceRegions;
  try {
    surfaceRegions = new Map(objectEntryArrays(source, "surfaceRegions", "ids"));
  } catch (error) {
    errors.push(`could not read app/page.tsx surface region IDs: ${error.message}`);
    return;
  }
  const displays = deriveLearnerProvenanceDisplay(registry, mappings);
  for (const [key, ids] of surfaceRegions) {
    const display = displays.find(item => item.target === `surface:region:${key}`);
    for (const entry of display?.entries ?? []) {
      if (!entry.key.startsWith("app-surface-") || !entry.sourceRefs?.includes("mni-cerebra-browser-assets")) continue;
      if (Object.hasOwn(entry, "labelIds")) errors.push(`${entry.key}: CerebrA surface row must use cerebraLabelIds, not labelIds`);
      if (!Array.isArray(entry.cerebraLabelIds) || JSON.stringify(entry.cerebraLabelIds) !== JSON.stringify(ids)) {
        errors.push(`${entry.key}: cerebraLabelIds must exactly match app/page.tsx surfaceRegions.${key}.ids`);
      }
    }
  }
}

export function validatePathwayPresetMappings(source, mappings, errors) {
  let presets;
  try {
    presets = parsePathwayPresets(source);
  } catch (error) {
    errors.push(`could not read app/page.tsx pathway presets: ${error.message}`);
    return;
  }
  const expectedKeys = ["visual", "papez", "basal-ganglia"];
  if (presets.length !== expectedKeys.length || !expectedKeys.every(key => presets.some(preset => preset.key === key))) {
    errors.push(`pathway preset inventory must contain exactly ${expectedKeys.length} required presets: [${expectedKeys.join(", ")}]`);
  }
  const mappingByTarget = new Map((mappings ?? []).map(mapping => [mapping?.target, mapping]));
  for (const preset of presets) {
    const aggregate = mappingByTarget.get(`free:pathway:${preset.key}`);
    if (!aggregate) {
      errors.push(`pathway preset ${preset.key} is missing aggregate learner mapping`);
      continue;
    }
    const leafTargets = [
      ...preset.freeKeys.map(key => `free:${key}`),
      ...preset.sectionKeys.map(key => `sections:structure:${key}`),
    ];
    for (const leafTarget of leafTargets) {
      const leaf = mappingByTarget.get(leafTarget);
      if (!leaf) {
        errors.push(`${preset.key}: missing pathway leaf mapping ${leafTarget}`);
        continue;
      }
      if (!Array.isArray(leaf.entryKeys) || leaf.entryKeys.length === 0 || leaf.unresolvedTargetKeys?.length > 0) {
        errors.push(`${preset.key}: pathway leaf mapping is unresolved: ${leafTarget}`);
      }
      for (const entryKey of leaf.entryKeys ?? []) {
        if (!(aggregate.entryKeys ?? []).includes(entryKey)) errors.push(`${preset.key}: aggregate mapping missing ${entryKey} from ${leafTarget}`);
      }
    }
  }
}

function hasIntersection(left, right) {
  return left.some(value => right.includes(value));
}

function isLegacyId33(entry) {
  return (Array.isArray(entry?.legacyIds) && entry.legacyIds.includes(33))
    || (Array.isArray(entry?.labelIds) && entry.labelIds.includes(33));
}

function isMammillary3940(entry) {
  return Array.isArray(entry?.labelIds) && entry.labelIds.includes(39) && entry.labelIds.includes(40);
}

function mappingFamilyForTarget(target) {
  if (typeof target !== "string") return null;
  const separator = target.indexOf(":");
  return separator > 0 ? target.slice(0, separator) : null;
}

function unresolvedTargetList(displays) {
  const direct = displays
    .filter(display => display.unresolved)
    .map(display => display.target);
  const nested = displays.flatMap(display => display.unresolvedTargetKeys ?? []);
  return [...new Set([...direct, ...nested])];
}

function unresolvedLeafGapTargets(displays) {
  // An aggregate specimen can name the same unresolved leaf that is already
  // present as a direct display.  Count the leaf target once; aggregate
  // unresolved displays are reported separately in the summary.
  const directLeaves = displays
    .filter(display => (display.entryKeys?.length ?? 0) === 0)
    .map(display => display.target);
  const nestedLeaves = displays.flatMap(display => display.unresolvedTargetKeys ?? []);
  return new Set([...directLeaves, ...nestedLeaves]);
}

function countByFamily(displays) {
  return Object.fromEntries(LEARNER_DISPLAY_FAMILIES.map(family => {
    const members = displays.filter(display => display.family === family);
    const unresolved = members.filter(display => display.unresolved);
    return [family, {
      targetCount: members.length,
      resolvedCount: members.length - unresolved.length,
      unresolvedCount: unresolved.length,
    }];
  }));
}

function validateRegistryShape(registry, errors) {
  if (!isRecord(registry)) {
    errors.push("provenance registry root must be an object");
    return [];
  }
  if (!Array.isArray(registry.entries)) {
    errors.push("provenance registry entries must be an array");
    return [];
  }
  const entries = registry.entries;
  const keys = new Set();
  for (const [index, entry] of entries.entries()) {
    const prefix = `registry.entries[${index}]`;
    if (!isRecord(entry) || typeof entry.key !== "string" || entry.key.trim() === "") {
      errors.push(`${prefix}: stable key must be a non-empty string`);
      continue;
    }
    if (keys.has(entry.key)) errors.push(`duplicate provenance key: ${entry.key}`);
    keys.add(entry.key);
    if (!Array.isArray(entry.representations) || entry.representations.length === 0) errors.push(`${entry.key}: representations must be a non-empty array`);
    if (!Array.isArray(entry.learnerSurfaces)) errors.push(`${entry.key}: learnerSurfaces must be an array`);
    for (const representation of entry.representations ?? []) {
      if (!LEARNER_BADGE_REPRESENTATIONS.includes(representation)) errors.push(`${entry.key}: unknown representation ${representation}`);
    }
    for (const surface of entry.learnerSurfaces ?? []) {
      if (!LEARNER_SURFACES.includes(surface)) errors.push(`${entry.key}: unknown learnerSurface ${surface}`);
    }
    if (Object.prototype.hasOwnProperty.call(entry, "hiddenAssets")) {
      if (!Array.isArray(entry.hiddenAssets)) {
        errors.push(`${entry.key}: hiddenAssets must be an array`);
      } else if (entry.hiddenAssets.some(asset => typeof asset !== "string" || asset.trim() === "")) {
        errors.push(`${entry.key}: hiddenAssets must contain non-empty asset names`);
      }
    }
    if (entry.representations?.includes("not-recorded") && (entry.learnerSurfaces?.length ?? 0) > 0) {
      errors.push(`${entry.key}: not-recorded entry cannot expose a learner surface`);
    }
    if (entry.representations?.includes("not-recorded") && (entry.hiddenAssets?.length ?? 0) > 0) {
      errors.push(`${entry.key}: not-recorded entry cannot expose hidden assets`);
    }
    if (entry.representations?.includes("not-recorded")) {
      if (entry.representations.length !== 1) errors.push(`${entry.key}: not-recorded cannot be combined with another representation`);
      if ((entry.sourceRefs?.length ?? 0) > 0) errors.push(`${entry.key}: not-recorded entry cannot expose source references`);
      if ((entry.appKeys?.length ?? 0) > 0) errors.push(`${entry.key}: not-recorded entry cannot expose app keys`);
      if (entry.quizEligibility !== undefined && entry.quizEligibility !== "none") errors.push(`${entry.key}: not-recorded entry cannot be quiz material`);
    }
  }
  return entries;
}

function validateSpecialEntries(entries, errors) {
  const legacy = entries.filter(isLegacyId33);
  if (legacy.length !== 1) {
    errors.push(`old ID33 must have exactly one provenance entry, found ${legacy.length}`);
  } else {
    const entry = legacy[0];
    if (entry.excludedFromSectionAndQuizTargets !== true) errors.push("old ID33 must be marked excludedFromSectionAndQuizTargets");
    if (entry.learnerSurfaces?.includes("sections") || entry.learnerSurfaces?.includes("quiz")) errors.push("old ID33 cannot expose section or quiz learner surfaces");
    if (entry.expertReview !== "pending") errors.push("old ID33 expertReview must remain pending");
    if (entry.quizEligibility === "standard") errors.push("old ID33 cannot be standard quiz material");
    if (entry.appKeys?.includes("opticChiasm")) errors.push("old ID33 cannot expose the opticChiasm app key");
  }
  const mammillary = entries.filter(isMammillary3940);
  if (mammillary.length !== 1) {
    errors.push(`IDs 39/40 must have exactly one provenance entry, found ${mammillary.length}`);
  } else {
    const entry = mammillary[0];
    if (entry.expertReview !== "pending") errors.push("mammillary IDs 39/40 expertReview must remain pending");
    if (entry.projectReview !== "reviewed-by-project") errors.push("mammillary IDs 39/40 projectReview must remain reviewed-by-project");
    if (JSON.stringify(entry.labelIds) !== "[39,40]") errors.push("mammillary IDs 39/40 labelIds must be exactly [39,40]");
    if (!entry.representations?.includes("image-guided-reviewed")) errors.push("mammillary IDs 39/40 must be image-guided-reviewed");
    if (entry.quizEligibility !== "standard") errors.push("mammillary IDs 39/40 must remain standard quiz material");
    if (JSON.stringify(entry.learnerSurfaces) !== JSON.stringify(["sections", "quiz"])) errors.push("mammillary IDs 39/40 learnerSurfaces must be exactly [sections,quiz]");
    if (JSON.stringify(entry.hiddenAssets) !== JSON.stringify(["block-diencephalon-mammillary-bodies.mesh", "landmark-mammillary-bodies.mesh"])) {
      errors.push("mammillary IDs 39/40 must record both hidden schematic assets");
    }
  }
}

export function validateBadge(display, referencedEntries, errors) {
  const badge = display?.badge;
  if (!isRecord(badge) || typeof badge.rank !== "number" || typeof badge.label !== "string" || typeof badge.className !== "string" || !(badge.representation === null || typeof badge.representation === "string")) {
    errors.push(`${display?.target ?? "unknown target"}: derived learner badge is malformed`);
    return;
  }
  const expected = shortBadgeForEntries(referencedEntries);
  for (const field of ["label", "className", "representation", "rank"]) {
    if (badge[field] !== expected[field]) errors.push(`${display?.target ?? "unknown target"}: badge ${field} must exactly match the weakest referenced representation`);
  }
}

function validateMappings(registry, mappings, displays, errors) {
  const entriesByKey = new Map(registry.entries.map(entry => [entry?.key, entry]));
  const mappingByTarget = new Map();
  for (const [index, mapping] of (mappings ?? []).entries()) {
    const prefix = `mapping[${index}]`;
    if (!isRecord(mapping)) {
      errors.push(`${prefix}: mapping must be an object`);
      continue;
    }
    if (typeof mapping.target !== "string" || mapping.target.trim() === "") {
      errors.push(`${prefix}: target must be a non-empty stable ID`);
      continue;
    }
    if (mappingByTarget.has(mapping.target)) errors.push(`duplicate learner target: ${mapping.target}`);
    mappingByTarget.set(mapping.target, mapping);
    const family = mappingFamilyForTarget(mapping.target);
    if (!LEARNER_DISPLAY_FAMILIES.includes(mapping.family)) errors.push(`${mapping.target}: unknown family ${mapping.family}`);
    if (family !== mapping.family) errors.push(`${mapping.target}: target namespace must match family ${mapping.family}`);
    if (!Array.isArray(mapping.entryKeys)) errors.push(`${mapping.target}: entryKeys must be an array`);
    if (!Array.isArray(mapping.requiredSurfaces) || mapping.requiredSurfaces.length === 0) errors.push(`${mapping.target}: requiredSurfaces must be non-empty`);
    if (Array.isArray(mapping.requiredSurfaces)) {
      for (const surface of mapping.requiredSurfaces) {
        if (!LEARNER_SURFACES.includes(surface)) errors.push(`${mapping.target}: unknown required learner surface ${surface}`);
      }
      if (new Set(mapping.requiredSurfaces).size !== mapping.requiredSurfaces.length) errors.push(`${mapping.target}: requiredSurfaces must be unique`);
    }
    if (typeof mapping.composite !== "boolean") errors.push(`${mapping.target}: composite must be boolean`);
    if (!Array.isArray(mapping.unresolvedTargetKeys)) errors.push(`${mapping.target}: unresolvedTargetKeys must be an array`);
    const primarySurfaces = LEARNER_SURFACE_BY_FAMILY[mapping.family] ?? [];
    if (primarySurfaces.some(surface => !(mapping.requiredSurfaces ?? []).includes(surface))) {
      errors.push(`${mapping.target}: requiredSurfaces must include the ${mapping.family} learner surface (${primarySurfaces.join(", ")})`);
    }
    const entryKeys = Array.isArray(mapping.entryKeys) ? mapping.entryKeys : [];
    if (new Set(entryKeys).size !== entryKeys.length) errors.push(`${mapping.target}: entryKeys must be unique`);
    if (entryKeys.length > 1 && mapping.composite !== true) errors.push(`${mapping.target}: multiple provenance entries require composite:true`);
    const referencedEntries = [];
    for (const entryKey of entryKeys) {
      const entry = entriesByKey.get(entryKey);
      if (!entry) {
        errors.push(`${mapping.target}: provenance entry does not exist: ${entryKey}`);
        continue;
      }
      referencedEntries.push(entry);
      if (entry.representations?.some(value => !FAMILY_REPRESENTATIONS[mapping.family]?.has(value))) {
        errors.push(`${mapping.target}: representation is incompatible with ${mapping.family}: ${entry.representations.join(", ")}`);
      }
      if (entry.representations?.some(value => value === "not-recorded" || value === "text-only")) {
        errors.push(`${mapping.target}: ${entry.key} has no drawn learner representation`);
      }
      if (entry.representations?.includes("not-recorded")) {
        errors.push(`${mapping.target}: not-recorded entry cannot be a visible learner target (${entry.key})`);
      }
      if (!hasIntersection(entry.learnerSurfaces ?? [], mapping.requiredSurfaces ?? [])) {
        errors.push(`${mapping.target}: ${entry.key} has no learnerSurface compatible with [${mapping.requiredSurfaces?.join(", ")}]`);
      }
      if (mapping.family === "blocks" && (entry.hiddenAssets?.length ?? 0) > 0) {
        errors.push(`${mapping.target}: hiddenAssets cannot be drawn as a block target (${entry.key})`);
      }
      if (isLegacyId33(entry) && (mapping.family === "sections" || mapping.family === "blocks" || mapping.target.startsWith("quiz:"))) {
        errors.push(`${mapping.target}: old ID33 is excluded from section, block, and quiz targets`);
      }
      if (isMammillary3940(entry) && mapping.family === "blocks") {
        errors.push(`${mapping.target}: IDs 39/40 hidden block assets cannot be drawn as a block target`);
      }
    }
    const unresolvedTargetKeys = Array.isArray(mapping.unresolvedTargetKeys) ? mapping.unresolvedTargetKeys : [];
    const unresolved = entryKeys.length === 0 || referencedEntries.length !== entryKeys.length || unresolvedTargetKeys.length > 0;
    if (unresolved && (typeof mapping.unresolvedReason !== "string" || mapping.unresolvedReason.trim() === "")) {
      errors.push(`${mapping.target}: unresolved mapping requires an explicit unresolvedReason`);
    }
    if (!unresolved && mapping.unresolvedReason !== null) errors.push(`${mapping.target}: resolved mapping cannot carry unresolvedReason`);
    for (const unresolvedTarget of unresolvedTargetKeys) {
      const nested = mappingByTarget.get(unresolvedTarget);
      if (!nested) errors.push(`${mapping.target}: unresolvedTargetKey is not a known target: ${unresolvedTarget}`);
      else if ((nested.entryKeys ?? []).length > 0) errors.push(`${mapping.target}: unresolvedTargetKey is already resolved: ${unresolvedTarget}`);
    }
    validateBadge(displays[index], referencedEntries, errors);
  }
  for (const display of displays) {
    if ((display.entryKeys ?? []).length === 0 && !display.unresolvedReason) errors.push(`${display.target}: unresolved target must explain why it is unresolved`);
  }
}

export function auditLearnerProvenance({registry, mappings = LEARNER_PROVENANCE_MAPPINGS, rootDir = REPOSITORY_ROOT} = {}) {
  const errors = [];
  let loadedRegistry = registry;
  try {
    if (!loadedRegistry) loadedRegistry = readJson(rootDir, REGISTRY_RELATIVE_PATH);
  } catch (error) {
    return {ok: false, errors: [`could not read provenance registry: ${error.message}`], summary: {}};
  }
  const entries = validateRegistryShape(loadedRegistry, errors);
  if (isRecord(loadedRegistry)) validateSpecialEntries(entries, errors);
  let displays = [];
  try {
    displays = deriveLearnerProvenanceDisplay(loadedRegistry, mappings);
  } catch (error) {
    errors.push(`could not derive learner provenance mappings: ${error.message}`);
  }
  if (Array.isArray(loadedRegistry?.entries) && Array.isArray(mappings)) validateMappings(loadedRegistry, mappings, displays, errors);
  let appInventories = null;
  try {
    const appSource = readText(rootDir, APP_SOURCE_RELATIVE_PATH);
    appInventories = validateAppInventoryLinkage(appSource, mappings, errors);
    validateCerebraSurfaceLabelIds(appSource, loadedRegistry, mappings, errors);
    validatePathwayPresetMappings(appSource, mappings, errors);
  } catch (error) {
    errors.push(`could not read app/page.tsx learner inventories: ${error.message}`);
  }
  const unresolvedTargets = unresolvedTargetList(displays);
  const familyCounts = countByFamily(displays);
  const resolvedDisplays = displays.filter(display => !display.unresolved);
  const unresolvedDisplays = displays.filter(display => display.unresolved);
  const unresolvedLeafGaps = unresolvedLeafGapTargets(displays);
  const aggregateUnresolvedCount = displays.filter(display => (display.unresolvedTargetKeys?.length ?? 0) > 0).length;
  const compositeCount = displays.filter(display => display.composite).length;
  const summary = {
    entryCount: entries.length,
    mappingCount: displays.length,
    displayCount: displays.length,
    resolvedCount: resolvedDisplays.length,
    resolvedDisplayCount: resolvedDisplays.length,
    unresolvedCount: unresolvedDisplays.length,
    unresolvedDisplayCount: unresolvedDisplays.length,
    leafGapCount: unresolvedLeafGaps.size,
    unresolvedLeafGapCount: unresolvedLeafGaps.size,
    aggregateUnresolvedCount,
    unresolvedTargets,
    unresolvedTargetCount: unresolvedTargets.length,
    unresolvedReasons: Object.fromEntries(displays.filter(display => display.unresolved).map(display => [display.target, display.unresolvedReason ?? "referenced unresolved target"])),
    compositeCount,
    familyCounts,
    blockSpecimenCount: displays.filter(display => display.target.startsWith("blocks:specimen:")).length,
    blockLayerCount: displays.filter(display => display.target.startsWith("blocks:layer:")).length,
    expectedBlockSpecimenCount: LEARNER_BLOCK_SPECIMEN_KEYS.length,
    appInventoryCounts: appInventories ? {
      surfaceRegionCount: appInventories.surfaceRegionKeys.length,
      surfaceLandmarkCount: appInventories.surfaceLandmarkKeys.length,
      surfaceDeepCount: appInventories.surfaceDeepKeys.length,
      basalCount: appInventories.basalKeys.length,
      neurovascularCount: appInventories.neurovascularKeys.length,
      sectionStructureCount: appInventories.sectionStructureKeys.length,
      blockSpecimenCount: appInventories.blockSpecimenKeys.length,
      blockLayerCount: Object.values(appInventories.blockLayersBySpecimen).flat().length,
      pathwayCount: appInventories.pathwayKeys.length,
    } : null,
  };
  if (summary.blockSpecimenCount !== LEARNER_BLOCK_SPECIMEN_KEYS.length) errors.push(`expected ${LEARNER_BLOCK_SPECIMEN_KEYS.length} block specimen mappings, found ${summary.blockSpecimenCount}`);
  return {ok: errors.length === 0, errors, summary};
}

function parseArgs(argv) {
  const args = {output: null};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      args.output = argv[++index];
      if (!args.output) throw new Error("--output requires a path");
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (args.help) {
    console.log("Usage: node scripts/audit_learner_provenance.mjs [--output path]");
    return;
  }
  const report = auditLearnerProvenance();
  const output = JSON.stringify({generatedAt: new Date().toISOString(), ...report}, null, 2);
  console.log(output);
  if (args.output) {
    const outputPath = path.resolve(REPOSITORY_ROOT, args.output);
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${output}\n`, "utf8");
  }
  if (!report.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
