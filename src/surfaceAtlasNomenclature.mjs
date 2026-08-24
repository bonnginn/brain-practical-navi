export const SURFACE_ATLAS_NOMENCLATURE_LABEL = "CerebrA／Desikan系アトラス区画";
export const SURFACE_ATLAS_NOMENCLATURE_COMPACT_LABEL = "［アトラス区画］";
export const SURFACE_ATLAS_NOMENCLATURE_KEYS = Object.freeze([
  "rostralMiddleFrontal",
  "caudalMiddleFrontal",
  "pericalcarine",
  "orbitofrontal",
  "lateralOccipital",
]);

export function surfaceAtlasNomenclatureLabel(key) {
  return SURFACE_ATLAS_NOMENCLATURE_KEYS.includes(key) ? SURFACE_ATLAS_NOMENCLATURE_LABEL : null;
}

export function surfaceAtlasNomenclatureCompactLabel(key) {
  return SURFACE_ATLAS_NOMENCLATURE_KEYS.includes(key) ? SURFACE_ATLAS_NOMENCLATURE_COMPACT_LABEL : null;
}
