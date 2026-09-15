export type RegionMesh={vertices:Float32Array;normals:Float32Array;shade:Float32Array;regions:Float32Array;faces:Uint32Array;auditSource?:{path:string;sha256:string}};
export const HIDDEN_CRANIAL_NERVE_OVERLAY_REGIONS=new Set<number>();
const displayMeshCache=new WeakMap<RegionMesh,RegionMesh>();

export function withoutHiddenCranialNerveRegions<T extends RegionMesh>(mesh:T):RegionMesh{
  const cached=displayMeshCache.get(mesh);if(cached)return cached;
  const keptFaces:number[]=[];for(let face=0;face+2<mesh.faces.length;face+=3){const triangle=[mesh.faces[face],mesh.faces[face+1],mesh.faces[face+2]];if(triangle.some(vertex=>HIDDEN_CRANIAL_NERVE_OVERLAY_REGIONS.has(Math.round(mesh.regions[vertex]))))continue;keptFaces.push(...triangle)}
  if(keptFaces.length===mesh.faces.length){displayMeshCache.set(mesh,mesh);return mesh}
  const used=[...new Set(keptFaces)].sort((a,b)=>a-b),remap=new Map(used.map((vertex,index)=>[vertex,index])),vertices=new Float32Array(used.length*3),normals=new Float32Array(used.length*3),shade=new Float32Array(used.length),regions=new Float32Array(used.length);
  used.forEach((vertex,index)=>{vertices.set(mesh.vertices.subarray(vertex*3,vertex*3+3),index*3);normals.set(mesh.normals.subarray(vertex*3,vertex*3+3),index*3);shade[index]=mesh.shade[vertex];regions[index]=mesh.regions[vertex]});
  const filtered:RegionMesh={vertices,normals,shade,regions,faces:new Uint32Array(keptFaces.map(vertex=>remap.get(vertex)!)),auditSource:mesh.auditSource};displayMeshCache.set(mesh,filtered);return filtered;
}
