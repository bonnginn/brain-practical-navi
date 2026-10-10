const finite = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const planes = ['coronal', 'horizontal', 'sagittal'];
const rotationValid = value => record(value) && ['x', 'y'].every(key => finite(value[key], -1e9, 1e9)) && (value.z === undefined || finite(value.z, -1e9, 1e9));
const rotationCopy = value => ({x: value.x, y: value.y, ...(value.z === undefined ? {} : {z: value.z})});
const pointValid = (value, min, max) => record(value) && ['x', 'y'].every(key => finite(value[key], min, max));
const readingValid = value => record(value) && finite(value.scroll, 0, 1e7) && Array.isArray(value.openDetails) && value.openDetails.length <= 200 && new Set(value.openDetails).size === value.openDetails.length && value.openDetails.every(index => Number.isInteger(index) && index >= 0 && index < 200);
const readingCopy = value => ({scroll: value.scroll, openDetails: [...value.openDetails]});
const indexValid = (value, count) => Number.isInteger(count) && count > 0 && Number.isInteger(value) && value >= 0 && value < count;

// Authored task references are persisted; labels, prose and answer scores are not.
export function findTaskSignature(task) {
  if (!record(task) || typeof task.key !== 'string' || !['section', 'surface', 'neurovascular'].includes(task.kind) || !planes.includes(task.plane) || !finite(task.position, 0, 100) || !rotationValid(task.rotation) || !['both', 'left', 'right'].includes(task.hemisphere) || typeof task.medial !== 'boolean' || !['none', 'vessels', 'nerves'].includes(task.overlay) || !Array.isArray(task.highlight?.ids)) return '';
  return JSON.stringify([task.key, task.kind, task.plane, task.position, rotationCopy(task.rotation), task.hemisphere, task.medial, task.overlay, task.highlight.ids]);
}

export function readFindProgress(saved, tasks) {
  if (!record(saved) || !Array.isArray(tasks)) return null;
  const task = tasks.find(item => item?.key === saved.taskKey);
  const signature = findTaskSignature(task);
  if (!signature || saved.signature !== signature) return null;
  const view = saved.state;
  if (!record(view) || !['search', 'hint', 'answer'].includes(view.stage) || typeof view.answerChecked !== 'boolean' || (view.stage === 'answer') !== view.answerChecked || !planes.includes(view.plane) || !finite(view.position, 0, 100) || !rotationValid(view.rotation)) return null;
  if (task.kind !== 'section' && view.plane !== task.plane) return null;
  if (!finite(view.zoom, task.kind === 'section' ? .75 : .7, task.kind === 'section' ? 5 : 2.4) || !pointValid(view.pan, -1e6, 1e6)) return null;
  if (view.guess !== null && !pointValid(view.guess, 0, 100)) return null;
  if (!readingValid(view.reading)) return null;
  if (saved.start !== null && (!record(saved.start) || task.kind !== 'section' || !planes.includes(saved.start.plane) || !finite(saved.start.position, 0, 100))) return null;
  return {taskKey: task.key, signature, state: {stage: view.stage, answerChecked: view.answerChecked, plane: view.plane, position: view.position, rotation: rotationCopy(view.rotation), zoom: view.zoom, pan: {x: view.pan.x, y: view.pan.y}, guess: view.guess ? {x: view.guess.x, y: view.guess.y} : null, reading: readingCopy(view.reading)}, start: saved.start ? {plane: saved.start.plane, position: saved.start.position} : null};
}

export function readCircuitProgress(saved, registry) {
  if (!record(saved) || !record(registry) || !record(registry.circuits)) return null;
  const allowed = Object.keys(registry.circuits);
  const pathFor = (key, pathKey) => allowed.includes(key) && Array.isArray(registry.circuits[key]?.paths) ? registry.circuits[key].paths.find(path => path.key === pathKey) : null;
  if (!(saved.selected === null || allowed.includes(saved.selected)) || !['structures', 'circuits'].includes(saved.inspector) || !record(saved.positions) || Object.keys(saved.positions).length > allowed.length) return null;
  const positions = {};
  for (const [key, value] of Object.entries(saved.positions)) {
    const path = pathFor(key, value?.pathKey);
    if (!path || !Array.isArray(path.nodes) || !Number.isInteger(value.nodeIndex) || value.nodeIndex < 0 || path.nodes[value.nodeIndex] !== value.nodeKey) return null;
    positions[key] = {pathKey: path.key, nodeIndex: value.nodeIndex, nodeKey: value.nodeKey};
  }
  if (saved.selected && !Object.hasOwn(positions, saved.selected)) return null;
  if (!record(saved.readings) || Object.keys(saved.readings).length > 1000) return null;
  const readings = {};
  for (const [key, value] of Object.entries(saved.readings)) {
    const [circuitKey, pathKey, index, nodeKey, ...extra] = key.split('|');
    const path = pathFor(circuitKey, pathKey);
    if (extra.length || !path || !Array.isArray(path.nodes) || !/^\d+$/.test(index) || !Number.isSafeInteger(Number(index)) || String(Number(index)) !== index || path.nodes[Number(index)] !== nodeKey || !readingValid(value)) return null;
    readings[key] = readingCopy(value);
  }
  const view = saved.view;
  let normalizedView = null;
  if (view !== null) {
    if (!record(view) || !rotationValid(view.rotation) || !finite(view.zoom, .7, 2.4) || !pointValid(view.pan, -1e6, 1e6) || !['both', 'left', 'right'].includes(view.hemisphere) || !['view', 'guide'].includes(view.mobilePane)) return null;
    if (!Array.isArray(registry.freeKeys) || !Array.isArray(view.freeSelections) || view.freeSelections.length > registry.freeKeys.length || new Set(view.freeSelections).size !== view.freeSelections.length || !view.freeSelections.every(key => registry.freeKeys.includes(key)) || !(view.freeFocused === null || registry.freeKeys.includes(view.freeFocused))) return null;
    if (!['ghost', 'cerebellum', 'vessels', 'nerves', 'ponsMedulla', 'sectionsOpen'].every(key => typeof view[key] === 'boolean')) return null;
    if (!indexValid(view.basalStep, registry.basalCount) || !indexValid(view.papezStep, registry.papezCount) || !(view.visualIndex === null || indexValid(view.visualIndex, registry.visualCount))) return null;
    let papezSlice;
    if (view.papezSlice !== undefined) {
      const slice = view.papezSlice;
      if (!record(slice) || !indexValid(slice.step, registry.papezCount) || slice.step !== view.papezStep || !planes.includes(slice.plane) || !Array.isArray(registry.papezSectionPlanes) || registry.papezSectionPlanes[slice.step] !== slice.plane || !finite(slice.zoom, .75, 5) || !pointValid(slice.pan, -1e6, 1e6)) return null;
      papezSlice = {step: slice.step, plane: slice.plane, zoom: slice.zoom, pan: {x: slice.pan.x, y: slice.pan.y}};
    }
    normalizedView = {rotation: rotationCopy(view.rotation), zoom: view.zoom, pan: {x: view.pan.x, y: view.pan.y}, hemisphere: view.hemisphere, mobilePane: view.mobilePane, freeSelections: [...view.freeSelections], freeFocused: view.freeFocused, ghost: view.ghost, cerebellum: view.cerebellum, vessels: view.vessels, nerves: view.nerves, ponsMedulla: view.ponsMedulla, sectionsOpen: view.sectionsOpen, basalStep: view.basalStep, papezStep: view.papezStep, visualIndex: view.visualIndex, ...(papezSlice ? {papezSlice} : {})};
  }
  if (!(saved.sectionOrigin === null || allowed.includes(saved.sectionOrigin) && saved.sectionOrigin === saved.selected)) return null;
  return {selected: saved.selected, inspector: saved.inspector, positions, readings, view: normalizedView, sectionOrigin: saved.sectionOrigin};
}
