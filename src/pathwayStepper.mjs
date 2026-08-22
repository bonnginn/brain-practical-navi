const BASAL_GANGLIA_TARGETS = Object.freeze([
  "caudate",
  "putamen",
  "pallidumExternal",
  "pallidumInternal",
  "subthalamic",
  "substantiaNigra",
  "thalamus",
]);

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

export { BASAL_GANGLIA_TARGETS };
