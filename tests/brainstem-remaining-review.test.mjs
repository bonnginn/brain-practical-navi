import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('remaining brainstem review has every local slice for nine distinct components',async()=>{
 const bytes=await readFile(new URL('../segmentation-patches/review/brainstem-remaining-islands-image-review-2026-09-06.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'9b3ca77273d9179d8548c9e7dcc7223fc6bdd8b33f14621867002c4dff8b3732');
 const r=JSON.parse(bytes);assert.equal(r.components.length,9);assert.equal(r.mutation,false);assert.equal(r.adopted,false);
 let points=0,frames=0,sheets=0;
 for(const c of r.components){
  const seen=new Set(c.points.map(p=>p.join(',')));assert.equal(seen.size,c.points.length);
  assert.equal(c.rawValues.length,c.points.length);points+=c.points.length;sheets+=c.sheets.length;
  const observed=c.sheets.flatMap(s=>s.frames).map(f=>f.axis+f.index).sort(),expected=[];
  for(const [k,axis] of [...'xyz'].entries()){
   const coords=c.points.map(p=>p[k]);for(let n=Math.min(...coords)-1;n<=Math.max(...coords)+1;n++)expected.push(axis+n);
  }
  assert.deepEqual(observed,expected.sort());frames+=observed.length;
 }
 assert.equal(points,113);assert.equal(frames,121);assert.equal(sheets,34);
});
