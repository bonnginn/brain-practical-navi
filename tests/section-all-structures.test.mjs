import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const page=read('app/page.tsx').toString();
const definitions=page.split('const structures: Record<StructureKey, StructureInfo> = {')[1].split('\n};')[0];
const mapping=page.split('const bigbrainSectionMeshFiles:')[1].split('\n};')[0];
const entries=[...mapping.matchAll(/(\w+):\[([^\]]+)\]/g)].map(m=>[m[1],[...m[2].matchAll(/"([^"]+)"/g)].map(x=>x[1])]);

test('every selectable BigBrain structure has uncropped same-source 3D, including both sides',()=>{
  const groups=page.split('const structureGroups:')[1].split('\n];')[0];
  const selected=[...groups.matchAll(/members:\[([^\]]+)\]/g)].flatMap(m=>[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]));
  const map=new Map(entries);
  for(const key of selected) assert.ok(map.has(key),`missing 3D: ${key}`);
  const source=read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz');
  const sha=data=>createHash('sha256').update(data).digest('hex');
  const report=JSON.parse(read('public/atlas/section-current-nuclei.json'));
  assert.equal(report.sourceSha256,sha(source));
  for(const [name,info] of Object.entries(report.meshes)) assert.equal(info.sha256,sha(read('public/atlas/'+name+'.mesh')));
  const raw=gunzipSync(source);
  const nx=raw.readUInt16LE(4),ny=raw.readUInt16LE(6),bounds=new Map();
  for(let i=10;i<raw.length;i++){
    const id=raw[i];if(!id)continue;
    const j=i-10,p=[Math.floor(j/(nx*ny)),Math.floor(j/nx)%ny,j%nx];
    if(!bounds.has(id))bounds.set(id,[p.slice(),p.slice()]);
    const b=bounds.get(id);for(let a=0;a<3;a++){b[0][a]=Math.min(b[0][a],p[a]);b[1][a]=Math.max(b[1][a],p[a]);}
  }
  for(const [key,files] of entries){
    const line=definitions.split('\n').find(l=>new RegExp('^\\s*'+key+':').test(l));
    const ids=JSON.parse('['+line.match(/bigbrainIds:\[([^\]]+)\]/)[1]+']');
    const actual=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
    for(const file of files){
      assert.ok(file.startsWith('section-current-'),key);
      let mesh=read('public/atlas/'+file+'.mesh');if(mesh[0]===31)mesh=gunzipSync(mesh);
      assert.equal(mesh.subarray(0,4).toString(),'BNM2',file);
      for(let i=0;i<mesh.readUInt32LE(4);i++)for(let a=0;a<3;a++){
        const v=mesh.readFloatLE(12+i*12+a*4);assert.ok(Number.isFinite(v),file);
        actual[0][a]=Math.min(actual[0][a],v);actual[1][a]=Math.max(actual[1][a],v);
      }
    }
    for(let a=0;a<3;a++){
      const lo=Math.min(...ids.map(id=>bounds.get(id)[0][a]))*.5+[-90,-116,-98][a]-.25;
      const hi=Math.max(...ids.map(id=>bounds.get(id)[1][a]))*.5+[-90,-116,-98][a]+.25;
      assert.ok(Math.abs(actual[0][a]-lo)<.01,`${key} min axis ${a}: ${actual[0][a]} vs ${lo}`);
      assert.ok(Math.abs(actual[1][a]-hi)<.01,`${key} max axis ${a}: ${actual[1][a]} vs ${hi}`);
    }
  }
});
