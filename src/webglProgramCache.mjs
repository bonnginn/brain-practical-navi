// The atlas shares one offscreen context. Keep its linked program across
// rotations and animation frames; restored contexts need a new program.
const programs=new WeakMap();

export function atlasProgram(gl,vertexSource,fragmentSource){
  const cached=programs.get(gl);
  if(cached&&cached.vertexSource===vertexSource&&cached.fragmentSource===fragmentSource&&gl.isProgram(cached.program))return cached.program;
  if(cached){gl.deleteProgram(cached.program);programs.delete(gl)}
  if(gl.isContextLost())return null;
  const shaders=[];
  const program=gl.createProgram();
  if(!program)return null;
  for(const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]){
    const shader=gl.createShader(type);
    if(!shader){for(const previous of shaders)gl.deleteShader(previous);gl.deleteProgram(program);return null}
    shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){for(const previous of shaders)gl.deleteShader(previous);gl.deleteProgram(program);return null}
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  for(const shader of shaders)gl.deleteShader(shader);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);return null}
  programs.set(gl,{program,vertexSource,fragmentSource});
  return program;
}
