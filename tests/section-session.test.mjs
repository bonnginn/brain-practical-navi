import test from 'node:test';
import assert from 'node:assert/strict';
import {readSectionSession} from '../src/sectionSession.mjs';
const sample={version:1,positions:{coronal:41,horizontal:62,sagittal:50},visible:['caudate'],selected:'caudate',layout:'both',views:1,share:65};
const allowed=['caudate','ventricle'];
test('observation state restores each plane, selection and split preferences',()=>{
  assert.deepEqual(readSectionSession(JSON.stringify(sample),allowed),sample);
  assert.equal(readSectionSession(null,allowed),null);
  assert.equal(readSectionSession('{',allowed),null);
});
test('untrusted stale state cannot select excluded anatomy or invalid layout values',()=>{
  for(const patch of [{version:2},{visible:['opticChiasm']},{selected:'opticChiasm'},{positions:{...sample.positions,coronal:-1}},{positions:{}},{share:101},{views:3},{layout:'unknown'}])assert.equal(readSectionSession(JSON.stringify({...sample,...patch}),allowed),null);
});
