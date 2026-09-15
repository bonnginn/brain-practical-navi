/** BNM4 retains every vertex, face and integer atlas label; only display attributes are quantized. */
export function decodeCompactSurface(buffer: ArrayBuffer) {
  if (buffer.byteLength < 16) throw new Error('Truncated BNM4 header');
  const header = new DataView(buffer);
  if (header.getUint32(0, false) !== 0x424e4d34) throw new Error('Invalid BNM4 header');
  const nv = header.getUint32(4, true), nf = header.getUint32(8, true), scale = header.getFloat32(12, true);
  if (!nv || !nf || !Number.isFinite(scale) || scale <= 0 || scale > 1) throw new Error('Invalid BNM4 dimensions or scale');
  const faceOffset = Math.ceil((16 + nv * 11) / 4) * 4;
  if (buffer.byteLength !== faceOffset + nf * 12) throw new Error('Invalid BNM4 length');
  const positions = new Int16Array(buffer, 16, nv * 3), directions = new Int8Array(buffer, 16 + nv * 6, nv * 3);
  const tones = new Uint8Array(buffer, 16 + nv * 9, nv), labels = new Uint8Array(buffer, 16 + nv * 10, nv);
  const vertices = new Float32Array(nv * 3), normals = new Float32Array(nv * 3), shade = new Float32Array(nv), regions = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    const j = i * 3, magnitude = Math.hypot(directions[j], directions[j + 1], directions[j + 2]);
    if (!magnitude) throw new Error('Invalid BNM4 normal');
    for (let axis = 0; axis < 3; axis++) {
      vertices[j + axis] = positions[j + axis] * scale;
      normals[j + axis] = directions[j + axis] / magnitude;
    }
    shade[i] = tones[i] / 255;
    regions[i] = labels[i];
  }
  const faces = new Uint32Array(buffer, faceOffset, nf * 3);
  for (const index of faces) if (index >= nv) throw new Error('Invalid BNM4 face index');
  return { vertices, normals, shade, regions, faces };
}
