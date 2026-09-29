import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import * as geometry from '../app/segmentationGeometry.ts';

const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const nativeRequire=createRequire(import.meta.url);
const source=read('app/SectionSliceStepper.tsx');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};
vm.runInNewContext(compiled,{exports,require:name=>name==='./segmentationGeometry'?geometry:nativeRequire(name)});
const {SectionSliceStepper,BIGBRAIN_SECTION_DIMS:dims}=exports;
const {planeAxisSize,planeSliceIndex,planePositionForSlice,stepPlanePosition,stepSectionSliderPosition,sectionSliderValue,sectionPositionFromSlider,sectionSliderDirections,formatSectionPosition}=geometry;

test('3D cut plane uses the displayed BigBrain slice at the stored position',()=>{
  const origins={coronal:-116,horizontal:-90,sagittal:-98};
  for(const plane of ['coronal','horizontal','sagittal']){
    const last=planeAxisSize(dims,plane)-1;
    for(const index of [0,Math.floor(last/2),last]){
      const position=planePositionForSlice(index,plane,dims);
      assert.equal(geometry.bigBrainSectionWorldCoordinate(position,plane),origins[plane]+index*.5);
    }
  }
  assert.ok(geometry.bigBrainSectionWorldCoordinate(0,'coronal')<geometry.bigBrainSectionWorldCoordinate(100,'coronal')); // posterior to anterior
  assert.ok(geometry.bigBrainSectionWorldCoordinate(0,'horizontal')>geometry.bigBrainSectionWorldCoordinate(100,'horizontal')); // superior to inferior
  assert.ok(geometry.bigBrainSectionWorldCoordinate(0,'sagittal')<geometry.bigBrainSectionWorldCoordinate(100,'sagittal')); // left to right
});

test('stepper geometry is pinned to the actual BigBrain header, not MRI or an assumed cube',()=>{
  const raw=gunzipSync(fs.readFileSync(new URL('public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',root)));
  assert.equal(raw.subarray(0,4).toString(),'BBS1');
  assert.deepEqual([...dims],[raw.readUInt16LE(4),raw.readUInt16LE(6),raw.readUInt16LE(8)]);
});

for(const plane of ['coronal','horizontal','sagittal'])test(`single-slice movement visits every ${plane} voxel without skipping and clamps both ends`,()=>{
  const last=planeAxisSize(dims,plane)-1,sign=plane==='horizontal'?-1:1;
  for(let index=0;index<=last;index++){
    const position=planePositionForSlice(index,plane,dims);
    assert.equal(planeSliceIndex(position,plane,dims),index);
    for(const direction of [-1,1]){
      const next=stepPlanePosition(position,plane,dims,direction);
      assert.equal(planeSliceIndex(next,plane,dims),Math.max(0,Math.min(last,index+direction*sign)));
      assert.ok(next>=0&&next<=100);
    }
  }
});

test('partial aqueduct central slices are reachable from the old 50 percent position',()=>{
  let position=50;
  assert.equal(planeSliceIndex(position,'sagittal',dims),197);
  position=stepPlanePosition(position,'sagittal',dims,-1);
  assert.equal(planeSliceIndex(position,'sagittal',dims),196);
  position=stepPlanePosition(position,'sagittal',dims,-1);
  assert.equal(planeSliceIndex(position,'sagittal',dims),195);
  assert.equal(formatSectionPosition(position),'49.62');
  assert.equal(position,195/393*100); // The display rounding must not replace sampling precision.
  assert.equal(formatSectionPosition(50),'50');
  assert.equal(formatSectionPosition(100),'100');
});

test('teaching sliders run anterior to posterior and inferior to superior without moving saved slices',()=>{
  assert.deepEqual([sectionSliderDirections.coronal.start.compass,sectionSliderDirections.coronal.end.compass],['A','P']);
  assert.deepEqual([sectionSliderDirections.horizontal.start.compass,sectionSliderDirections.horizontal.end.compass],['I','S']);
  assert.deepEqual([sectionSliderDirections.sagittal.start.compass,sectionSliderDirections.sagittal.end.compass],['L','R']);
  for(const plane of ['coronal','horizontal','sagittal']){
    for(const position of [0,20,50,80,100]){
      assert.equal(sectionPositionFromSlider(sectionSliderValue(position,plane),plane),position);
      const next=stepSectionSliderPosition(position,plane,dims,1);
      assert.ok(sectionSliderValue(next,plane)>=sectionSliderValue(position,plane));
    }
    const left=sectionPositionFromSlider(0,plane),right=sectionPositionFromSlider(100,plane);
    assert.equal(sectionSliderValue(left,plane),0);
    assert.equal(sectionSliderValue(right,plane),100);
    assert.equal(stepSectionSliderPosition(left,plane,dims,-1),left);
    assert.equal(stepSectionSliderPosition(right,plane,dims,1),right);
  }
  assert.ok(geometry.bigBrainSectionWorldCoordinate(sectionPositionFromSlider(0,'coronal'),'coronal')>geometry.bigBrainSectionWorldCoordinate(sectionPositionFromSlider(100,'coronal'),'coronal'));
  assert.ok(geometry.bigBrainSectionWorldCoordinate(sectionPositionFromSlider(0,'horizontal'),'horizontal')<geometry.bigBrainSectionWorldCoordinate(sectionPositionFromSlider(100,'horizontal'),'horizontal'));
});

test('both languages expose directions and correct disabled bounds, with real click callbacks',()=>{
  for(const english of [false,true])for(const plane of ['coronal','horizontal','sagittal']){
    const directions=[];
    const tree=SectionSliceStepper({position:50,plane,english,onStep:d=>directions.push(d)});
    tree.props.children[0].props.onClick();tree.props.children[2].props.onClick();
    assert.deepEqual(directions,[-1,1]);
    const html=renderToStaticMarkup(tree);
    assert.match(html,/data-section-slice-index=/);
    assert.match(html,/0.5 mm/);
    if(english)assert.doesNotMatch(html,/[ぁ-んァ-ヶ一-龠]/);
    for(const [sliderPosition,disabled] of [[0,0],[100,2]]){
      const bounded=SectionSliceStepper({position:sectionPositionFromSlider(sliderPosition,plane),plane,english,onStep:()=>{}});
      assert.equal(bounded.props.children[disabled].props.disabled,true);
      assert.equal(bounded.props.children[2-disabled].props.disabled,false);
    }
  }
});

test('section UI retains precise canvas/session values, stops playback for manual steps and offers touch-size controls',()=>{
  const page=read('app/page.tsx'),css=read('app/canvas.css');
  assert.match(page,/function stepSection\(direction:-1\|1\)\{setPlaying\(false\);setPosition\(value=>stepSectionSliderPosition/);
  assert.match(page,/contrast==="bigbrain"&&<SectionSliceStepper position=\{position\}/);
  assert.match(page,/step=\{contrast==="bigbrain"\?"any":1\}/);
  // Keyboard direction and browser-default suppression are checked in the
  // browser; pinning the exact conditional here blocked adding Up/Down support.
  assert.match(page,/<AtlasVolumeCanvas kind="slice" plane=\{plane\} position=\{position\}/);
  assert.match(page,/<output>\{positionLabel\}<\/output>/);
  assert.match(page,/positions:\{\.\.\.sectionPositions.current,\[plane\]:position\}/);
  assert.match(css,/\.sectionSliceStepper button \{[^}]*min-height:44px/);
});
