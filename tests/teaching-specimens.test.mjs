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

test('surface colour partitions a shared tissue slab without duplicating its faces',()=>{
  for(const specimen of Object.values(data.specimens)){
    const surface=specimen.parts.filter(p=>p.role==='tissue'||p.role==='structure');
    assert.equal(surface.reduce((sum,p)=>sum+p.faces,0),specimen.surfaceFaces);
    assert.ok(specimen.bodyVoxels>0);
    assert.equal(specimen.boundsXYZmm.length,3);
    const triangles=new Set();
    for(const part of surface){
      assert.equal(part.surfaceOnly,true);
      const mesh=gunzipSync(read('public/atlas/'+part.file));
      const nv=mesh.readUInt32LE(4),nf=mesh.readUInt32LE(8),offset=12+28*nv;
      for(let i=0;i<nf;i++){
        const vertices=[];
        for(let j=0;j<3;j++){
          const index=mesh.readUInt32LE(offset+12*i+4*j);
          vertices.push(mesh.subarray(12+12*index,24+12*index).toString('hex'));
        }
        const triangle=vertices.sort().join(':');
        assert.ok(!triangles.has(triangle),'shared surface faces must not overlap');triangles.add(triangle);
      }
    }
  }
  for(const [key,id] of [['fornix',46],['septum-pellucidum',43]]){
    const part=data.specimens['commissural-system'].parts.find(p=>p.key===key);
    assert.equal(part.role,'structure');assert.deepEqual(part.sourceLabelIds,[id]);
  }
  assert.equal(data.specimens['choroid-plexus'].parts.find(p=>p.key==='choroid-plexus').role,'schematic');
});
