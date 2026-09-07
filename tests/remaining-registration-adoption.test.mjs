import {residualSuccessor,regionalMeshSuccessor} from './helpers/residual-mesh-successor.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root)),sha=b=>createHash('sha256').update(b).digest('hex');
test('remaining registration is independently reversible and preserves the red-stage history',async()=>{
 const recordBytes=await read('segmentation-patches/review/remaining-manual-registration-project-adoption-2026-09-06.json');
 assert.equal(sha(recordBytes),'cd246260ac82b66f36078c4354138f28afc9b8fb2a5162d7affa92eb025af673');
 const r=JSON.parse(recordBytes),base=await read('tests/fixtures/bigbrain-practical-segmentation-pre-remaining-registration-cec9.bin.gz');
 assert.equal(sha(base),r.inputCompressedSha256);
 const before=gunzipSync(base).subarray(10),after=Buffer.from(before);let end=0,count=0;
 for(const [start,n,a,b] of r.runs){assert.ok(start>=end&&n>0);end=start+n;assert.ok(end<=after.length);for(let i=start;i<end;i++){assert.equal(after[i],a);after[i]=b;count++;}}
 assert.equal(count,137228);assert.equal(sha(after),r.outputRawSha256);
 const installed=await read('tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz');
 assert.equal(sha(installed),r.outputCompressedSha256);assert.deepEqual(gunzipSync(installed).subarray(10),after);
 for(const [start,n,a,b] of [...r.runs].reverse())for(let i=start;i<start+n;i++){assert.equal(after[i],b);after[i]=a;}
 assert.deepEqual(after,before);assert.equal(r.expertReviewed,false);
});
test('all 22 dependent meshes match the reviewed regeneration manifest',async()=>{
 const raw=await read('segmentation-patches/review/registered-dependent-meshes-2026-09-06.json');
 assert.equal(sha(raw),'9f963ddc75101adaf23832a3af326e260bfaab06340b6c62ba145fb457225f24');
 const entries=JSON.parse(raw);assert.equal(entries.length,22);assert.equal(new Set(entries.map(x=>x.file)).size,22);
 const metadata=JSON.parse(await read('public/atlas/specimen-blocks.json'));
 const next=JSON.parse(await read('segmentation-patches/review/lateral-next-adoption-2026-09-07.json'));
 const latest=JSON.parse(await read('segmentation-patches/review/lateral-remaining-adoption-2026-09-07.json'));
 const medium=JSON.parse(await read('segmentation-patches/review/lateral-medium-adoption-2026-09-07.json'));
 const horn=JSON.parse(await read('segmentation-patches/review/inferior-horn-adoption-2026-09-07.json'));
 for(const e of entries){
  const superseded=e.file==='block-choroid-plexus-tissue.mesh';
  const final=latest.meshImpact.blockMaskImpact.find(p=>p.file===e.file);
  const hornPart=horn.meshImpact.blockMaskImpact.find(p=>p.file===e.file);
  const regional=(!superseded&&!final&&!hornPart)?await regionalMeshSuccessor(e.file,e.afterSha256):null;
  const mesh=await read(regional?.firstRecoveryPath??((superseded?'tests/fixtures/pre-lateral-next-':final?'tests/fixtures/pre-lateral-remaining-':hornPart?'tests/fixtures/pre-inferior-horn-':'public/atlas/')+e.file));
  assert.equal(e.beforeMatches,true);assert.equal(sha(mesh),e.afterSha256);assert.equal(mesh.readUInt32LE(4),e.vertices);assert.equal(mesh.readUInt32LE(8),e.faces*(e.legacyFaceIndexCountHeader?3:1));
  if(e.block){const part=metadata.specimens[e.block].find(x=>x.part===e.part);
   const intermediate=superseded?next.meshImpact.blockMaskImpact.find(p=>p.file===e.file):e;
   if(superseded)assert.equal(intermediate.beforeSha256,e.afterSha256);
   if(final)assert.equal(final.beforeSha256,intermediate.afterSha256);
   const previous=final??intermediate;
   const current=medium.meshImpact.blockMaskImpact.find(p=>p.file===e.file);
   if(current)assert.equal(current.beforeSha256,previous.afterSha256);
   const predecessor=current??previous;
   if(hornPart){assert.equal(hornPart.beforeSha256,predecessor.afterSha256);assert.equal(sha(await read('tests/fixtures/pre-inferior-horn-'+e.file)),predecessor.afterSha256);}
   const residual=await residualSuccessor(e.file,(hornPart??predecessor).afterSha256);const expected=residual??hornPart??predecessor;
   assert.equal(sha(await read('public/atlas/'+e.file)),expected.afterSha256);
   assert.equal(part.meshSha256,expected.afterSha256);assert.equal(part.vertices,expected.vertices);assert.equal(part.faces,expected.faces);
  }
 }
});
