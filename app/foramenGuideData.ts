// Observation anchor from the native100 review recorded in
// docs/RIGHT_FORAMEN_CONNECTION_2026-09-16.md. This is not a segmentation mask.
export const FORAMEN_GUIDE = {
  center: [201, 266, 149] as const,
  slices: [265, 266, 267] as const,
  crop: { x: 167, z: 119, width: 66, height: 90 },
};

export type SectionGuideData = {
  dims: [number, number, number]; values: Uint8Array; labels: Uint8Array;
};
export type CoronalCrop = { x: number; z: number; width: number; height: number };
export const FORAMEN_COLORS = { lateral: [40, 170, 220], third: [240, 80, 175] } as const;

/** Raw display-resolution intensity, with optional current cavity labels.
 * Crop origin is the lowest X/Z voxel; superior is at the top, left at left.
 * White cavities remain white in the raw panel (no background thresholding).
 */
export function coronalGuidePixels(data: SectionGuideData, y: number, crop: CoronalCrop, colored: boolean) {
  const [dx, dy, dz] = data.dims;
  if (!Number.isInteger(y) || y < 0 || y >= dy || crop.x < 0 || crop.z < 0 ||
      crop.x + crop.width > dx || crop.z + crop.height > dz) throw new Error("Guide crop outside source grid");
  const rgba = new Uint8ClampedArray(crop.width * crop.height * 4);
  for (let b = 0; b < crop.height; b++) for (let a = 0; a < crop.width; a++) {
    const z = crop.z + crop.height - 1 - b, i = crop.x + a + dx * (y + dy * z);
    const value = data.values[i], label = data.labels[i];
    const color = colored ? (label === 23 || label === 24 ? FORAMEN_COLORS.lateral : label === 25 ? FORAMEN_COLORS.third : null) : null;
    rgba.set(color ? [...color, 255] : [value, value, value, 255], (b * crop.width + a) * 4);
  }
  return rgba;
}

export function coronalGuidePoint(x: number, z: number, crop: CoronalCrop) {
  return { x: x - crop.x + .5, y: crop.z + crop.height - 1 - z + .5 };
}
