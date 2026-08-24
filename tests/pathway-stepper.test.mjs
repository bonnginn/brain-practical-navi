import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import test from "node:test";
import {advanceBasalStepperIndex, advancePapezStepperIndex, BASAL_GANGLIA_LABEL_IDS, BASAL_GANGLIA_STEPS, auditBasalGangliaStepper, countLabelPixelsAtSlice, PAPEZ_SECTION_LABEL_IDS, PAPEZ_STEPS, auditPapezStepper, startBasalGangliaStepperTimer, startPapezStepperTimer} from "../src/pathwayStepper.mjs";
import {auditPathwayStepper, parseAppStructureLabelIds} from "../scripts/audit_pathway_stepper.mjs";

const root = path.resolve(import.meta.dirname, "..");

function segmentation() {
  const compressed = fs.readFileSync(path.join(root, "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"));
  const buffer = zlib.gunzipSync(compressed);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const dims = [view.getUint16(4, true), view.getUint16(6, true), view.getUint16(8, true)];
  return {dims, labels: new Uint8Array(buffer.buffer, buffer.byteOffset + 10, dims[0] * dims[1] * dims[2])};
}

test("basal-ganglia stepper has only the seven existing targets", () => {
  assert.deepEqual(BASAL_GANGLIA_STEPS.flatMap(step => step.targetKeys), [
    "caudate", "putamen", "pallidumExternal", "pallidumInternal", "subthalamic", "substantiaNigra", "thalamus",
  ]);
  assert.equal(BASAL_GANGLIA_STEPS.length, 5);
  assert.equal(BASAL_GANGLIA_STEPS.some(step => step.targetKeys.includes("opticChiasm")), false);
});

test("audited practical segmentation shows every target at the synchronized step slice", () => {
  const result = auditPathwayStepper(root);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.summary.stepCount, 5);
  assert.equal(result.summary.targetCount, 7);
  for (const stage of result.summary.stages) for (const count of Object.values(stage.pixelCounts)) assert.ok(count > 0);
  assert.deepEqual(result.summary.pixelCounts, {
    caudate: 1170,
    putamen: 1899,
    pallidumExternal: 612,
    pallidumInternal: 558,
    subthalamic: 256,
    substantiaNigra: 574,
    thalamus: 2398,
  });
});

test("free observation wires the stepper controls without introducing pathway geometry", () => {
  const page = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const css = fs.readFileSync(path.join(root, "app/canvas.css"), "utf8");
  const stepper = fs.readFileSync(path.join(root, "src/pathwayStepper.mjs"), "utf8");
  assert.match(page, /aria-label="大脳基底核回路の位置関係ステッパー"/);
  assert.match(page, /startBasalGangliaStepperTimer/);
  assert.match(page, /workspace==="surface"&&surfaceView==="free"/);
  assert.match(page, /showFocus=\{surfaceView==="free"\}/);
  assert.match(page, /if\(!basalStepperActive\)setBasalStepperPlaying\(false\)/);
  assert.match(page, /最初へ戻る/);
  assert.match(page, /一時停止/);
  assert.match(page, /3Dと断面を同じ色で表示/);
  assert.match(page, /既存の手動分節ラベルを3Dと断面で同期表示します/);
  assert.match(page, /新しい境界、線、結合、興奮／抑制、投射方向は追加していません/);
  assert.match(page, /selectionMeshLayers=\{surfaceView==="free"\?\(basalStepperActive\?freePathwayMeshLayers:papezStepperActive\?papezStepperMeshLayers:freePathwayMeshLayers\):\[\]\}/);
  assert.match(page, /freeSelections\.length===0&&selectedPathway===null/);
  assert.match(css, /\.pathwayStepperControls button \{[^}]*min-height:\s*44px/);
  assert.match(css, /\.pathwayStepperSliceStage\{height:\s*270px\}/);
  assert.doesNotMatch(stepper, /opticChiasm|33/);
});

test("stepper timer advances to the last stage and cleans up deterministically", () => {
  let scheduled = null;
  const cancelled = [];
  let ticks = 0;
  const stop = startBasalGangliaStepperTimer({
    active: true,
    intervalMs: 1400,
    onStep: () => { ticks += 1; },
    schedule: (callback, delay) => { scheduled = {callback, delay, id: 23}; return 23; },
    cancel: id => cancelled.push(id),
  });
  assert.equal(scheduled.delay, 1400);
  scheduled.callback();
  assert.equal(ticks, 1);
  stop();
  assert.deepEqual(cancelled, [23]);

  assert.equal(advanceBasalStepperIndex(0, BASAL_GANGLIA_STEPS.length), 1);
  assert.equal(advanceBasalStepperIndex(BASAL_GANGLIA_STEPS.length - 1, BASAL_GANGLIA_STEPS.length), BASAL_GANGLIA_STEPS.length - 1);
  assert.equal(advanceBasalStepperIndex(-5, 0), 0);
  assert.deepEqual(BASAL_GANGLIA_LABEL_IDS.thalamus, [15, 16]);
  let inactiveScheduled = false;
  const inactiveStop = startBasalGangliaStepperTimer({active: false, onStep: () => {}, schedule: () => { inactiveScheduled = true; return 1; }});
  inactiveStop();
  assert.equal(inactiveScheduled, false);
});

test("pixel audit rejects a grouped stage when one label disappears", () => {
  const {dims, labels} = segmentation();
  const steps = BASAL_GANGLIA_STEPS.map(step => ({...step, targetKeys: [...step.targetKeys]}));
  steps[0].targetKeys = ["caudate", "putamen"];
  for (let i = 0; i < labels.length; i += 1) if (labels[i] === 9 || labels[i] === 10) labels[i] = 0;
  const result = auditBasalGangliaStepper({steps, dims, labels, quizQuestions: [{target: "putamen", plane: "coronal", position: 61}]});
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => /putamen has no visible label pixels/.test(error)), result.errors.join("\n"));
});

test("stepper refuses a position that is not borrowed from the quiz", () => {
  const {dims, labels} = segmentation();
  const steps = BASAL_GANGLIA_STEPS.map(step => ({...step, targetKeys: [...step.targetKeys]}));
  steps[0].position = 60;
  const result = auditBasalGangliaStepper({steps, dims, labels, quizQuestions: [{target: "putamen", plane: "coronal", position: 61}]});
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => /not reused from an existing quiz question/.test(error)), result.errors.join("\n"));
});

test("label audit rejects drift from the app structure registry", () => {
  const {dims, labels} = segmentation();
  const result = auditBasalGangliaStepper({
    dims,
    labels,
    quizQuestions: [{target: "putamen", plane: "coronal", position: 61}],
    labelIdsByTarget: {...BASAL_GANGLIA_LABEL_IDS, putamen: [9, 99]},
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => /putamen label IDs drift/.test(error)), result.errors.join("\n"));
});

test("pathway audit parser reads all seven app structure label ID pairs", () => {
  const source = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const ids = parseAppStructureLabelIds(source);
  assert.deepEqual(ids, {
    caudate: [7, 8],
    putamen: [9, 10],
    pallidumExternal: [11, 12],
    pallidumInternal: [13, 14],
    subthalamic: [5, 6],
    substantiaNigra: [3, 4],
    thalamus: [15, 16],
  });
  const drifted = source.replace(/(thalamus: \{[^\n]*?bigbrainIds:\[)15,16/, "$115,99");
  assert.deepEqual(parseAppStructureLabelIds(drifted).thalamus, [15, 99]);
});

test("slice pixel helper uses the same reversed horizontal position convention as the canvas", () => {
  const labels = new Uint8Array(2 * 2 * 3);
  labels[2 * (1 + 2 * 0)] = 7;
  assert.equal(countLabelPixelsAtSlice(labels, [2, 2, 3], "horizontal", 100, [7]), 1);
  assert.equal(countLabelPixelsAtSlice(labels, [2, 2, 3], "horizontal", 0, [7]), 0);
});

test("Papez stepper keeps the six stages in the audited provenance order", () => {
  assert.deepEqual(PAPEZ_STEPS.map(step => [step.key, step.kind, step.source, [...step.targetKeys]]), [
    ["hippocampus", "section-label", "existing-quiz-section-label", ["hippocampus"]],
    ["fornix", "schematic-3d", "schematic-3d", ["fornix"]],
    ["mammillaryBody", "section-label", "existing-quiz-section-label", ["mammillaryBody"]],
    ["thalamus", "section-label", "existing-quiz-section-label", ["thalamus"]],
    ["cingulate", "atlas-3d", "atlas-3d", ["cingulate"]],
    ["parahippocampal-entorhinal", "atlas-3d", "atlas-3d", ["parahippocampal", "entorhinal"]],
  ]);
  assert.deepEqual(PAPEZ_STEPS.filter(step => step.kind === "section-label").map(step => [step.plane, step.position, step.labelIds]), [
    ["coronal", 51, [17, 18]],
    ["horizontal", 69, [39, 40]],
    ["coronal", 49, [15, 16]],
  ]);
  assert.equal(PAPEZ_STEPS.find(step => step.key === "mammillaryBody").reviewStatus, "project-reviewed-expert-pending");
  assert.match(PAPEZ_STEPS.find(step => step.key === "thalamus").label, /前部核は未分節/);
});

test("Papez section stages show existing pixels and 3D-only stages do not invent a section", () => {
  const result = auditPapezStepper({
    ...segmentation(),
    quizQuestions: [
      {target: "hippocampus", plane: "coronal", position: 51},
      {target: "mammillaryBody", plane: "horizontal", position: 69},
      {target: "thalamus", plane: "coronal", position: 49},
    ],
  });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.summary.stepCount, 6);
  assert.equal(result.summary.targetCount, 7);
  assert.deepEqual(result.summary.sectionPixelCounts, {hippocampus: 1400, mammillaryBody: 120, thalamus: 2398});
  assert.deepEqual(result.summary.stages.filter(stage => !stage.sectionCanvas).map(stage => stage.key), ["fornix", "cingulate", "parahippocampal-entorhinal"]);
  assert.equal(advancePapezStepperIndex(0, PAPEZ_STEPS.length), 1);
  assert.equal(advancePapezStepperIndex(PAPEZ_STEPS.length - 1, PAPEZ_STEPS.length), PAPEZ_STEPS.length - 1);
  assert.deepEqual(PAPEZ_SECTION_LABEL_IDS, {hippocampus: [17, 18], mammillaryBody: [39, 40], thalamus: [15, 16]});
});

test("Papez audit rejects optic IDs, fabricated section fields, geometry, and tract claims", () => {
  const base = {
    ...segmentation(),
    quizQuestions: [
      {target: "hippocampus", plane: "coronal", position: 51},
      {target: "mammillaryBody", plane: "horizontal", position: 69},
      {target: "thalamus", plane: "coronal", position: 49},
    ],
  };
  const optic = PAPEZ_STEPS.map(step => ({...step, targetKeys: [...step.targetKeys]}));
  optic[1].targetKeys = ["33"];
  assert.equal(auditPapezStepper({...base, steps: optic}).ok, false);
  const fabricatedSection = PAPEZ_STEPS.map(step => ({...step, targetKeys: [...step.targetKeys]}));
  fabricatedSection[1].plane = "coronal";
  fabricatedSection[1].position = 51;
  assert.equal(auditPapezStepper({...base, steps: fabricatedSection}).ok, false);
  const geometry = PAPEZ_STEPS.map(step => ({...step, targetKeys: [...step.targetKeys]}));
  geometry[4].geometry = {vertices: []};
  assert.equal(auditPapezStepper({...base, steps: geometry}).ok, false);
  const overclaim = PAPEZ_STEPS.map(step => ({...step, targetKeys: [...step.targetKeys]}));
  overclaim[0].note = "projection fiber and excitatory connection";
  assert.equal(auditPapezStepper({...base, steps: overclaim}).ok, false);
});

test("Papez timer advances and cleans up without changing the basal timer contract", () => {
  let scheduled = null;
  const cancelled = [];
  let ticks = 0;
  const stop = startPapezStepperTimer({
    active: true,
    intervalMs: 1400,
    onStep: () => { ticks += 1; },
    schedule: (callback, delay) => { scheduled = {callback, delay}; return 41; },
    cancel: id => cancelled.push(id),
  });
  assert.equal(scheduled.delay, 1400);
  scheduled.callback();
  assert.equal(ticks, 1);
  stop();
  assert.deepEqual(cancelled, [41]);
  let inactiveScheduled = false;
  const inactiveStop = startPapezStepperTimer({active: false, onStep: () => {}, schedule: () => { inactiveScheduled = true; return 1; }});
  inactiveStop();
  assert.equal(inactiveScheduled, false);
  assert.equal(advanceBasalStepperIndex(0, BASAL_GANGLIA_STEPS.length), 1);
});

test("Papez UI uses one shared stepper control group and omits section Canvas for 3D-only stages", () => {
  const page = fs.readFileSync(path.join(root, "app/page.tsx"), "utf8");
  const css = fs.readFileSync(path.join(root, "app/canvas.css"), "utf8");
  assert.match(page, /aria-label="Papez回路の由来別位置関係ステッパー"/);
  assert.match(page, /startPapezStepperTimer/);
  assert.match(page, /papezStepperStep\.kind===\"section-label\"&&<div className="pathwayStepperSlice"/);
  assert.match(page, /papezStepperStep\.kind!==\"section-label\"&&<div className="pathwayStepper3dOnlyNote"/);
  assert.match(page, /前部核は未分節/);
  assert.match(page, /専門家レビュー未完了/);
  assert.match(page, /新しいボクセル、メッシュ、線維束、結合、投射方向、興奮／抑制は追加していません/);
  assert.match(page, /papezStepperActive\?papezStepperSurfaceHighlights/);
  assert.match(page, /papezStepperActive\?papezStepperMeshLayers/);
  assert.match(page, /papezStepperHasMesh\?"3D／断面同期":"断面ラベルのみ"/);
  assert.match(page, /"existing-quiz-section-label":"既存クイズ断面ラベル"/);
  assert.match(page, /if\(key==="papez"\)\{[\s\S]*?setPapezStepperIndex\(0\);[\s\S]*?setSurfaceGhost\(true\);[\s\S]*?return;/);
  const papezBranch=page.match(/if\(key==="papez"\)\{(?<body>[\s\S]*?)\n\s*return;/)?.groups?.body??"";
  assert.doesNotMatch(papezBranch, /setFreeSelections|setFreeFocusedKey/);
  const meshMapping=page.match(/const structureMeshFiles:[\s\S]*?=\{(?<body>[\s\S]*?)\n\};/)?.groups?.body??"";
  assert.doesNotMatch(meshMapping, /mammillaryBody/);
  assert.match(css, /\.pathwayStepper3dOnlyNote/);
  assert.match(css, /\.papezPathwayStepper/);
  assert.doesNotMatch(page, /PAPEZ_STEPS[\s\S]{0,300}opticChiasm/);
});

test("combined pathway audit retains basal result and passes Papez", () => {
  const result = auditPathwayStepper(root);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.summary.stepCount, 5);
  assert.equal(result.summary.papez.stepCount, 6);
  assert.equal(result.summary.basal.targetCount, 7);
  assert.equal(result.summary.papez.sectionPixelCounts.mammillaryBody, 120);
});
