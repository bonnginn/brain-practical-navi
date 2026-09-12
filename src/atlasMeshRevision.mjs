// Revision tokens invalidate browser caches; they do not prove mesh/source alignment.
export function atlasMeshRevisionQuery(name, segmentationRevision) {
  if (name === 'overlay-arteries-anterior') return '?v=8e1d872281eb6439';
  if (name === 'overlay-nerves-pontine') return '?v=1244f483c765ef08';
  if (name.startsWith('block-') || name.startsWith('section-current-') ||
      ['section-accumbens', 'section-optic-chiasm', 'section-insula'].includes(name)) {
    return `?v=${encodeURIComponent(segmentationRevision)}`;
  }
  return '';
}
