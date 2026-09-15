const fineCavityRevisions = {
  "block-lateral-ventricle-ventricular-cavity": "38b9600671a9684d",
  "block-commissural-system-lateral-ventricles": "dee056e6bc753b37",
  "block-choroid-plexus-ventricular-cavity": "162e293d011f11d7",
  "block-medial-temporal-inferior-horn": "06a08376b1375d30"
};
// Revision tokens invalidate browser caches; they do not prove mesh/source alignment.
export function atlasMeshRevisionQuery(name, segmentationRevision) {
  if (fineCavityRevisions[name]) return `?v=${encodeURIComponent(segmentationRevision)}-${fineCavityRevisions[name]}`;
  if (name === 'overlay-arteries-anterior') return '?v=8e1d872281eb6439';
  if (name === 'overlay-nerves-pontine') return '?v=348dd0eeda9cc4c6';
  if (name === 'overlay-nerves-medullary') return '?v=20586505af22ab64';
  if (name.startsWith('block-') || name.startsWith('section-current-') ||
      ['section-accumbens', 'section-optic-chiasm', 'section-insula'].includes(name)) {
    return `?v=${encodeURIComponent(segmentationRevision)}`;
  }
  return '';
}
