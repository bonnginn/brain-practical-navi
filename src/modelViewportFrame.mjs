// Use equal screen distances for equal anatomical distances. The smaller
// viewport dimension sets magnification; resizing must never stretch anatomy.
export function modelViewportFrame(width,height){
  const aspect=Math.max(width,1)/Math.max(height,1);
  return {aspect,scale:Math.min(1,aspect)};
}
