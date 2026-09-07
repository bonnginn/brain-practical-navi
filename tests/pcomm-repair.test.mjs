import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
function regions(b){
 const n=b.readUInt32LE(4),r=new Map();
 for(let i=0;i<n;i++){
  const id=b.readFloatLE(12+n*28+i*4);
  if(!r.has(id))r.set(id,[]);
  r.get(id).push(b.subarray(12+i*12,12+i*12+12).toString('hex'));
 }
 return r;
}
test('only the two communicating paths change within the anterior mesh',()=>{
 const old=read('tests/fixtures/overlay-arteries-anterior-pre-pcomm-eb110.mesh'),current=read('public/atlas/overlay-arteries-anterior.mesh');
 assert.equal(sha(old),'eb1102991e5616cc9b776f0766bda45e86580f2abdb8cb21cb36608f8ce355eb');
 assert.equal(sha(current),'8e1d872281eb6439b5a68b513fcd2a2b8cf8ca991e4a5854c5e3f090e6c824ad');
 const a=regions(old),b=regions(current);
 assert.deepEqual([...a.keys()],[...b.keys()]);
 for(let id=1;id<=7;id++)assert.deepEqual(a.get(id),b.get(id));
 for(const id of [8,9])assert.notDeepEqual(a.get(id),b.get(id));
});
test('nerve limitations are available in both languages and XI is not described as a root row',()=>{
 const page=read('app/page.tsx').toString(),catalog=JSON.parse(read('app/english-catalog.json'));
 for(const key of ['cn5','cn7','cn8','cn9','cn10','cn11','cn12']){
  const note=page.match(new RegExp(key+':\\{name:[^\\n]+?note:"([^"]+)"'))?.[1];
  assert.ok(note,key);assert.ok(catalog[note]?.length>30,key+' English');
  assert.match(note,/描き分け|省略|再現していません|未再現/);
 }
 assert.doesNotMatch(page,/迷走神経より尾側の根列として並ぶ/);
 assert.equal(catalog['舌咽・迷走・副神経'],'Glossopharyngeal, vagus and accessory nerves');
});
