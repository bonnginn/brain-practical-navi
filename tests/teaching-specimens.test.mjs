import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const data=JSON.parse(read('app/teachingSpecimens.json'));

test('opaque specimens use the current source and valid, individually identified meshes',()=>{
  assert.equal(data.sourceLabelSha256,sha(read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz')));
  assert.equal(data.sourceImageSha256,sha(read('public/atlas/bigbrain-icbm500.bin.gz')));
  const manifest=JSON.parse(read('public/atlas/DATA-MANIFEST.json'));
  const files=new Set();
  for(const specimen of Object.values(data.specimens)){
    assert.ok(specimen.parts.some(p=>p.role==='tissue'));
    for(const part of specimen.parts){
      assert.ok(!files.has(part.file));files.add(part.file);
      assert.equal(manifest.groups.filter(g=>new RegExp(g.pattern).test(part.file)).length,1);
      const stored=read('public/atlas/'+part.file);assert.equal(sha(stored),part.meshSha256);
      const mesh=gunzipSync(stored);assert.equal(mesh.subarray(0,4).toString(),'BNM2');
      const nv=mesh.readUInt32LE(4),nf=mesh.readUInt32LE(8);
      assert.equal(nv,part.vertices);assert.equal(nf,part.faces);assert.equal(mesh.length,12+28*nv+12*nf);
      for(let i=12;i<12+28*nv;i+=4)assert.ok(Number.isFinite(mesh.readFloatLE(i)));
      for(let i=12+28*nv;i<mesh.length;i+=4)assert.ok(mesh.readUInt32LE(i)<nv);
      assert.ok(['tissue','structure','cavity','schematic'].includes(part.role));
      if(part.role==='structure')assert.ok(!part.source.includes('schematic'));
    }
  }
});

test('thin commissural structures preserve the entire currently adopted partial labels',()=>{
  const counts=new Uint32Array(256);
  for(const id of gunzipSync(read('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz')).subarray(10))counts[id]++;
  for(const [key,id] of [['fornix',46],['septum-pellucidum',43]]){
    const part=data.specimens['commissural-system'].parts.find(p=>p.key===key);
    assert.equal(part.role,'structure');assert.equal(part.geometrySamplingMm,.5);assert.equal(part.sampledVoxels,counts[id]);
  }
  assert.equal(data.specimens['medial-temporal'].parts.find(p=>p.key==='fimbria').role,'structure');
  assert.equal(data.specimens['choroid-plexus'].parts.find(p=>p.key==='choroid-plexus').role,'schematic');
});
