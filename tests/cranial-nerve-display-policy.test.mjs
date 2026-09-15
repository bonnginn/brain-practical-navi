import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HIDDEN_CRANIAL_NERVE_OVERLAY_REGIONS,withoutHiddenCranialNerveRegions} from '../src/neurovascularDisplayPolicy.ts';

const root=new URL('../',import.meta.url);
const atlas=readFileSync(new URL('app/AtlasVolumeCanvas.tsx',root),'utf8');
const page=readFileSync(new URL('app/page.tsx',root),'utf8');
const hidden=HIDDEN_CRANIAL_NERVE_OVERLAY_REGIONS;

function readMesh(name){
  const bytes=readFileSync(new URL(`public/atlas/${name}.mesh`,root));
  const vertexCount=bytes.readUInt32LE(4),faces=bytes.readUInt32LE(8),regionOffset=12+vertexCount*28,faceOffset=regionOffset+vertexCount*4;
  const vertices=new Float32Array(vertexCount*3),normals=new Float32Array(vertexCount*3),shade=new Float32Array(vertexCount),regions=new Float32Array(vertexCount);
  for(let index=0;index<vertexCount*3;index++){vertices[index]=bytes.readFloatLE(12+index*4);normals[index]=bytes.readFloatLE(12+vertexCount*12+index*4)}
  for(let index=0;index<vertexCount;index++){shade[index]=bytes.readFloatLE(12+vertexCount*24+index*4);regions[index]=bytes.readFloatLE(regionOffset+index*4)}
  const indices=Array.from({length:faces*3},(_,index)=>bytes.readUInt32LE(faceOffset+index*4));
  return{bytes,mesh:{vertices,normals,shade,regions,faces:new Uint32Array(indices)}};
}

test('renderer routes every loaded nerve mesh through the display policy',()=>{
  assert.match(atlas,/overlays:rest\.slice\(0,5\)\.map\(\(mesh,index\)=>index>=2\?withoutHiddenCranialNerveRegions\(mesh\):mesh\)/);
});

test('filter handles no targets, all targets, and a mixed-region face without mutating inputs',()=>{
  const make=(regions,faces)=>({vertices:new Float32Array(regions.flatMap((_,i)=>[i,i+1,i+2])),normals:new Float32Array(regions.flatMap(()=>[0,0,1])),shade:new Float32Array(regions.map((_,i)=>i+.25)),regions:new Float32Array(regions),faces:new Uint32Array(faces)});
  const none=make([32,33,34],[0,1,2]);assert.strictEqual(withoutHiddenCranialNerveRegions(none),none);assert.strictEqual(withoutHiddenCranialNerveRegions(none),none);
  const all=make([30,30,31],[0,1,2]),allBefore=all.faces.slice(),allFiltered=withoutHiddenCranialNerveRegions(all);assert.equal(allFiltered.faces.length,0);assert.equal(allFiltered.vertices.length,0);assert.deepEqual(all.faces,allBefore);
  const mixed=make([32,33,34,30],[0,1,2,1,2,3]),before={vertices:mixed.vertices.slice(),regions:mixed.regions.slice(),faces:mixed.faces.slice()},filtered=withoutHiddenCranialNerveRegions(mixed);
  assert.deepEqual([...filtered.regions],[32,33,34]);assert.deepEqual([...filtered.faces],[0,1,2]);assert.deepEqual(mixed.vertices,before.vertices);assert.deepEqual(mixed.regions,before.regions);assert.deepEqual(mixed.faces,before.faces);assert.strictEqual(withoutHiddenCranialNerveRegions(mixed),filtered);
});

test('filter removes target faces from current meshes while preserving source bytes and other regions',()=>{
  for(const name of ['overlay-nerves-anterior','overlay-nerves-pontine','overlay-nerves-medullary']){
    const {bytes,mesh}=readMesh(name),before=createHash('sha256').update(bytes).digest('hex');
    let mixed=0;const keptRegions=new Set(),removedRegions=new Set();
    for(let face=0;face<mesh.faces.length;face+=3){const ids=[...mesh.faces.slice(face,face+3)].map(vertex=>Math.round(mesh.regions[vertex])),hasHidden=ids.some(id=>hidden.has(id)),hasKept=ids.some(id=>!hidden.has(id));if(hasHidden&&hasKept)mixed++;(hasHidden?removedRegions:keptRegions).add(ids[0]);}
    assert.equal(mixed,0,`${name} must not contain a face crossing the display-policy boundary`);
    const filtered=withoutHiddenCranialNerveRegions(mesh);assert.equal(createHash('sha256').update(bytes).digest('hex'),before,`${name} source bytes changed`);
    for(const id of filtered.regions)assert.equal(hidden.has(Math.round(id)),false,`${name} retained hidden region ${id}`);
    if(name!=='overlay-nerves-anterior')assert.ok(removedRegions.size>0,`${name} should contain a hidden target`);
    assert.ok(keptRegions.size>0,`${name} should retain unrelated cranial nerves`);
    assert.ok(filtered.faces.every(index=>index<filtered.regions.length),`${name} has an invalid remapped face index`);
    assert.strictEqual(withoutHiddenCranialNerveRegions(mesh),filtered,`${name} did not reuse its cached display mesh`);
  }
});

test('hidden nerves remain searchable and explanatory without a false highlight state',()=>{
  for(const key of ['cn5','cn9','cn10','cn11'])assert.match(page,new RegExp(`${key}:\\{name:[^\\n]+displayAvailable:false`));
  assert.match(page,/neurovascularDisplayAvailable\(selectedNeurovascularStructure\)\?\[\{ids:selectedNeurovascular\.ids/);
  assert.match(page,/形状調整中・3D非表示/);
  assert.match(page,/クリックして詳細を確認/);
  assert.match(page,/displayAvailable\?\(active\?"✓":"＋"\):\(englishEdition\?"Details":"説明"\)/);
});
