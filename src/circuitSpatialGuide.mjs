// Display-only dashed links between existing mesh landmarks. These straight
// links express spatial relationships, never reconstructed nerve fibres.
export function circuitSpatialGuide(from,to,range=[0,1]){
 const center=(meshes,side)=>{let n=0,p=[0,0,0];for(const mesh of meshes)for(let i=0;i<mesh.vertices.length;i+=3){if((mesh.vertices[i+2]<0?-1:1)!==side)continue;for(let a=0;a<3;a++)p[a]+=mesh.vertices[i+a];n++;}return n?p.map(v=>v/n):null;};
 return [-1,1].flatMap(side=>{
  const a=center(from,side),b=center(to,side);if(!a||!b)return [];
  const dx=b.map((v,i)=>v-a[i]),length=Math.hypot(...dx);if(length<1)return [];
  const perpendicular=Math.abs(dx[0])<length*.8?[0,-dx[2],dx[1]]:[-dx[1],dx[0],0],norm=Math.hypot(...perpendicular)||1;
  const axis=dx.map(v=>v/length),u=perpendicular.map(v=>v/norm);
  const v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];
  const vertices=[],faces=[],travel=[],normals=[],sides=10;
  // Rounded narrow dashes remain a guide at any rotation, rather than flat
  // rectangular tiles that can look like extra anatomical structures.
  for(let k=0;k<12;k+=2){const start=k/12,end=(k+1)/12,base=vertices.length/3;
   const radius=Math.min(.65,(end-start)*length*.3),cap=radius/length;
   const rings=[[start,0,-1],[start+cap*.293,radius*.707,-.707],[start+cap,radius,0],[end-cap,radius,0],[end-cap*.293,radius*.707,.707],[end,0,1]];
   for(const [t,r,axial]of rings)for(let side=0;side<sides;side++){
    const angle=side/sides*Math.PI*2,radial=u.map((n,i)=>n*Math.cos(angle)+v[i]*Math.sin(angle));
    for(let i=0;i<3;i++){vertices.push(a[i]+t*dx[i]+r*radial[i]);normals.push(radial[i]*Math.sqrt(1-axial*axial)+axis[i]*axial);}
    travel.push((t-range[0])/Math.max(.001,range[1]-range[0]));
   }
   for(let ring=0;ring<rings.length-1;ring++)for(let side=0;side<sides;side++){
    const p=base+ring*sides+side,q=base+ring*sides+(side+1)%sides;
    faces.push(p,q,p+sides,q,q+sides,p+sides);
   }
  }
  const count=vertices.length/3;
  return [{mesh:{vertices:new Float32Array(vertices),faces:new Uint32Array(faces),normals:new Float32Array(normals),shade:new Float32Array(count),regions:new Float32Array(count)},travel:new Float32Array(travel)}];
 });
}
