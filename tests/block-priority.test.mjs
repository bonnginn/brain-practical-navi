import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BLOCK_PRIORITY_DISCLAIMER,
  BLOCK_PRIORITY_ENTRIES,
  BLOCK_PRIORITY_GROUPS,
  BLOCK_PRIORITY_GROUP_KEYS,
  BLOCK_SPECIMEN_KEYS,
  validateBlockPriorityContract,
} from "../src/blockPriority.mjs";
import { auditBlockPriority, REPOSITORY_ROOT } from "../scripts/audit_block_priority.mjs";

function contractFixture() {
  return {
    specimenKeys: [...BLOCK_SPECIMEN_KEYS],
    groupKeys: [...BLOCK_PRIORITY_GROUP_KEYS],
    groups: JSON.parse(JSON.stringify(BLOCK_PRIORITY_GROUPS)),
    entries: JSON.parse(JSON.stringify(BLOCK_PRIORITY_ENTRIES)),
    disclaimer: BLOCK_PRIORITY_DISCLAIMER,
  };
}

test("block priority contract contains the exact eight keys in the existing specimen order", () => {
  assert.deepEqual(BLOCK_SPECIMEN_KEYS, [
    "lateral-ventricle", "diencephalon", "radiations", "commissural-system",
    "choroid-plexus", "medial-temporal", "midbrain-section", "hindbrain",
  ]);
  assert.equal(new Set(BLOCK_SPECIMEN_KEYS).size, 8);
  assert.deepEqual(BLOCK_PRIORITY_GROUPS.focus.specimenKeys, ["lateral-ventricle", "radiations", "choroid-plexus", "medial-temporal"]);
  assert.deepEqual(BLOCK_PRIORITY_GROUPS.development.specimenKeys, ["diencephalon", "commissural-system", "midbrain-section", "hindbrain"]);
  assert.equal(validateBlockPriorityContract(contractFixture()).ok, true);
});

test("independent block priority audit preserves routes, initial specimen, numbering, and Canvas contract", () => {
  const report = auditBlockPriority(REPOSITORY_ROOT);
  assert.equal(report.ok, true, report.errors.map(error => `${error.code}: ${error.message}`).join("\n"));
  assert.equal(report.summary.initialSpecimen, "lateral-ventricle");
  assert.deepEqual(report.summary.existingOrder, BLOCK_SPECIMEN_KEYS);
  assert.equal(report.summary.routePattern, "#workspace/blocks/<existing-key>");
  assert.match(report.summary.canvasContract, /plane\/position\/focus\/rotation\/layers/);
});

test("validator rejects unknown, duplicate, missing, and empty entries", () => {
  const unknown = contractFixture();
  unknown.entries[0].key = "not-a-specimen";
  assert.equal(validateBlockPriorityContract(unknown).ok, false);
  const duplicate = contractFixture();
  duplicate.entries[1].key = duplicate.entries[0].key;
  assert.equal(validateBlockPriorityContract(duplicate).ok, false);
  const missing = contractFixture();
  missing.entries.pop();
  assert.equal(validateBlockPriorityContract(missing).ok, false);
  const emptyReason = contractFixture();
  emptyReason.entries[0].reason = "  ";
  const emptyResult = validateBlockPriorityContract(emptyReason);
  assert.equal(emptyResult.ok, false);
  assert.ok(emptyResult.errors.some(error => /reason must be non-empty/.test(error)));
});

test("validator rejects provenance, confidence, expert-review, and prohibited priority wording", () => {
  for (const text of ["画像由来で優先", "検証済みだから重点", "高確度の項目", "専門家レビュー済み", "frequent and verified"]) {
    const fixture = contractFixture();
    fixture.entries[0].reason = text;
    const result = validateBlockPriorityContract(fixture);
    assert.equal(result.ok, false, `must reject ${text}`);
    assert.ok(result.errors.some(error => /prohibited priority\/provenance claim/.test(error)), result.errors.join("\n"));
  }
  const disclaimer = contractFixture();
  disclaimer.disclaimer = "優先度は確度と専門家レビューを表す";
  assert.equal(validateBlockPriorityContract(disclaimer).ok, false);
  const group = contractFixture();
  group.groups.focus.description = "頻出・検証済みの項目";
  assert.equal(validateBlockPriorityContract(group).ok, false);
});

test("validator rejects a drifted focus set or a cross-group assignment", () => {
  const focusDrift = contractFixture();
  focusDrift.groups.focus.specimenKeys[1] = "diencephalon";
  assert.equal(validateBlockPriorityContract(focusDrift).ok, false);
  const crossGroup = contractFixture();
  crossGroup.entries[0].group = "development";
  assert.equal(validateBlockPriorityContract(crossGroup).ok, false);
});

test("priority UI is additive and does not introduce specimen geometry or voxel fields", () => {
  const page = fs.readFileSync(path.join(REPOSITORY_ROOT, "app/page.tsx"), "utf8");
  assert.match(page, /BLOCK_PRIORITY_GROUP_KEYS\.map/);
  assert.equal(BLOCK_PRIORITY_GROUPS.focus.label, "β重点 4");
  assert.equal(BLOCK_PRIORITY_GROUPS.development.label, "発展観察 4");
  assert.match(page, /blockPriorityBadge/);
  assert.match(page, /BLOCK_PRIORITY_DISCLAIMER/);
  assert.match(page, /specimenBlock=\{blockSpecimen\}/);
  assert.match(page, /specimenLayers=\{blockLayers\}/);
  assert.match(page, /rotation=\{rotation\}/);
  assert.doesNotMatch(page, /priorityMesh|voxelPatch/);
});
