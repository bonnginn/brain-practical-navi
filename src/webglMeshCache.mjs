// Loaded atlas meshes are immutable. Dynamic highlights/travel data are separate.
const contexts = new WeakMap();
const attributeContexts = new WeakMap();

// Colour/travel arrays are immutable snapshots. Keep one buffer per attribute,
// replacing its contents on selection changes rather than accumulating variants.
export function atlasAttributeBuffer(gl, name, data) {
  let attributes = attributeContexts.get(gl);
  if (!attributes) { attributes = new Map(); attributeContexts.set(gl, attributes); }
  let cached = attributes.get(name);
  if (cached && !gl.isBuffer(cached.buffer)) { gl.deleteBuffer(cached.buffer); attributes.delete(name); cached = undefined; }
  if (gl.isContextLost()) return null;
  if (!cached) {
    const buffer = gl.createBuffer();
    if (!buffer) return null;
    cached = {buffer, data:null}; attributes.set(name, cached);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, cached.buffer);
  if (cached.data !== data) { gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); cached.data = data; }
  return cached.buffer;
}

export function atlasMeshBuffers(gl, mesh) {
  let meshes = contexts.get(gl);
  if (!meshes) { meshes = new WeakMap(); contexts.set(gl, meshes); }
  const cached = meshes.get(mesh);
  if (cached && Object.values(cached).every(buffer => gl.isBuffer(buffer))) return cached;
  if (cached) { Object.values(cached).forEach(buffer => gl.deleteBuffer(buffer)); meshes.delete(mesh); }
  if (gl.isContextLost()) return null;
  const buffers = {};
  for (const [name, data, target] of [
    ['positions', mesh.vertices, gl.ARRAY_BUFFER],
    ['normals', mesh.normals, gl.ARRAY_BUFFER],
    ['shade', mesh.shade, gl.ARRAY_BUFFER],
    ['indices', mesh.faces, gl.ELEMENT_ARRAY_BUFFER],
  ]) {
    const buffer = gl.createBuffer();
    if (!buffer) { Object.values(buffers).forEach(previous => gl.deleteBuffer(previous)); return null; }
    buffers[name] = buffer;
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
  }
  meshes.set(mesh, buffers);
  return buffers;
}
