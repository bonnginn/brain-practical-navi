// The specimen slice has independent framing from the main circuit 3D view.
export function papezInlineViewportForContext(saved, step, plane) {
  if (!saved || saved.step !== step || saved.plane !== plane) return {step, plane, zoom: 1, pan: {x: 0, y: 0}};
  return {step, plane, zoom: saved.zoom, pan: {...saved.pan}};
}

export function updatePapezInlineViewport(saved, step, plane, update) {
  const current = papezInlineViewportForContext(saved, step, plane);
  if (update.zoom !== undefined) current.zoom = typeof update.zoom === 'function' ? update.zoom(current.zoom) : update.zoom;
  if (update.pan !== undefined) {
    const next = typeof update.pan === 'function' ? update.pan(current.pan) : update.pan;
    current.pan = {x: next.x, y: next.y};
  }
  return current;
}
