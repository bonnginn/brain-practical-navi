export const REVIEW_SURFACE_FILTERS = Object.freeze(["all", "surface", "sections", "blocks", "quiz"]);
export const OBSERVATION_SURFACE_ORDER = Object.freeze(["surface", "sections", "blocks", "quiz"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Derive a read-only review queue without copying or normalizing registry
 * fields. Each item keeps the original provenance entry by reference so the
 * registry remains the only source of review metadata.
 */
export function deriveAnatomyReviewQueue(registry) {
  if (!isRecord(registry) || !Array.isArray(registry.entries)) {
    throw new Error("anatomy review queue requires a provenance registry with entries");
  }
  const keys = new Set();
  const queue = [];
  for (const entry of registry.entries) {
    if (!isRecord(entry) || entry.expertReview !== "pending") continue;
    if (typeof entry.key !== "string" || entry.key.trim() === "") {
      throw new Error("pending provenance entry requires a non-empty stable key");
    }
    if (keys.has(entry.key)) throw new Error(`duplicate pending provenance key: ${entry.key}`);
    keys.add(entry.key);
    queue.push({key: entry.key, entry});
  }
  return queue;
}

/**
 * Apply only learner-surface and representation filters. Existing entry
 * arrays remain untouched and returned items retain their entry references.
 */
export function filterAnatomyReviewQueue(queue, {surface = "all", representation = "all"} = {}) {
  if (!Array.isArray(queue)) return [];
  return queue.filter(item => {
    const entry = item?.entry;
    if (!isRecord(entry)) return false;
    const surfaceMatch = surface === "all" || (Array.isArray(entry.learnerSurfaces) && entry.learnerSurfaces.includes(surface));
    const representationMatch = representation === "all" || (Array.isArray(entry.representations) && entry.representations.includes(representation));
    return surfaceMatch && representationMatch;
  });
}

export function isLegacyOpticEntry(entry) {
  return Array.isArray(entry?.legacyIds) && entry.legacyIds.includes(33);
}

export function isMammillaryEntry(entry) {
  return Array.isArray(entry?.labelIds) && entry.labelIds.includes(39) && entry.labelIds.includes(40);
}

/**
 * Return a generic existing workspace only when the entry declares that
 * learner surface. No structure, label, or target selection is encoded.
 * The old mixed optic entry is limited to its generic surface observation.
 */
export function observationWorkspaceForEntry(entry) {
  const surfaces = Array.isArray(entry?.learnerSurfaces) ? entry.learnerSurfaces : [];
  const allowed = isLegacyOpticEntry(entry) ? ["surface"] : OBSERVATION_SURFACE_ORDER;
  return allowed.find(surface => surfaces.includes(surface)) ?? null;
}

export function observationHashForEntry(entry) {
  const workspace = observationWorkspaceForEntry(entry);
  return workspace ? `#workspace/${workspace}` : null;
}
