import {readSectionReader} from './sectionReader.mjs';
import {readFindProgress, readCircuitProgress} from './explorationProgress.mjs';

// Separate from Mac's whole-learning record and Windows quiz history. No migration,
// automatic navigation, record deletion or score restoration happens in this module.
export const WINDOWS_EXPLORATION_PROGRESS_KEY = 'brain-practical-navigator:windows-exploration:v1';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const planes = ['coronal', 'horizontal', 'sagittal'];
const rotationValid = value => record(value) && ['x', 'y'].every(key => finite(value[key], -1e9, 1e9)) && (value.z === undefined || finite(value.z, -1e9, 1e9));
const rotationCopy = value => ({x: value.x, y: value.y, ...(value.z === undefined ? {} : {z: value.z})});
const pointValid = value => record(value) && ['x', 'y'].every(key => finite(value[key], -1e6, 1e6));
const keysValid = (values, allowed) => Array.isArray(values) && Array.isArray(allowed) && values.length <= allowed.length && new Set(values).size === values.length && values.every(key => allowed.includes(key));
const indexValid = (value, count) => Number.isInteger(count) && count > 0 && Number.isInteger(value) && value >= 0 && value < count;
const optionalViewportValid = value => (value.zoom === undefined || finite(value.zoom, .7, 2.4)) && (value.pan === undefined || pointValid(value.pan)) && (value.mobilePane === undefined || ['view', 'guide'].includes(value.mobilePane));
const optionalViewportCopy = value => ({...(value.zoom === undefined ? {} : {zoom: value.zoom}), ...(value.pan === undefined ? {} : {pan: {x: value.pan.x, y: value.pan.y}}), ...(value.mobilePane === undefined ? {} : {mobilePane: value.mobilePane})});

export function readWindowsObservationSnapshot(value, registry) {
  if (!record(value) || !record(registry) || !rotationValid(value.rotation) || typeof value.search !== 'string' || value.search.length > 5000) return null;
  if (value.workspace === 'sections') {
    if (!Array.isArray(registry.structureKeys) || !registry.structureKeys.includes(value.target) || !keysValid(value.visible, registry.structureKeys) || !(value.themeKey === null || Array.isArray(registry.themeKeys) && registry.themeKeys.includes(value.themeKey))) return null;
    if (!planes.includes(value.plane) || !finite(value.position, 0, 100) || !record(value.positions) || !planes.every(plane => finite(value.positions[plane], 0, 100)) || value.positions[value.plane] !== value.position) return null;
    if (typeof value.labels !== 'boolean' || !['both', 'slice', 'model'].includes(value.layout) || ![1, 2].includes(value.views) || !finite(value.share, 25, 75) || !finite(value.zoom, .7, 2.4) || !['t1', 't2', 'bigbrain', 'single'].includes(value.contrast)) return null;
    if (!(value.circuitOrigin === null || record(registry.circuits) && Object.hasOwn(registry.circuits, value.circuitOrigin))) return null;
    if (value.sliceZoom !== undefined && !finite(value.sliceZoom, .75, 5) || value.pan !== undefined && !pointValid(value.pan) || value.mobilePane !== undefined && !['view', 'guide'].includes(value.mobilePane)) return null;
    const reading=value.reading===undefined?undefined:readSectionReader(value.reading);if(value.reading!==undefined&&!reading)return null;
    return {...(reading?{reading}:{}),workspace: 'sections', plane: value.plane, position: value.position, positions: Object.fromEntries(planes.map(plane => [plane, value.positions[plane]])), target: value.target, visible: [...value.visible], labels: value.labels, layout: value.layout, views: value.views, share: value.share, zoom: value.zoom, contrast: value.contrast, rotation: rotationCopy(value.rotation), search: value.search, themeKey: value.themeKey, circuitOrigin: value.circuitOrigin, ...(value.sliceZoom === undefined ? {} : {sliceZoom: value.sliceZoom}), ...(value.pan === undefined ? {} : {pan: {x: value.pan.x, y: value.pan.y}}), ...(value.mobilePane === undefined ? {} : {mobilePane: value.mobilePane})};
  }
  if (value.workspace !== 'surface' || !Array.isArray(registry.surfaceViews) || !registry.surfaceViews.includes(value.view) || !keysValid(value.regions, registry.regionKeys) || !keysValid(value.landmarks, registry.landmarkKeys) || !keysValid(value.deepLandmarks, registry.deepLandmarkKeys) || !keysValid(value.basalLandmarks, registry.basalLandmarkKeys) || !optionalViewportValid(value)) return null;
  if (!record(value.flags) || !['cerebellum', 'vessels', 'nerves', 'ghost', 'pons'].every(key => typeof value.flags[key] === 'boolean') || typeof value.studyOpen !== 'boolean') return null;
  const free = value.free;
  if (!record(free) || !['both', 'left', 'right'].includes(free.hemisphere) || !keysValid(free.selected, registry.freeKeys) || !(free.focused === null || Array.isArray(registry.freeKeys) && registry.freeKeys.includes(free.focused)) || !['structures', 'circuits'].includes(free.inspector) || typeof free.circuitSectionsOpen !== 'boolean') return null;
  if (!(free.pathway === null || record(registry.circuits) && Object.hasOwn(registry.circuits, free.pathway)) || !(free.node === null || typeof free.node === 'string' && free.pathway !== null && registry.circuits[free.pathway].paths.some(path => path.nodes.includes(free.node)))) return null;
  if (!indexValid(free.basalIndex, registry.basalCount) || !indexValid(free.papezIndex, registry.papezCount) || !(free.visualIndex === null || indexValid(free.visualIndex, registry.visualCount))) return null;
  return {workspace: 'surface', view: value.view, rotation: rotationCopy(value.rotation), regions: [...value.regions], landmarks: [...value.landmarks], deepLandmarks: [...value.deepLandmarks], basalLandmarks: [...value.basalLandmarks], flags: Object.fromEntries(['cerebellum', 'vessels', 'nerves', 'ghost', 'pons'].map(key => [key, value.flags[key]])), free: {hemisphere: free.hemisphere, selected: [...free.selected], focused: free.focused, inspector: free.inspector, pathway: free.pathway, node: free.node, visualIndex: free.visualIndex, basalIndex: free.basalIndex, papezIndex: free.papezIndex, circuitSectionsOpen: free.circuitSectionsOpen}, studyOpen: value.studyOpen, search: value.search, ...optionalViewportCopy(value)};
}

export function readWindowsExplorationProgress(raw, registry) {
  if (raw === null || raw === undefined) return {status: 'empty', value: null};
  try {
    if (typeof raw !== 'string' || raw.length > 250000 || !record(registry) || typeof registry.revision !== 'string' || !registry.revision || typeof registry.contentRevision !== 'string' || !registry.contentRevision) return {status: 'invalid', value: null};
    const saved = JSON.parse(raw);
    if (!record(saved) || saved.version !== 1) return {status: 'version-mismatch', value: null};
    if (saved.revision !== registry.revision || saved.contentRevision !== registry.contentRevision) return {status: 'revision-mismatch', value: null};
    let practice = null, circuit = null;
    if (saved.practice !== null) {
      const parsed = readFindProgress(saved.practice, registry.findTasks);
      if (!parsed) return {status: 'unrestorable', value: null};
      const returnTo = saved.practice.returnTo === null ? null : readWindowsObservationSnapshot(saved.practice.returnTo, registry);
      if (saved.practice.returnTo !== null && !returnTo) return {status: 'unrestorable', value: null};
      practice = {...parsed, returnTo};
    }
    if (saved.circuit !== null) {
      const parsed = readCircuitProgress(saved.circuit, registry);
      if (!parsed) return {status: 'unrestorable', value: null};
      const section = saved.circuit.section === null ? null : readWindowsObservationSnapshot(saved.circuit.section, registry);
      if (saved.circuit.section !== null && !section || parsed.sectionOrigin && (!section || section.workspace !== 'sections')) return {status: 'unrestorable', value: null};
      const returnTo = saved.circuit.returnTo === null ? null : readWindowsObservationSnapshot(saved.circuit.returnTo, registry);
      if (saved.circuit.returnTo !== null && !returnTo) return {status: 'unrestorable', value: null};
      circuit = {...parsed, section, returnTo};
    }
    const observation=saved.observation==null?null:readWindowsObservationSnapshot(saved.observation,registry);if(saved.observation!=null&&(!observation||observation.workspace!=='sections'))return {status:'unrestorable',value:null};
    return {status: 'valid', value: {version: 1, revision: registry.revision, contentRevision: registry.contentRevision, practice, circuit,observation}};
  } catch {
    return {status: 'invalid', value: null};
  }
}

export function serializeWindowsExplorationProgress(value, registry) {
  try {
    if (!record(value)) return null;
    const raw = JSON.stringify({version: 1, revision: registry.revision, contentRevision: registry.contentRevision, practice: value.practice, circuit: value.circuit, observation:value.observation??null});
    const parsed = readWindowsExplorationProgress(raw, registry);
    return parsed.status === 'valid' ? JSON.stringify(parsed.value) : null;
  } catch { return null; }
}

// A matching raw value is necessary but never grants permission to replace a
// malformed or obsolete record. Recovery remains a separate explicit UI choice.
export function writeWindowsExplorationProgress(storage, expectedRaw, raw, registry) {
  try {
    const current = storage.getItem(WINDOWS_EXPLORATION_PROGRESS_KEY);
    if (current !== expectedRaw) return {status: 'conflict', raw: expectedRaw};
    const previous = readWindowsExplorationProgress(current, registry);
    if (!['empty', 'valid'].includes(previous.status)) return {status: previous.status, raw: expectedRaw};
    const parsed = readWindowsExplorationProgress(raw, registry);
    if (parsed.status !== 'valid') return {status: parsed.status === 'empty' ? 'invalid' : parsed.status, raw: expectedRaw};
    const normalizedRaw = JSON.stringify(parsed.value);
    storage.setItem(WINDOWS_EXPLORATION_PROGRESS_KEY, normalizedRaw);
    if (storage.getItem(WINDOWS_EXPLORATION_PROGRESS_KEY) !== normalizedRaw) return {status: 'unavailable', raw: expectedRaw};
    return {status: 'saved', raw: normalizedRaw};
  } catch { return {status: 'unavailable', raw: expectedRaw}; }
}

// Called only by the explicit learner preservation action, never by autosave.
// Archive exact originals and verify them before replacing this one owned key.
export function preserveAndWriteWindowsExplorationProgress(storage, raw, registry, originals=[], archiveKey){
 let current=null;
 try{
  const parsed=readWindowsExplorationProgress(raw,registry);
  if(parsed.status!=='valid')return {status:'unrestorable',raw:null};
  const normalized=JSON.stringify(parsed.value);
  current=storage.getItem(WINDOWS_EXPLORATION_PROGRESS_KEY);
  const records=[...new Set([...originals.filter(value=>typeof value==='string'),...(current===null?[]:[current])])].map(raw=>({key:WINDOWS_EXPLORATION_PROGRESS_KEY,raw}));
  const archive=JSON.stringify({records});
  if(records.length){
   // Stable content address avoids another full copy on identical retries.
   let hash1=2166136261,hash2=5381;for(let i=0;i<archive.length;i++){hash1=Math.imul(hash1^archive.charCodeAt(i),16777619);hash2=Math.imul(hash2,33)^archive.charCodeAt(i);}
   archiveKey??=WINDOWS_EXPLORATION_PROGRESS_KEY+':preserved:'+archive.length+':'+(hash1>>>0).toString(16)+':'+(hash2>>>0).toString(16);
   if(!archiveKey.startsWith(WINDOWS_EXPLORATION_PROGRESS_KEY+':preserved:'))return {status:'unavailable',raw:current};
   const existing=storage.getItem(archiveKey);
   if(existing!==null&&existing!==archive)return {status:'unavailable',raw:current};
   if(existing===null)storage.setItem(archiveKey,archive);
   if(storage.getItem(archiveKey)!==archive)return {status:'unavailable',raw:current};
  }else archiveKey=undefined;
  if(storage.getItem(WINDOWS_EXPLORATION_PROGRESS_KEY)!==current)return {status:'conflict',raw:current};
  storage.setItem(WINDOWS_EXPLORATION_PROGRESS_KEY,normalized);
  if(storage.getItem(WINDOWS_EXPLORATION_PROGRESS_KEY)!==normalized)return {status:'unavailable',raw:current};
  return {status:'saved',raw:normalized,archiveKey,records};
 }catch{return {status:'unavailable',raw:current};}
}
