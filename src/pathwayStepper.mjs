const BASAL_GANGLIA_TARGETS = Object.freeze([
  "caudate",
  "putamen",
  "pallidumExternal",
  "pallidumInternal",
  "subthalamic",
  "substantiaNigra",
  "thalamus",
]);

// Papez is intentionally represented as a provenance-aware observation
// sequence, not as a reconstructed circuit.  The three section stages borrow
// the already published BigBrain labels and quiz positions; the remaining
// stages only reuse the existing 3D teaching overlays/atlas regions.
export const PAPEZ_SECTION_TARGETS = Object.freeze(["hippocampus", "mammillaryBody", "thalamus"]);
export const PAPEZ_SCHEMATIC_3D_TARGETS = Object.freeze(["fornix"]);
export const PAPEZ_ATLAS_3D_TARGETS = Object.freeze(["cingulate", "parahippocampal", "entorhinal"]);
export const PAPEZ_STEP_KINDS = Object.freeze(["section-label", "schematic-3d", "atlas-3d"]);
export const PAPEZ_STEP_SOURCES = Object.freeze(["existing-quiz-section-label", "schematic-3d", "atlas-3d"]);
export const PAPEZ_SECTION_LABEL_IDS = Object.freeze({
  hippocampus: Object.freeze([17, 18]),
  mammillaryBody: Object.freeze([39, 40]),
  thalamus: Object.freeze([15, 16]),
});

export const PAPEZ_STEPS = Object.freeze([
  Object.freeze({
    key: "hippocampus",
    label: "海馬体",
    kind: "section-label",
    source: "existing-quiz-section-label",
    targetKeys: Object.freeze(["hippocampus"]),
    plane: "coronal",
    position: 51,
    quizRefs: Object.freeze(["hippocampus"]),
    labelIds: Object.freeze([17, 18]),
    provenance: "既存クイズの海馬 target と BigBrain ID17・18を再利用",
    note: "3Dメッシュと同じ段階番号で、既存の海馬断面ラベルを確認します。",
  }),
  Object.freeze({
    key: "fornix",
    label: "脳弓",
    kind: "schematic-3d",
    source: "schematic-3d",
    targetKeys: Object.freeze(["fornix"]),
    provenance: "既存 surfaceDeepLandmarks の脳弓模式補助",
    note: "脳弓は模式3Dのみです。実標本の分節や断面ラベルは表示しません。",
  }),
  Object.freeze({
    key: "mammillaryBody",
    label: "乳頭体",
    kind: "section-label",
    source: "existing-quiz-section-label",
    targetKeys: Object.freeze(["mammillaryBody"]),
    plane: "horizontal",
    position: 69,
    quizRefs: Object.freeze(["mammillaryBody"]),
    labelIds: Object.freeze([39, 40]),
    provenance: "既存クイズの乳頭体 target と公開教材ラベルID39・40を再利用",
    reviewStatus: "project-reviewed-expert-pending",
    note: "3D原画像メッシュはなく、断面ではID39・40を表示します。専門家レビューは未完了です。",
  }),
  Object.freeze({
    key: "thalamus",
    label: "視床（前部核は未分節）",
    kind: "section-label",
    source: "existing-quiz-section-label",
    targetKeys: Object.freeze(["thalamus"]),
    plane: "coronal",
    position: 49,
    quizRefs: Object.freeze(["thalamus"]),
    labelIds: Object.freeze([15, 16]),
    provenance: "既存クイズの視床 target と BigBrain ID15・16を再利用",
    note: "視床全体の既存ラベルを表示します。前部核そのものは未分節です。",
  }),
  Object.freeze({
    key: "cingulate",
    label: "帯状回",
    kind: "atlas-3d",
    source: "atlas-3d",
    targetKeys: Object.freeze(["cingulate"]),
    provenance: "既存 CerebrA/Desikan 系の帯状回アトラス領域",
    note: "帯状回はアトラス対応3Dのみです。画像分節や断面Canvasは表示しません。",
  }),
  Object.freeze({
    key: "parahippocampal-entorhinal",
    label: "海馬傍回・嗅内野",
    kind: "atlas-3d",
    source: "atlas-3d",
    targetKeys: Object.freeze(["parahippocampal", "entorhinal"]),
    provenance: "既存 CerebrA/Desikan 系の海馬傍回・嗅内野アトラス領域",
    note: "海馬傍回・嗅内野はアトラス対応3Dのみです。画像分節や断面Canvasは表示しません。",
  }),
]);

export const PAPEZ_TARGET_ALLOWLIST = Object.freeze({
  "section-label": PAPEZ_SECTION_TARGETS,
  "schematic-3d": PAPEZ_SCHEMATIC_3D_TARGETS,
  "atlas-3d": PAPEZ_ATLAS_3D_TARGETS,
});

// Keep this mapping beside the audit logic so a later app-label edit cannot
// silently change which voxels a stepper stage paints. The audit script also
// compares it with structures.*.bigbrainIds in app/page.tsx.
export const BASAL_GANGLIA_LABEL_IDS = Object.freeze({
  caudate: Object.freeze([7, 8]),
  putamen: Object.freeze([9, 10]),
  pallidumExternal: Object.freeze([11, 12]),
  pallidumInternal: Object.freeze([13, 14]),
  subthalamic: Object.freeze([5, 6]),
  substantiaNigra: Object.freeze([3, 4]),
  thalamus: Object.freeze([15, 16]),
});

// These are deliberately existing quiz positions, not new anatomical
// landmarks. A grouped stage uses the same section for every listed label.
export const BASAL_GANGLIA_STEPS = Object.freeze([
  Object.freeze({
    key: "striatum",
    label: "尾状核・被殻（線条体）",
    targetKeys: Object.freeze(["caudate", "putamen"]),
    plane: "coronal",
    position: 61,
    quizRefs: Object.freeze(["putamen"]),
  }),
  Object.freeze({
    key: "pallidum",
    label: "淡蒼球外節・内節",
    targetKeys: Object.freeze(["pallidumExternal", "pallidumInternal"]),
    plane: "coronal",
    position: 57,
    quizRefs: Object.freeze(["pallidum"]),
  }),
  Object.freeze({
    key: "subthalamic",
    label: "視床下核",
    targetKeys: Object.freeze(["subthalamic"]),
    plane: "horizontal",
    position: 66,
    quizRefs: Object.freeze(["subthalamic"]),
  }),
  Object.freeze({
    key: "substantia-nigra",
    label: "黒質",
    targetKeys: Object.freeze(["substantiaNigra"]),
    plane: "horizontal",
    position: 69,
    quizRefs: Object.freeze(["substantiaNigra"]),
  }),
  Object.freeze({
    key: "thalamus",
    label: "視床",
    targetKeys: Object.freeze(["thalamus"]),
    plane: "coronal",
    position: 49,
    quizRefs: Object.freeze(["thalamus"]),
  }),
]);

export const BASAL_GANGLIA_TARGET_SET = new Set(BASAL_GANGLIA_TARGETS);

function axisForPlane(plane, dims) {
  if (plane === "coronal") return {axis: 1, length: dims[1], reverse: false};
  if (plane === "horizontal") return {axis: 2, length: dims[2], reverse: true};
  if (plane === "sagittal") return {axis: 0, length: dims[0], reverse: false};
  throw new Error(`unknown plane ${plane}`);
}

export function sliceIndexForPosition(plane, position, dims) {
  const {length, reverse} = axisForPlane(plane, dims);
  const fraction = Math.max(0, Math.min(1, Number(position) / 100));
  return Math.round((reverse ? 1 - fraction : fraction) * (length - 1));
}

export function advanceBasalStepperIndex(current, stepCount = BASAL_GANGLIA_STEPS.length) {
  const last = Math.max(0, Number(stepCount) - 1);
  return Math.min(last, Math.max(0, Number(current) || 0) + 1);
}

/**
 * Start the small stepper clock with injectable scheduling for deterministic
 * tests. The caller owns the returned cleanup function.
 */
export function startBasalGangliaStepperTimer({active = false, onStep, intervalMs = 1400, schedule = setInterval, cancel = clearInterval} = {}) {
  if (!active || typeof onStep !== "function") return () => {};
  const timer = schedule(onStep, intervalMs);
  return () => cancel(timer);
}

export function advancePapezStepperIndex(current, stepCount = PAPEZ_STEPS.length) {
  const last = Math.max(0, Number(stepCount) - 1);
  return Math.min(last, Math.max(0, Number(current) || 0) + 1);
}

/** Papez uses the same cleanup contract as the basal-ganglia stepper. */
export function startPapezStepperTimer({active = false, onStep, intervalMs = 1400, schedule = setInterval, cancel = clearInterval} = {}) {
  if (!active || typeof onStep !== "function") return () => {};
  const timer = schedule(onStep, intervalMs);
  return () => cancel(timer);
}

function index3d(x, y, z, dims) {
  return x + dims[0] * (y + dims[1] * z);
}

/**
 * Count existing segmentation voxels for one label group on one exact slice.
 * This is an audit helper; it never creates or modifies a label.
 */
export function countLabelPixelsAtSlice(labels, dims, plane, position, labelIds) {
  const {axis, length} = axisForPlane(plane, dims);
  const slice = sliceIndexForPosition(plane, position, dims);
  if (slice < 0 || slice >= length) return 0;
  const ids = new Set(labelIds);
  let count = 0;
  for (let x = 0; x < dims[0]; x += 1) {
    for (let y = 0; y < dims[1]; y += 1) {
      for (let z = 0; z < dims[2]; z += 1) {
        if ((axis === 0 ? x : axis === 1 ? y : z) !== slice) continue;
        if (ids.has(labels[index3d(x, y, z, dims)])) count += 1;
      }
    }
  }
  return count;
}

/**
 * Validate the small teaching stepper against the existing quiz positions and
 * the checked-in practical segmentation. This intentionally checks visibility,
 * not anatomical correctness or connectivity.
 */
export function auditBasalGangliaStepper({steps = BASAL_GANGLIA_STEPS, quizQuestions = [], dims, labels, labelIdsByTarget = BASAL_GANGLIA_LABEL_IDS} = {}) {
  const errors = [];
  const summaries = [];
  const seen = new Set();
  if (!Array.isArray(steps) || steps.length === 0) errors.push("stepper must contain at least one step");
  if (!Array.isArray(dims) || dims.length !== 3 || !labels) {
    errors.push("segmentation dimensions and labels are required");
    return {ok: false, errors, summary: {stepCount: 0, targetCount: 0, pixelCounts: {}}};
  }
  for (const [index, step] of (steps ?? []).entries()) {
    const prefix = `step ${index + 1}`;
    if (!step?.key || !step?.label) errors.push(`${prefix}: key and label are required`);
    if (!Array.isArray(step?.targetKeys) || step.targetKeys.length === 0) errors.push(`${prefix}: targetKeys are required`);
    if (step?.plane !== "coronal" && step?.plane !== "horizontal" && step?.plane !== "sagittal") errors.push(`${prefix}: unknown plane ${step?.plane}`);
    for (const target of step?.targetKeys ?? []) {
      if (!BASAL_GANGLIA_TARGET_SET.has(target)) errors.push(`${prefix}: target ${target} is outside the audited basal-ganglia set`);
      if (seen.has(target)) errors.push(`${prefix}: target ${target} appears in more than one step`);
      seen.add(target);
      const expectedIds = BASAL_GANGLIA_LABEL_IDS[target] ?? [];
      const configuredIds = labelIdsByTarget?.[target];
      if (!Array.isArray(configuredIds) || configuredIds.length !== expectedIds.length || configuredIds.some((id, index) => id !== expectedIds[index])) {
        errors.push(`${prefix}: ${target} label IDs drift from the audited mapping`);
      }
    }
    const refs = step?.quizRefs ?? [];
    if (!refs.length || !refs.some(target => quizQuestions.some(question => question.target === target && question.plane === step.plane && question.position === step.position))) {
      errors.push(`${prefix}: position ${step?.plane} ${step?.position} is not reused from an existing quiz question`);
    }
    const pixelCounts = {};
    for (const target of step?.targetKeys ?? []) {
      const labelIds = labelIdsByTarget?.[target] ?? [];
      const count = countLabelPixelsAtSlice(labels, dims, step.plane, step.position, labelIds);
      pixelCounts[target] = count;
      if (count <= 0) errors.push(`${prefix}: ${target} has no visible label pixels at ${step.plane} ${step.position}`);
    }
    summaries.push({key: step.key, label: step.label, plane: step.plane, position: step.position, pixelCounts});
  }
  for (const target of BASAL_GANGLIA_TARGETS) if (!seen.has(target)) errors.push(`target ${target} is missing from the stepper`);
  return {
    ok: errors.length === 0,
    errors,
    summary: {
      stepCount: summaries.length,
      targetCount: seen.size,
      targetKeys: [...seen],
      stages: summaries,
      pixelCounts: Object.fromEntries(summaries.flatMap(stage => Object.entries(stage.pixelCounts))),
    },
  };
}

const PAPEZ_FORBIDDEN_TEXT = /(乳頭視床路|乳頭視床束|帯状束|投射線維|投射方向|興奮性|抑制性|excitatory|inhibitory|projection\s+fiber|mammillothalamic|cingulum\s+bundle)/i;
const PAPEZ_FORBIDDEN_TARGET_PATTERN = /optic|視覚/;
const PAPEZ_FORBIDDEN_ATLAS_IDS = new Set([30 + 3, 30 + 6, 30 + 7, 30 + 8].map(String));

function exactArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

/**
 * Validate Papez's six observation stages without treating the sequence as a
 * tract reconstruction.  Section stages are checked against the same quiz
 * positions and label pixels used by the existing section quiz; 3D-only
 * stages must not carry a fabricated section position or label IDs.
 */
export function auditPapezStepper({steps = PAPEZ_STEPS, quizQuestions = [], dims, labels, labelIdsByTarget = PAPEZ_SECTION_LABEL_IDS} = {}) {
  const errors = [];
  const summaries = [];
  const seen = new Set();
  const expectedSteps = PAPEZ_STEPS;
  if (!Array.isArray(steps) || steps.length !== expectedSteps.length) errors.push(`Papez stepper must contain exactly ${expectedSteps.length} steps`);
  if (!Array.isArray(dims) || dims.length !== 3 || !labels) {
    errors.push("segmentation dimensions and labels are required for Papez section audit");
    return {ok: false, errors, summary: {stepCount: 0, targetCount: 0, stages: [], sectionPixelCounts: {}}};
  }
  for (const [index, step] of (steps ?? []).entries()) {
    const expected = expectedSteps[index];
    const prefix = `Papez step ${index + 1}`;
    if (!step || !expected) {
      errors.push(`${prefix}: unexpected stage`);
      continue;
    }
    if (step.key !== expected.key || step.label !== expected.label) errors.push(`${prefix}: stage order/key/label drift`);
    if (!PAPEZ_STEP_KINDS.includes(step.kind)) errors.push(`${prefix}: unknown kind ${step.kind}`);
    if (!PAPEZ_STEP_SOURCES.includes(step.source)) errors.push(`${prefix}: unknown source ${step.source}`);
    if (step.kind !== expected.kind || step.source !== expected.source) errors.push(`${prefix}: kind/source does not match the audited stage`);
    const allowlist = PAPEZ_TARGET_ALLOWLIST[step.kind] ?? [];
    if (!Array.isArray(step.targetKeys) || step.targetKeys.length === 0) errors.push(`${prefix}: targetKeys are required`);
    if (!exactArray(step.targetKeys, expected.targetKeys)) errors.push(`${prefix}: targetKeys do not match the audited stage`);
    if (!Array.isArray(step.targetKeys) || step.targetKeys.some(target => !allowlist.includes(target))) errors.push(`${prefix}: target is outside the ${step.kind} allowlist`);
    for (const target of step.targetKeys ?? []) {
      if (seen.has(target)) errors.push(`${prefix}: target ${target} appears in more than one stage`);
      seen.add(target);
      if (step.kind === "section-label") {
        const expectedIds = PAPEZ_SECTION_LABEL_IDS[target] ?? [];
        const configuredIds = labelIdsByTarget?.[target];
        if (!exactArray(configuredIds, expectedIds)) errors.push(`${prefix}: ${target} label IDs drift from the audited mapping`);
      }
      if (PAPEZ_FORBIDDEN_TARGET_PATTERN.test(String(target)) || PAPEZ_FORBIDDEN_ATLAS_IDS.has(String(target))) errors.push(`${prefix}: forbidden optic-pathway target ${target}`);
    }
    const text = [step.key, step.label, step.provenance, step.note, ...(step.targetKeys ?? [])].join(" ");
    if (PAPEZ_FORBIDDEN_TEXT.test(text)) errors.push(`${prefix}: prohibited pathway/physiology claim`);
    if (Object.prototype.hasOwnProperty.call(step, "geometry") || Object.prototype.hasOwnProperty.call(step, "meshFile") || Object.prototype.hasOwnProperty.call(step, "voxelPatch")) errors.push(`${prefix}: new geometry/voxel fields are not allowed`);
    if (step.kind === "section-label") {
      if (!step.plane || !["coronal", "horizontal", "sagittal"].includes(step.plane) || !Number.isFinite(step.position)) errors.push(`${prefix}: section plane and position are required`);
      if (!Array.isArray(step.quizRefs) || !step.quizRefs.length || !step.quizRefs.some(target => quizQuestions.some(question => question.target === target && question.plane === step.plane && question.position === step.position))) errors.push(`${prefix}: section position is not reused from an existing quiz question`);
      if (!exactArray(step.labelIds, PAPEZ_SECTION_LABEL_IDS[step.targetKeys?.[0]] ?? [])) errors.push(`${prefix}: section label IDs are missing or drifted`);
      const pixelCounts = {};
      for (const target of step.targetKeys ?? []) {
        const count = countLabelPixelsAtSlice(labels, dims, step.plane, step.position, labelIdsByTarget?.[target] ?? []);
        pixelCounts[target] = count;
        if (count <= 0) errors.push(`${prefix}: ${target} has no visible label pixels at ${step.plane} ${step.position}`);
      }
      if (step.key === "mammillaryBody" && step.reviewStatus !== "project-reviewed-expert-pending") errors.push(`${prefix}: mammillary expert-pending status must remain explicit`);
      summaries.push({key: step.key, label: step.label, kind: step.kind, source: step.source, targetKeys: [...step.targetKeys], plane: step.plane, position: step.position, sectionCanvas: true, pixelCounts});
    } else {
      if (Object.prototype.hasOwnProperty.call(step, "plane") || Object.prototype.hasOwnProperty.call(step, "position") || Object.prototype.hasOwnProperty.call(step, "quizRefs") || Object.prototype.hasOwnProperty.call(step, "labelIds")) errors.push(`${prefix}: 3D-only stage must not carry section fields`);
      summaries.push({key: step.key, label: step.label, kind: step.kind, source: step.source, targetKeys: [...(step.targetKeys ?? [])], sectionCanvas: false, pixelCounts: {}});
    }
  }
  for (const target of [...PAPEZ_SECTION_TARGETS, ...PAPEZ_SCHEMATIC_3D_TARGETS, ...PAPEZ_ATLAS_3D_TARGETS]) if (!seen.has(target)) errors.push(`Papez target ${target} is missing from the stepper`);
  return {
    ok: errors.length === 0,
    errors,
    summary: {
      stepCount: summaries.length,
      targetCount: seen.size,
      targetKeys: [...seen],
      stages: summaries,
      sectionPixelCounts: Object.fromEntries(summaries.flatMap(stage => Object.entries(stage.pixelCounts))),
    },
  };
}

export { BASAL_GANGLIA_TARGETS };
