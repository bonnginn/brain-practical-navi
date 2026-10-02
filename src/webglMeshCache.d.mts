export function atlasMeshBuffers(gl:WebGLRenderingContext,mesh:{vertices:Float32Array;normals:Float32Array;shade:Float32Array;faces:Uint32Array}):{positions:WebGLBuffer;normals:WebGLBuffer;shade:WebGLBuffer;indices:WebGLBuffer}|null;
export function atlasAttributeBuffer(gl:WebGLRenderingContext,name:'highlight'|'travel',data:Float32Array):WebGLBuffer|null;
