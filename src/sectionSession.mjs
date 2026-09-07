export const SECTION_SESSION_KEY = 'brain-practical-section-session-v1';
export function readSectionSession(raw, allowedKeys) {
  try {
    const s = JSON.parse(raw ?? 'null');
    if (!s || s.version !== 1) return null;
    if (!['coronal','horizontal','sagittal'].every(p => Number.isFinite(s.positions?.[p]) && s.positions[p] >= 0 && s.positions[p] <= 100)) return null;
    if (!Array.isArray(s.visible) || !s.visible.every(k => allowedKeys.includes(k)) || !allowedKeys.includes(s.selected)) return null;
    if (!['both','slice','model'].includes(s.layout) || ![1,2].includes(s.views) || !Number.isFinite(s.share) || s.share < 25 || s.share > 75) return null;
    return {version:1,positions:{coronal:s.positions.coronal,horizontal:s.positions.horizontal,sagittal:s.positions.sagittal},visible:[...new Set(s.visible)],selected:s.selected,layout:s.layout,views:s.views,share:s.share};
  } catch { return null; }
}
