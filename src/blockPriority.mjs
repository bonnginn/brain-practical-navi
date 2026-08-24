/**
 * Learner-facing routing for the eight existing block specimens.
 *
 * This is an observation-order aid only. It is deliberately kept separate
 * from specimen provenance, label confidence, and expert-review status so a
 * priority badge cannot be read as an anatomical quality claim.
 */

export const BLOCK_SPECIMEN_KEYS = Object.freeze([
  "lateral-ventricle",
  "diencephalon",
  "radiations",
  "commissural-system",
  "choroid-plexus",
  "medial-temporal",
  "midbrain-section",
  "hindbrain",
]);

export const BLOCK_PRIORITY_GROUP_KEYS = Object.freeze(["focus", "development"]);

export const BLOCK_PRIORITY_GROUPS = Object.freeze({
  focus: Object.freeze({
    key: "focus",
    label: "β重点 4",
    shortLabel: "β重点",
    description: "β候補版で先に位置関係を組み立てる4項目",
    specimenKeys: Object.freeze([
      "lateral-ventricle",
      "radiations",
      "choroid-plexus",
      "medial-temporal",
    ]),
  }),
  development: Object.freeze({
    key: "development",
    label: "発展観察 4",
    shortLabel: "発展観察",
    description: "同じ8項目から、別の関係を広げて観察する4項目",
    specimenKeys: Object.freeze([
      "diencephalon",
      "commissural-system",
      "midbrain-section",
      "hindbrain",
    ]),
  }),
});

export const BLOCK_PRIORITY_ENTRIES = Object.freeze([
  Object.freeze({
    key: "lateral-ventricle",
    group: "focus",
    reason: "脳室と尾状核・視床・海馬の位置関係をまとめて観察する入口",
  }),
  Object.freeze({
    key: "diencephalon",
    group: "development",
    reason: "第三脳室を基準に視床周囲の上下・内外関係を広げて観察",
  }),
  Object.freeze({
    key: "radiations",
    group: "focus",
    reason: "内包を基準にレンズ核と投射線維の位置関係を整理",
  }),
  Object.freeze({
    key: "commissural-system",
    group: "development",
    reason: "脳梁と脳弓を別の線維系として位置関係から観察",
  }),
  Object.freeze({
    key: "choroid-plexus",
    group: "focus",
    reason: "脳室腔・脈絡裂・海馬の隣接関係を観察",
  }),
  Object.freeze({
    key: "medial-temporal",
    group: "focus",
    reason: "海馬・扁桃体・側脳室下角の前後関係を観察",
  }),
  Object.freeze({
    key: "midbrain-section",
    group: "development",
    reason: "中脳水道を基準に赤核・黒質・大脳脚を比較",
  }),
  Object.freeze({
    key: "hindbrain",
    group: "development",
    reason: "脳幹・小脳・第四脳室の位置関係を広げて観察",
  }),
]);

export const BLOCK_PRIORITY_DISCLAIMER = "この区分は観察の導線を示すもので、構造の由来・確度・専門家レビュー状況を示しません。8項目はすべて利用できます。";

export const BLOCK_PRIORITY_GROUP_BY_KEY = Object.freeze(
  Object.fromEntries(BLOCK_PRIORITY_ENTRIES.map(entry => [entry.key, entry.group])),
);

export const BLOCK_PRIORITY_ENTRY_BY_KEY = Object.freeze(
  Object.fromEntries(BLOCK_PRIORITY_ENTRIES.map(entry => [entry.key, entry])),
);

const PRIORITY_TEXT_FORBIDDEN = /(頻出|頻度|検証済み|検証された|確定|高確度|信頼性|由来|出典|専門家|監修|レビュー|標本由来|画像由来|ground\s*truth|verified|validated|provenance|confidence|expert\s*review|reviewed)/i;

function exactArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function exactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length && actual.every((key, index) => key === sorted[index]);
}

/**
 * Validate the fixed eight-item routing contract. This validator checks the
 * learner-facing classification only; it intentionally does not infer or
 * validate anatomy, mesh geometry, or label provenance.
 */
export function validateBlockPriorityContract(value = {
  specimenKeys: BLOCK_SPECIMEN_KEYS,
  groupKeys: BLOCK_PRIORITY_GROUP_KEYS,
  groups: BLOCK_PRIORITY_GROUPS,
  entries: BLOCK_PRIORITY_ENTRIES,
  disclaimer: BLOCK_PRIORITY_DISCLAIMER,
}) {
  const errors = [];
  const expectedTopKeys = ["specimenKeys", "groupKeys", "groups", "entries", "disclaimer"];
  if (!exactKeys(value, expectedTopKeys)) errors.push("contract must contain exactly specimenKeys, groupKeys, groups, entries, and disclaimer");
  if (!exactArray(value?.specimenKeys, BLOCK_SPECIMEN_KEYS)) errors.push("specimenKeys must retain the existing eight-item order");
  if (!exactArray(value?.groupKeys, BLOCK_PRIORITY_GROUP_KEYS)) errors.push("groupKeys must be focus then development");
  if (typeof value?.disclaimer !== "string" || value.disclaimer.trim() === "") errors.push("disclaimer must be non-empty");
  else if (value.disclaimer !== BLOCK_PRIORITY_DISCLAIMER) errors.push("disclaimer must separate routing from provenance, confidence, and expert review");
  if (Array.isArray(value?.disclaimer) || (value?.disclaimer !== BLOCK_PRIORITY_DISCLAIMER && PRIORITY_TEXT_FORBIDDEN.test(String(value?.disclaimer ?? "")))) errors.push("disclaimer contains a prohibited priority/provenance claim");

  if (!value?.groups || typeof value.groups !== "object" || Array.isArray(value.groups)) errors.push("groups must be an object");
  else {
    if (!exactKeys(value.groups, BLOCK_PRIORITY_GROUP_KEYS)) errors.push("groups must contain only focus and development");
    for (const groupKey of BLOCK_PRIORITY_GROUP_KEYS) {
      const expected = BLOCK_PRIORITY_GROUPS[groupKey];
      const group = value.groups[groupKey];
      if (!group || typeof group !== "object") {
        errors.push(`group ${groupKey} must be an object`);
        continue;
      }
      if (!exactKeys(group, ["key", "label", "shortLabel", "description", "specimenKeys"])) errors.push(`group ${groupKey} has unexpected fields`);
      if (group.key !== groupKey || group.label !== expected.label || group.shortLabel !== expected.shortLabel) errors.push(`group ${groupKey} label/key drift`);
      if (typeof group.description !== "string" || group.description.trim() === "") errors.push(`group ${groupKey} description must be non-empty`);
      if (!exactArray(group.specimenKeys, expected.specimenKeys)) errors.push(`group ${groupKey} must contain its exact fixed specimen set`);
      if (PRIORITY_TEXT_FORBIDDEN.test([group.label, group.shortLabel, group.description].join(" "))) errors.push(`group ${groupKey} contains a prohibited priority/provenance claim`);
    }
  }

  if (!Array.isArray(value?.entries) || value.entries.length !== BLOCK_SPECIMEN_KEYS.length) errors.push("entries must contain exactly eight items");
  const seen = new Set();
  for (const [index, entry] of (value?.entries ?? []).entries()) {
    const prefix = `entry ${index + 1}`;
    if (!exactKeys(entry, ["key", "group", "reason"])) errors.push(`${prefix} has unexpected fields`);
    if (!BLOCK_SPECIMEN_KEYS.includes(entry?.key)) errors.push(`${prefix} has an unknown specimen key`);
    if (seen.has(entry?.key)) errors.push(`${prefix} duplicates specimen ${entry.key}`);
    seen.add(entry?.key);
    if (!BLOCK_PRIORITY_GROUP_KEYS.includes(entry?.group)) errors.push(`${prefix} has an unknown group`);
    if (typeof entry?.reason !== "string" || entry.reason.trim() === "") errors.push(`${prefix} reason must be non-empty`);
    if (typeof entry?.reason === "string" && PRIORITY_TEXT_FORBIDDEN.test(entry.reason)) errors.push(`${prefix} reason contains a prohibited priority/provenance claim`);
    if (entry?.key && entry?.group && BLOCK_PRIORITY_GROUPS[entry.group] && !BLOCK_PRIORITY_GROUPS[entry.group].specimenKeys.includes(entry.key)) errors.push(`${prefix} group does not match the fixed specimen set`);
  }
  for (const key of BLOCK_SPECIMEN_KEYS) if (!seen.has(key)) errors.push(`specimen ${key} is missing from entries`);

  return {ok: errors.length === 0, errors, summary: {
    specimenCount: BLOCK_SPECIMEN_KEYS.length,
    groupCount: BLOCK_PRIORITY_GROUP_KEYS.length,
    focusKeys: [...BLOCK_PRIORITY_GROUPS.focus.specimenKeys],
    developmentKeys: [...BLOCK_PRIORITY_GROUPS.development.specimenKeys],
  }};
}

export { PRIORITY_TEXT_FORBIDDEN };
