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

test('empty exclusion policy preserves every mesh and reuses the original object',()=>{
  const make=(regions,faces)=>({vertices:new Float32Array(regions.flatMap((_,i)=>[i,i+1,i+2])),normals:new Float32Array(regions.flatMap(()=>[0,0,1])),shade:new Float32Array(regions.map((_,i)=>i+.25)),regions:new Float32Array(regions),faces:new Uint32Array(faces)});
  assert.equal(hidden.size,0);const mesh=make([30,38,40,42],[0,1,2,1,2,3]);assert.strictEqual(withoutHiddenCranialNerveRegions(mesh),mesh);assert.strictEqual(withoutHiddenCranialNerveRegions(mesh),mesh);
});

test('current display policy preserves every cranial-nerve region and source byte',()=>{
  for(const name of ['overlay-nerves-anterior','overlay-nerves-pontine','overlay-nerves-medullary']){
    const {bytes,mesh}=readMesh(name),before=createHash('sha256').update(bytes).digest('hex');
    const filtered=withoutHiddenCranialNerveRegions(mesh);assert.equal(createHash('sha256').update(bytes).digest('hex'),before,`${name} source bytes changed`);
    assert.strictEqual(filtered,mesh,`${name} should remain intact when no regions are excluded`);
    assert.deepEqual([...new Set(filtered.regions)].filter(id=>id>0),[...new Set(mesh.regions)].filter(id=>id>0));
  }
});

test('V and IX-XI are displayable, searchable, and explanatory',()=>{
  for(const key of ['cn5','cn9','cn10','cn11'])assert.doesNotMatch(page,new RegExp(`${key}:\\{name:[^\\n]+displayAvailable:false`));
  assert.match(page,/neurovascularDisplayAvailable\(selectedNeurovascularStructure\)\?\[\{ids:selectedNeurovascular\.ids/);
  assert.match(page,/形状調整中・3D非表示/);
  assert.match(page,/クリックして詳細を確認/);
  assert.match(page,/displayAvailable\?\(active\?"✓":"＋"\):\(englishEdition\?"Details":"説明"\)/);
});
