import test from 'node:test';
import assert from 'node:assert/strict';
import {readSectionLink,sectionLinkHash,observationUrl} from '../src/sectionLink.mjs';
const allowed=['caudate','ventricle'];
const state={version:1,positions:{coronal:53,horizontal:45,sagittal:50},visible:['caudate'],selected:'caudate',layout:'both',views:1,share:45};
test('shared URLs retain Pages base and language/device but discard unrelated parameters',()=>{
  assert.equal(observationUrl('https://example.org/atlas/?lang=en&ui=phone&email=private&quizVisibilityAudit=1#old','#workspace/sections/coronal'),'https://example.org/atlas/?lang=en&ui=phone#workspace/sections/coronal');
});
test('observation URLs reproduce only explicit slice and display state',()=>{
  for(const plane of ['coronal','horizontal','sagittal']){
    const hash=sectionLinkHash(plane,state,allowed,'revision');
    const result=readSectionLink(hash,allowed,'revision');
    assert.equal(result.status,'valid');assert.equal(result.plane,plane);
    assert.equal(result.state.positions[plane],state.positions[plane]);
    for(const key of ['visible','selected','layout','views','share'])assert.deepEqual(result.state[key],state[key]);
  }
});
test('malformed, ambiguous, stale, or excluded-structure links are not applied',()=>{
  const hash=sectionLinkHash('coronal',state,allowed,'revision');
  assert.equal(readSectionLink('#workspace/sections/coronal',allowed,'revision').status,'absent');
  assert.equal(readSectionLink(hash,allowed,'changed').status,'revision-mismatch');
  for(const bad of [hash+'&position=40',hash.replace('position=53','position='),hash.replace('position=53','position=101'),hash.replace('share=45','share=24'),hash.replace('visible=caudate','visible=opticChiasm'),hash+'&unknown=1',hash.replace('views=1','views=3')])assert.equal(readSectionLink(bad,allowed,'revision').status,'invalid');
  assert.equal(sectionLinkHash('unknown',state,allowed,'revision'),null);
});
