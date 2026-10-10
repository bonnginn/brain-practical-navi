import test from 'node:test';
import assert from 'node:assert/strict';
import {copyReviewObservation} from '../src/reviewObservation.mjs';
const section={
  workspace:'sections',plane:'sagittal',position:61,target:'hippocampus',
  positions:{coronal:42,horizontal:55,sagittal:61},visible:['hippocampus','ventricle'],
  labels:false,layout:'both',views:2,share:45,zoom:1.6,contrast:'bigbrain',
  rotation:{x:8,y:32,z:5},search:'海馬',theme:{key:'limbic',members:['hippocampus','fornixBodyPartial']},
  circuitOrigin:'papez',
};
test('review preserves the actual observed target, slice, selections and view settings',()=>{
  assert.deepEqual(copyReviewObservation(section),section);
});
test('question observation cannot mutate the original return context',()=>{
  const live=structuredClone(section);
  const origin=copyReviewObservation(live);
  live.target='thalamus';live.plane='coronal';live.position=40;
  live.visible.splice(0,live.visible.length,'thalamus');
  live.positions.sagittal=90;live.rotation.y=100;live.theme.members.push('thalamus');
  assert.deepEqual(origin,section);
  const restored=copyReviewObservation(origin);
  restored.visible.push('caudate');restored.rotation.x=90;
  assert.deepEqual(origin,section);
});
test('return adapts only section layout to narrow or unavailable 3D display',()=>{
  const restored=copyReviewObservation(section,true);
  assert.equal(restored.layout,'slice');
  assert.deepEqual({...restored,layout:'both'},section);
  assert.equal(section.layout,'both');
});
test('section slice zoom and pan remain independent while narrow return changes only layout',()=>{
  const live={...section,sliceZoom:1.8,pan:{x:31,y:-19}};
  const origin=copyReviewObservation(live);
  assert.deepEqual(origin,live);
  assert.notEqual(origin.pan,live.pan);
  const restored=copyReviewObservation(origin,true);
  assert.equal(restored.layout,'slice');
  assert.deepEqual({...restored,layout:'both'},origin);
  assert.notEqual(restored.pan,origin.pan);
  live.sliceZoom=.9;live.pan.x=300;
  restored.sliceZoom=2.2;restored.pan.y=100;
  assert.equal(origin.sliceZoom,1.8);
  assert.deepEqual(origin.pan,{x:31,y:-19});
  assert.equal(origin.layout,'both');
});
test('surface return preserves selected regions, landmarks, rotations and free-view context',()=>{
  const surface={workspace:'surface',view:'free',rotation:{x:12,y:-45},regions:['cingulate'],
    landmarks:['central-sulcus'],deepLandmarks:['fornix'],basalLandmarks:['mammillary'],
    flags:{ghost:true,cerebellum:false,vessels:false,nerves:false,pons:true},
    free:{hemisphere:'left',selected:['region:cingulate'],focused:'region:cingulate',pathway:'papez',node:'cingulate',basalIndex:0,papezIndex:3},
    studyOpen:true};
  const origin=copyReviewObservation(surface,true);
  assert.deepEqual(origin,surface);
  surface.regions.push('precentral');surface.free.selected.length=0;surface.flags.ghost=false;
  assert.deepEqual(origin.regions,['cingulate']);
  assert.deepEqual(origin.free.selected,['region:cingulate']);
  assert.equal(origin.flags.ghost,true);
  assert.equal('layout' in origin,false);
});
