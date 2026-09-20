// A schematic arrival field along the existing mesh, not reconstructed axons.
// Mesh edges keep the front on curved structures rather than sweeping a plane
// across a folded tract. Disconnected components are traversed independently.
export function circuitTravel(mesh, incoming=[], outgoing=[]) {
  const {vertices:v,faces}=mesh, count=v.length/3;
  const edges=Array.from({length:count},()=>new Set());
  for(let i=0;i<faces.length;i+=3)for(let j=0;j<3;j++){
    const a=faces[i+j],b=faces[i+(j+1)%3];edges[a].add(b);edges[b].add(a);
  }
  const distance=(a,b)=>Math.hypot(v[a*3]-v[b*3],v[a*3+1]-v[b*3+1],v[a*3+2]-v[b*3+2]);
  function shortest(seed){
    const d=new Float64Array(count).fill(Infinity),heap=[];
    function push(item){let i=heap.length;heap.push(item);while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;}
    function pop(){const top=heap[0],tail=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=tail[0])break;heap[i]=heap[c];i=c;}heap[i]=tail;}return top;}
    for(const start of Array.isArray(seed)?seed:[seed]){d[start]=0;push([0,start]);}
    while(heap.length){const [cost,a]=pop();if(cost!==d[a])continue;for(const b of edges[a]){const next=cost+distance(a,b);if(next<d[b]){d[b]=next;push([next,b]);}}}
    return d;
  }
  const samples=meshes=>meshes.flatMap(m=>{const result=[];for(let i=0;i<m.vertices.length/3;i+=Math.max(1,Math.ceil(m.vertices.length/3/64)))result.push(Array.from(m.vertices.slice(i*3,i*3+3)));return result;});
  const from=samples(incoming),to=samples(outgoing);
  function nearest(component,points){
    // Stored coordinates are Z/Y/X. Use an entry on each side when the same
    // connected mesh spans both hemispheres (e.g. the body of the fornix).
    const seeds=[];
    for(const side of [-1,1]){let best=Infinity,seed=null;
      for(const a of component){if((v[a*3+2]<0?-1:1)!==side)continue;
        for(const p of points){if((p[2]<0?-1:1)!==side)continue;
          const d=(v[a*3]-p[0])**2+(v[a*3+1]-p[1])**2+(v[a*3+2]-p[2])**2;
          if(d<best){best=d;seed=a;}
        }
      }
      if(seed!==null)seeds.push(seed);
    }
    if(!seeds.length){let best=Infinity,seed=component[0];for(const a of component)for(const p of points){const d=(v[a*3]-p[0])**2+(v[a*3+1]-p[1])**2+(v[a*3+2]-p[2])**2;if(d<best){best=d;seed=a;}}seeds.push(seed);}
    return seeds;
  }
  const seen=new Uint8Array(count),result=new Float32Array(count);
  for(let root=0;root<count;root++){
    if(seen[root])continue;
    const component=[root];seen[root]=1;
    for(let i=0;i<component.length;i++)for(const b of edges[component[i]])if(!seen[b]){seen[b]=1;component.push(b);}
    let end=nearest(component,to),start=nearest(component,from);
    if(!from.length){const back=shortest(end);start=[component.reduce((a,b)=>back[b]>back[a]?b:a,component[0])];}
    const forward=shortest(start);
    if(!to.length||start.every(a=>end.includes(a)))end=[component.reduce((a,b)=>forward[b]>forward[a]?b:a,component[0])];
    const backward=shortest(end);
    for(const a of component){const total=forward[a]+backward[a];result[a]=total?forward[a]/total:0;}
  }
  return result;
}
